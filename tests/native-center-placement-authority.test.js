import {readFileSync} from 'node:fs';
import {MessageChannel} from 'node:worker_threads';
import test from 'node:test';
import assert from 'node:assert/strict';
import {deserialize} from '../src/persistence/snapshots.js';
import {prepareFreshWorkerBootstrapFromOptions} from '../src/simulation/fresh-worker-bootstrap.js';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {reconcileNativeWorldResources} from '../src/world/native-world-boundary.js';
import {nativeProductionAuthority} from './helpers/native-production-authority.js';
import {preparedWorldDraw} from './helpers/remote-webgpu-fixture.js';

const wasm=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const catalog=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'));
const until=async(predicate)=>{
 for(let i=0;i<250;i++){
  if(predicate())return;
  await new Promise(resolve=>setImmediate(resolve));
 }
 throw Error('Native work-center test did not reach its boundary');
};

test('the paid center takes one world ticket at the live FIFO head',async()=>{
 const {initial}=await prepareFreshWorkerBootstrapFromOptions(wasm,{seed:714,biome:'sabana',culture:'mapungubwe',slotId:'native-center-fifo'},
  catalog.find(row=>row.id==='mapungubwe'));
 const state=deserialize(initial.snapshot),point=state.villages[0].center;
 const command={kind:'placeStructure',id:'first-center',structure:{kind:'center',x:point.x,z:point.z,yaw:0}};
 const {port1,port2}=new MessageChannel(),session='test-center',epoch='test-center-terrain',errors=[];
 const producer=createTerrainPublication({port:port1,session,epoch,retainRevisions:true});
 let f,retained,settleReady,captured,packet,adopted;
 const ready=new Promise(resolve=>{settleReady=resolve;});
 const receiver=createConfirmedTerrainReceiver({
  port:port2,session,confirmedElapsed:state.elapsed,retainRevisions:true,autoBootstrap:true,
  residency:{replace(){},remove(){}},onError:error=>errors.push(error),validateRevision(){},
  prepareGraphicalBatch:async()=>({valid:()=>true,commit:()=>true,abort(){}}),
  async prepareGraphicalProposal(messages,{signal,proposedWorldBoundary,nativeCenterPlacement}){
   captured={messages,boundary:proposedWorldBoundary,center:nativeCenterPlacement};
   const time=proposedWorldBoundary.effectiveTime;
   packet=await preparedWorldDraw({...f,clock:{...f.clock,elapsed:time,safeUntil:time,paused:true,segments:[]}},proposedWorldBoundary,123,signal);
   packet.presented.catch(()=>{});
   retained=true;
   await ready;
   return {canonicalPropsUnmasked:true,preparedWorldBoundary:packet.preparedWorldBoundary,valid:packet.valid,
    commit(proof){adopted=proof;return packet.commit(proof.worldBoundary);},abort:packet.abort};
  }
 });
 const stage=(chunk,at)=>producer.stage(chunk,at);
 try{
  f=await nativeProductionAuthority(state,{attach:false,chunkKeys:initial.chunkKeys,nativeWorkerLifecycle:true,
   onTerrainChunk:stage,prepareNativeTerrainResources:producer.prepareNativeWorldResources});
  producer.commit(0);
  await f.attach();
  async function publish(result){
   producer.commit(result.sequence);
   await until(()=>receiver.ready(result.sequence));
   receiver.confirm(result.sequence,result.elapsed);
  }
  producer.commit(1);
  await until(()=>receiver.ready(1));
  receiver.confirm(1,state.elapsed);
  await publish(f.command({kind:'setNavigationView',view:initial.navigationView}));
  const start=f.command({kind:'tutorialStart',seen:[]});
  await publish(start);
  await publish(f.command({kind:'tutorialCommand',action:'dismiss',automatic:false,messageId:start.value.presentation.id,variant:start.value.presentation.variant??null}));
  await f.authority.prepareNativeStructureCommand(command);
  await f.authority.finishNativeStructureCommand(command);
  assert.equal(captured,undefined);
  await f.authority.prepareNativeStructureCommand(command);
  for(let i=0;i<5;i++){await publish(f.command({kind:'advance',seconds:.05,nightFastForward:false}));await f.present();}
  const before=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  producer.commit(before.sequence);
  await until(()=>receiver.ready(before.sequence));
  const prior=JSON.parse(before.snapshot);
  assert.equal(prior.structures.length,0);
  assert.equal(captured,undefined);
  let placed;
  const pending=f.structureCommand(command).then(result=>{placed=result;return result;});
  pending.catch(()=>{});
  for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(captured,undefined,'The proposal must wait for the credit of the preceding terrain boundary');
  receiver.confirm(before.sequence,before.elapsed);
  await until(()=>retained||placed);
  assert.equal(!!placed,false,placed?.rejection??String(errors[0]??''));
  assert.equal(captured.boundary.effectiveTime,before.elapsed);
  assert(before.elapsed>0);
  assert.equal(captured.center.commandId,command.id);
  assert.equal(captured.center.polygonId,undefined);
  assert.equal(adopted,undefined);
  assert.equal(f.host.inspect().requiredNativeWorldBoundary??null,null);
  settleReady();
  const result=await pending;
  await f.authority.finishNativeStructureCommand(command);
  assert.equal(result.value,true,result.rejection);
  assert.equal(result.events.filter(event=>event.type==='PlacementCommitted').length,1);
  const after=JSON.parse(result.snapshot),world=result.nativeWorldResources[0];
  assert.equal(after.structures.length,1);
  assert.equal(prior.ledger.balance.n/prior.ledger.balance.d-after.ledger.balance.n/after.ledger.balance.d,800);
  assert.deepEqual(world.nativeCenterPlacement,{...captured.center,polygonId:world.nativeCenterPlacement.polygonId});
  assert.equal(adopted,undefined);
  await publish(result);
  await f.present();
  await packet.presented;
  assert.deepEqual(adopted,{worldBoundary:captured.boundary,nativeCenterPlacement:world.nativeCenterPlacement});
  const admitted=receiver.admittedBoundary(result.sequence);
  assert.deepEqual(reconcileNativeWorldResources({publication:result,admitted}),world.worldBoundary);
  assert.throws(()=>reconcileNativeWorldResources({publication:result,admitted:{
   ...admitted,nativeCenterPlacement:{...world.nativeCenterPlacement,polygonId:world.nativeCenterPlacement.polygonId+1}
  }}),/applied graphical batch/);
  const checkpoint=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
  await publish(checkpoint);
  const polygons=checkpoint.nativeAuthorityCheckpoint.spatialState.polygons;
  assert.equal(polygons.length,before.nativeAuthorityCheckpoint.spatialState.polygons.length+1);
  assert.equal(polygons.filter(item=>item.id===world.nativeCenterPlacement.polygonId).length,1);
  await f.authority.prepareNativeStructureCommand(command);
  const duplicate=await f.structureCommand(command);
  await f.authority.finishNativeStructureCommand(command);
  await publish(duplicate);
  assert.equal(duplicate.value,false);
  assert.deepEqual(JSON.parse(duplicate.snapshot).ledger,after.ledger);
  assert.deepEqual([...f.faults,...errors],[]);
 }finally{settleReady();await f?.close();producer.dispose();receiver.dispose();}
});
