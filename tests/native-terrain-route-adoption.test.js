import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MessageChannel} from 'node:worker_threads';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {nativeAnimalCropPublicationMatches} from '../src/simulation/raids.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {reconcileNativeWorldResources} from '../src/world/native-world-boundary.js';
import {originalRig} from './helpers/native-animal-crop-rig.js';
import {nativeProductionAuthority} from './helpers/native-production-authority.js';

const input=new URL('./fixtures/desierto712-d5-enclosed-rhino-live-crops-before-raid.json.gz',import.meta.url);
const raw=gunzipSync(readFileSync(input)).toString(),saved=savedNativeAuthorityOptions(raw);
const key='0,-2',cell={cx:0,cz:-2};

for(const timing of ['during READY','after the first draw']){
 test(`ordered terrain waits for the acquired Rhino route publication ${timing}`,async()=>{
  const initial=deserialize(raw),session='rhino-route-terrain',epoch='terrain';
  assert(!saved.chunkKeys.includes(key));
  const {port1,port2}=new MessageChannel(),errors=[];
  const producer=createTerrainPublication({port:port1,session,epoch,retainRevisions:true});
  let f,rig,route,ready=false,projected=false,packet,prepared=0,latest=initial;
  let releaseReady;
  const readyHold=new Promise(resolve=>{releaseReady=resolve;});
  const receiver=createConfirmedTerrainReceiver({port:port2,session,confirmedElapsed:initial.elapsed,
   retainRevisions:true,autoBootstrap:true,residency:{replace(){},remove(){}},validateRevision(){},
   onError:error=>errors.push(error),prepareGraphicalBatch:()=>({valid:()=>true,commit:()=>true,abort(){}}),
   async prepareGraphicalProposal(messages,{signal,proposedWorldBoundary,retainsNativeAssignments}){
    assert(projected,'Native terrain commands require projected route assignments before recording moving actors');
    assert.equal(retainsNativeAssignments,true);
    assert.deepEqual(messages.map(({payload})=>({cx:payload.cx,cz:payload.cz})),[cell]);
    prepared++;
    f.client.beginFrame({nativeWorldBoundary:proposedWorldBoundary});
    const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
     view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'
    }]});
    pass.setPipeline(f.pipeline);pass.setBindGroup(0,route.record.cropGroup);pass.draw(3);pass.end();
    f.client.device.queue.submit([encoder.finish()]);
    const at=proposedWorldBoundary.effectiveTime;
    packet=await f.client.prepareNativeWorldFrame({nativeWorldBoundary:proposedWorldBoundary,
     clock:{...f.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}},{signal});
    return {canonicalPropsUnmasked:true,preparedWorldBoundary:packet.preparedWorldBoundary,
     valid:packet.valid,commit:()=>packet.commit(proposedWorldBoundary),abort:packet.abort};
   }
  });
  async function until(predicate){
   for(let i=0;i<1000&&!predicate();i++){
    assert.deepEqual([...errors,...f.faults,...f.errors],[]);
    await f.present();
   }
   assert(predicate(),'The route and terrain must reach their expected boundary');
  }
  async function publish(result){
   if(result.snapshot)latest=JSON.parse(result.snapshot);
   producer.commit(result.sequence);
   await until(()=>receiver.ready(result.sequence));
   receiver.confirm(result.sequence,result.elapsed);
   rig?.update(structuredClone(latest));
  }
  async function settle(promise){
   let result,failure,done=false;
   Promise.resolve(promise).then(value=>{result=value;done=true;},error=>{failure=error;done=true;});
   await until(()=>done);
   assert.ifError(failure);
   return result;
  }
  try{
   f=await nativeProductionAuthority(initial,{...saved,attach:false,emptyBeastPhysics:true,
    getTerrainManifest:producer.manifest,onTerrainChunk:producer.stage,
    prepareNativeTerrainResources:producer.prepareNativeWorldResources,
    async onPrepare(record){
     rig??=await originalRig(structuredClone(latest),producer.manifest());
     rig.update(structuredClone(latest));await rig.prepare(record.resources);
    },
    async onReady(){ready=true;if(timing==='during READY')await readyHold;},
    onCommit(record,receipt){
     const binding=receipt.nativeAnimalCropRouteBinding;
     rig.commit(binding,receipt);route={record,binding};
    }
   });
   await publish({sequence:0,elapsed:initial.elapsed});
   await f.attach();await publish({sequence:1,elapsed:initial.elapsed});
   for(let i=0;i<200&&!latest.raid;i++)
    await publish(await f.command({kind:'advance',seconds:.05,steps:4,nightFastForward:true}));
   assert.equal(latest.raid?.animals[0].species,'rhino');
   await until(()=>ready);
   const command={kind:'addChunk',key,...(timing==='after the first draw'?{visualTerrain:true,visualRecoveryOnly:true}:{})};
   const drawnRoute=()=>f.host.inspect().nativeRouteFrame?.bindings.find(row=>row.nativeAnimalCrop?.kind===26);
   if(timing==='after the first draw')await until(drawnRoute);
   const pending=f.command(command);
   if(timing==='during READY'){
    let settled=false;
    Promise.resolve(pending).then(()=>{settled=true;},()=>{settled=true;});
    await f.present();
    assert.equal(settled,false);
    assert.equal(prepared,0);
   }
   releaseReady();
   const first=await settle(pending);
   await until(()=>route&&drawnRoute());
   const oldDraw=f.host.inspect().nativeRouteFrame,{binding}=route;
   assert.equal(drawnRoute().relativeTime,0);
   assert.equal(first.deferredTerrainChunk,key);
   assert.equal(first.value,false);
   assert.equal(first.nativeWorldResources,undefined);
   assert.equal(prepared,0);
   assert(!producer.manifest().chunks.some(({cx,cz})=>cx===cell.cx&&cz===cell.cz));
   if(first.terrainCheckpoint){
    assert.deepEqual(first.terrainCheckpoint.nativeWorldBoundary,oldDraw.worldBoundary);
    assert(!first.terrainCheckpoint.chunks.some(({cx,cz})=>cx===cell.cx&&cz===cell.cz));
   }
   assert(nativeAnimalCropPublicationMatches(JSON.parse(first.snapshot),binding));
   await publish(first);
   projected=true;
   const second=await settle(f.command(command));
   assert.equal(second.deferredTerrainChunk,undefined);
   assert.equal(second.value,true);
   assert.equal(second.elapsed,first.elapsed);
   assert.deepEqual(JSON.parse(second.snapshot).raid,JSON.parse(first.snapshot).raid);
   const [residency]=second.nativeWorldResources;
   assert.equal(residency.kind,6);
   assert.deepEqual(residency.chunks,[cell]);
   assert.equal(prepared,1);
   await publish(second);await settle(packet.presented);
   const nextDraw=f.host.inspect().nativeRouteFrame;
   assert.deepEqual(reconcileNativeWorldResources({publication:second,admitted:receiver.admittedBoundary(second.sequence),
    previous:oldDraw.worldBoundary}),nextDraw.worldBoundary);
   assert.deepEqual(drawnRoute().nativeAnimalCrop,binding.preparedReference);
   assert.equal(drawnRoute().relativeTime,0);
   const advance=await f.command({kind:'advance',seconds:.05,nightFastForward:false});
   assert.notEqual(JSON.parse(advance.snapshot).raid.animals[0].x,latest.raid.animals[0].x);
   assert.deepEqual([...errors,...f.faults,...f.errors],[]);
  }finally{
   releaseReady();await f?.close();rig?.close();producer.dispose();receiver.dispose();
  }
 });
}
