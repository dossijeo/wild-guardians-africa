import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {gunzipSync} from 'node:zlib';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {copyNativeRecoveryGroup} from '../src/world/native-worker-route-recovery.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture as drawFixture,flush} from './helpers/remote-webgpu-fixture.js';

test('terminal Draw recovery requires both living civilian assignments at the same cut',async()=>{
 const save=gunzipSync(readFileSync(new URL('./fixtures/sabana714-d1-two-paid-workers-before-home.json.gz',import.meta.url))).toString();
 const options=savedNativeAuthorityOptions(save),manifest={epoch:'ordinary-worker-pair',chunks:options.chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const f=await nativeProductionAuthority(JSON.parse(save),{...options,getTerrainManifest:()=>manifest});
 const ports=new MessageChannel();
 let replacement,attached=false,state;
 try{
  f.command({kind:'setNavigationView',view:options.navigationView});
  for(let i=0;i<250;i++){
   const result=await f.command({kind:'advance',seconds:.05,steps:4,nightFastForward:true});
   for(const key of result.residency?.missing??[])f.command({kind:'addChunk',key});
   await f.present();
   const view=JSON.parse(result.snapshot);
   if(view.workers.some(worker=>worker.nativeRouteAdmission==='native-home')&&
      view.workers.some(worker=>worker.nativeRouteAdmission==='native-idle-stroll')){state=view;break;}
  }
  assert(state);
  const hold=await f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  f.retireResourceEndpoint();f.gpu.device.destroy();
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
  const retired=await f.authority.flushNativeResourcePreparation({forLostDraw:true,allowRetired:true});
  assert(retired.terminal&&retired.callbacksSettled);
  const route=await f.authority.terminalWorkerRoute();
  assert.deepEqual(route,{version:2,members:[{kind:18,actorId:8},{kind:22,actorId:6}]});
  replacement=await drawFixture({capabilities:{nativeHomeRouteVersion:1,nativeIdleStrollVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:source}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  assert.deepEqual(source.terrainManifest,manifest);
  const proofs={version:2,members:source.members.map(({resources,execution})=>({kind:resources.kind,proof:execution.binding}))};
  assert.equal(copyNativeRecoveryGroup(proofs,source.worldBoundary).ordinaryWorkers,true);
  assert.throws(()=>copyNativeRecoveryGroup(proofs,{...source.worldBoundary,ticket:source.worldBoundary.ticket+1}),/one world cut/);
  const at=state.elapsed,metadata={nativeWorldBoundary:source.worldBoundary,clock:{...f.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}};
  const {client,host,pipeline}=replacement;
  const groups=source.members.map(({resources,execution})=>{
   const worker=state.workers.find(worker=>worker.id==='worker-'+execution.actorId),pose=execution.pose??execution;
   assert.equal(execution.executedThrough,at);
   for(const key of ['x','z','walkPhase','runPhase','carryPhase','runRemaining'])assert.equal(worker[key],pose[key]);
   assert.equal(worker.heading,pose.yaw);
   const home=resources.kind===18,ref=execution.binding.reference,epoch=ref.worldBoundary.effectiveTime;
   const buffer=client.device.createBuffer({size:16,usage:72});client.device.queue.writeBuffer(buffer,0,new Float32Array(4));
   client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch,
    resourceEnd:nativeClockResourceEnd(epoch,ref.endTime),[home?'nativeHome':'nativeStroll']:ref});
   return client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
  });
  function frame(bindings){
   client.beginFrame(metadata);
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);for(const group of bindings){pass.setBindGroup(0,group);pass.draw(3);}pass.end();
   client.device.queue.submit([encoder.finish()]);return client.endFrame();
  }
  await assert.rejects(frame(groups.slice(0,1)),/Replacement requires its bound worker clock/);
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  const drawing=frame(groups);drawing.catch(()=>{});await flush();await host.idle();
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  host.present();await drawing;
  const proof=await f.authority.checkHeldDraw(30,hold,route);
  assert.equal(proof.elapsed,at);
  for(const [i,{execution}] of source.members.entries()){
   const ref=execution.binding.reference;
   assert.equal(proof.members[i].relativeTime,floorFloat32(at-ref.worldBoundary.effectiveTime));
   assert.deepEqual(proof.members[i][i===0?'nativeHome':'nativeStroll'],ref);
  }
  await f.attachRecoveredResources(replacement);attached=true;
  assert.equal(f.authority.resumeNativeIntentProduction(hold),true);
  const result=await f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
  assert.equal(result.stepsExecuted,2);
  const later=JSON.parse(result.snapshot);
  assert.deepEqual(later.ledger,state.ledger);
  assert(later.workers.every(worker=>{
   const source=state.workers.find(peer=>peer.id===worker.id);
   return worker.x!==source.x||worker.z!==source.z;
  }));
  assert.deepEqual(f.faults,[]);
 }finally{
  try{await f.close();}finally{if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}ports.port1.close();ports.port2.close();}
 }
});
