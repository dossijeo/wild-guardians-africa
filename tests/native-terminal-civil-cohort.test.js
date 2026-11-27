import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {gunzipSync} from 'node:zlib';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {copyNativeRecoveryGroup} from '../src/world/native-worker-route-recovery.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture as drawFixture,flush} from './helpers/remote-webgpu-fixture.js';

test('terminal replacement needs both acquired Idle21 clocks in one submit',async()=>{
 const saved=gunzipSync(readFileSync(new URL('./fixtures/sabana714-d1-two-paid-workers-before-home.json.gz',import.meta.url))).toString();
 const options=savedNativeAuthorityOptions(saved),bindings=new Map();
 const f=await nativeProductionAuthority(JSON.parse(saved),{...options,onCommit(_record,commit){
  const binding=commit.nativeIdleCycleBinding;
  if(binding)bindings.set(binding.reference.actorId,binding);
 }});
 const ports=new MessageChannel();
 let replacement,attached=false,state;
 try{
  f.command({kind:'setNavigationView',view:options.navigationView});
  for(let i=0;i<250;i++){
   const step=await f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:true});
   for(const key of step.residency?.missing??[])f.command({kind:'addChunk',key});
   await f.present();
   const current=f.snapshot();
   if(bindings.size===2&&current.workers.every(worker=>worker.nativeRouteAdmission==='native-idle')){state=current;break;}
  }
  assert(state,'The two workers never acquired their ordinary schedules together');
  const holding=f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  f.retireResourceEndpoint();
  const hold=await holding;
  f.gpu.device.destroy();
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
  const retired=await f.authority.flushNativeResourcePreparation({forLostDraw:true,allowRetired:true});
  assert(retired.terminal&&retired.callbacksSettled);
  const route=await f.authority.terminalWorkerRoute();
  assert.deepEqual(route?.members,[{kind:21,actorId:6},{kind:21,actorId:8}]);
  replacement=await drawFixture({capabilities:{nativeIdleCycleVersion:1,nativeIdleCycleIdlePhaseVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:source}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  const proofs={version:2,members:source.members.map(({execution})=>({kind:21,proof:execution.binding})),idleCyclePhases:source.idleCyclePhases};
  const cut=source.worldBoundary,at=state.elapsed;
  assert.equal(copyNativeRecoveryGroup(proofs,cut).ordinaryWorkers,true);
  assert.throws(()=>copyNativeRecoveryGroup({...proofs,members:[proofs.members[0],proofs.members[0]]},cut),/two current assignments/);
  assert.throws(()=>copyNativeRecoveryGroup(proofs,{...cut,ticket:cut.ticket+1}),/one world cut/);
  assert.deepEqual(source.members.map(({execution})=>execution.bodyId),[1,2]);

  const {host,client,pipeline}=replacement;
  const groups=source.members.map(({execution,resources})=>{
   assert.equal(execution.executedThrough,at);
   assert.deepEqual(execution.binding,bindings.get(execution.actorId));
   assert.deepEqual(resources.nativeIdleCycleBinding,execution.binding);
   const ref=execution.binding.reference,epoch=ref.worldBoundary.effectiveTime;
   const buffer=client.device.createBuffer({size:16,usage:72});
   client.device.queue.writeBuffer(buffer,0,new Float32Array(4));
   client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch,nativeIdleCycle:ref});
   client.registerClockBinding(buffer,{byteOffset:4,semantic:'idle-offset',epoch,period:3.8,nativeIdleCycle:ref});
   return client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
  });
  function frame(clockGroups){
   client.beginFrame({nativeWorldBoundary:cut,clock:{...f.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}});
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);
   for(const group of clockGroups){pass.setBindGroup(0,group);pass.draw(3);}
   pass.end();client.device.queue.submit([encoder.finish()]);
   return client.endFrame();
  }
  for(const group of groups)await assert.rejects(frame([group]),/Replacement requires its bound worker clock/);
  const submitted=frame(groups);submitted.catch(()=>{});await flush();await host.idle();
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted worker route/);
  host.present();await submitted;
  const result=await f.authority.checkHeldDraw(30,hold,route),pick=captureNativeRoutePickFrame(host.inspect());
  const ages=source.members.map(({execution},i)=>{
   const ref=execution.binding.reference,age=floorFloat32(at-ref.worldBoundary.effectiveTime);
   assert.equal(result.members[i].relativeTime,age);
   assert.deepEqual(result.members[i].nativeIdleCycle,ref);
   assert.equal(pick.getIdleCycleElapsed(ref),age);
   return age;
  });
  assert.notEqual(...ages);
  await f.attachRecoveredResources(replacement);attached=true;
  assert(f.authority.resumeNativeIntentProduction(hold));
  const after=await f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
  assert.equal(after.stepsExecuted,2);
  const later=JSON.parse(after.snapshot);
  for(const worker of later.workers){
   const before=state.workers.find(peer=>peer.id===worker.id);
   assert.equal(worker.nativeRouteAdmission,'native-idle');
   assert.equal(worker.x,before.x);assert.equal(worker.z,before.z);
   assert(worker.idleState.elapsed>before.idleState.elapsed);
  }
  assert.deepEqual(later.ledger,state.ledger);
  assert.deepEqual(f.faults,[]);
 }finally{
  try{await f.close();}finally{
   if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}
   ports.port1.close();ports.port2.close();
  }
 }
});
