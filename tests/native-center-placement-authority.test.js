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

for(const [biome,seed] of [['sabana',714],['desierto',712]])test(`the paid center takes one world ticket at the live FIFO head (${biome})`,async()=>{
 const {initial}=await prepareFreshWorkerBootstrapFromOptions(wasm,{seed,biome,culture:'mapungubwe',slotId:'native-center-fifo'},
  catalog.find(row=>row.id==='mapungubwe'));
 const state=deserialize(initial.snapshot),point=state.villages[0].center;
 const command={kind:'placeStructure',id:'first-center',structure:{kind:'center',x:point.x,z:point.z,yaw:0}};
 const {port1,port2}=new MessageChannel(),session='test-center',epoch='test-center-terrain',errors=[];
 const producer=createTerrainPublication({port:port1,session,epoch,retainRevisions:true});
 let f,retained,settleReady,captured,packet,adopted,residencyReady,omitPreparedFrame=false;
 const ready=new Promise(resolve=>{settleReady=resolve;});
 const receiver=createConfirmedTerrainReceiver({
  port:port2,session,confirmedElapsed:state.elapsed,retainRevisions:true,autoBootstrap:true,
  residency:{replace(){},remove(){}},onError:error=>errors.push(error),validateRevision(){},
  prepareGraphicalBatch:async()=>({valid:()=>true,commit:()=>true,abort(){}}),
  async prepareGraphicalProposal(messages,{signal,proposedWorldBoundary,nativeCenterPlacement,retainsNativeAssignments}){
   captured={messages,boundary:proposedWorldBoundary,center:nativeCenterPlacement,retainsNativeAssignments};
   if(omitPreparedFrame)return {canonicalPropsUnmasked:true,valid:()=>true,commit:()=>assert.fail('Unprepared region was adopted'),abort(){}};
   const time=proposedWorldBoundary.effectiveTime;
   packet=await preparedWorldDraw({...f,clock:{...f.clock,elapsed:time,safeUntil:time,paused:true,segments:[]}},proposedWorldBoundary,123,signal);
   packet.presented.catch(()=>{});
   retained=true;
   await (nativeCenterPlacement?ready:residencyReady);
   return {canonicalPropsUnmasked:true,preparedWorldBoundary:packet.preparedWorldBoundary,valid:packet.valid,
    commit(proof){adopted=proof;return packet.commit(proof?.worldBoundary??proposedWorldBoundary);},abort:packet.abort};
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
  if(biome==='desierto'){
   const far={...command,id:'outside-initial-radius',structure:{...command.structure,x:95}};
   await f.authority.prepareNativeStructureCommand(far);
   const rejected=await f.structureCommand(far);
   await f.authority.finishNativeStructureCommand(far);
   await publish(rejected);
   assert.match(rejected.rejection,/primer centro cerca del poblado/);
   assert.equal(JSON.parse(rejected.snapshot).structures.length,0);
   assert.equal(JSON.parse(rejected.snapshot).ledger.balance.n,'1500');
   assert.equal(captured,undefined);
  }
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
  if(biome==='desierto'){
   const key='5,1';
   assert(!initial.chunkKeys.includes(key));
   let releaseResidency;
   residencyReady=new Promise(resolve=>{releaseResidency=resolve;});
   const priorBoundary=world.worldBoundary;
   const priorTerrain=f.command({kind:'snapshot',visualTerrain:true,visualRecoveryOnly:true});
   producer.commit(priorTerrain.sequence);
   await until(()=>receiver.ready(priorTerrain.sequence));
   const add={kind:'addChunk',key,visualTerrain:true,visualRecoveryOnly:true};
   let loaded,rejected;
   const pending=Promise.resolve().then(()=>f.command(add));
   pending.then(value=>{loaded=value;},error=>{rejected=error;});
   try{
    for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
    if(rejected)throw rejected;
    assert.equal(loaded,undefined);
    assert.equal(captured.center.commandId,command.id);
    receiver.confirm(priorTerrain.sequence,priorTerrain.elapsed);
    await until(()=>!captured.center||loaded||rejected);
    if(rejected)throw rejected;
    assert.equal(loaded,undefined);
    assert.equal(adopted.worldBoundary.ticket,priorBoundary.ticket);
    assert.equal(captured.retainsNativeAssignments,true);
    assert.deepEqual(captured.messages.map(({payload})=>[payload.cx,payload.cz]),[[5,1]]);
   }finally{releaseResidency();}
   const added=await pending;
   assert.equal(added.value,true);
   assert.equal(added.elapsed,priorTerrain.elapsed);
   const [residency]=added.nativeWorldResources;
   assert.equal(residency.kind,6);
   assert.deepEqual(residency.chunks,[{cx:5,cz:1}]);
   assert.deepEqual(added.terrainCheckpoint.nativeWorldBoundary,residency.worldBoundary);
   assert.equal(added.terrainCheckpoint.chunks.length,priorTerrain.terrainCheckpoint.chunks.length+1);
   await publish(added);
   await f.present();
   await packet.presented;
   assert.deepEqual(reconcileNativeWorldResources({publication:added,admitted:receiver.admittedBoundary(added.sequence),previous:priorBoundary}),residency.worldBoundary);
   const repeated=await f.command(add);
   await publish(repeated);
   assert.equal(repeated.value,false);
   assert.equal(repeated.nativeWorldResources,undefined);
   assert.deepEqual(repeated.terrainCheckpoint.nativeWorldBoundary,residency.worldBoundary);
   omitPreparedFrame=true;
   await assert.rejects(f.command({...add,key:'5,2'}),/requires a retained command packet/);
   assert.equal(producer.status().staged,0);
   const unchanged=f.authority.execute({...add,kind:'snapshot',sequence:repeated.sequence+1});
   await publish(unchanged);
   assert.equal(unchanged.terrainCheckpoint.chunks.some(chunk=>chunk.cx===5&&chunk.cz===2),false);
   assert.deepEqual(unchanged.terrainCheckpoint.nativeWorldBoundary,residency.worldBoundary);
  }
  assert.deepEqual([...f.faults,...errors],[]);
 }finally{settleReady();await f?.close();producer.dispose();receiver.dispose();}
});
