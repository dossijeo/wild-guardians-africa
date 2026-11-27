import assert from 'node:assert/strict';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeIdleCyclePhaseOffset} from '../src/rendering/native-farm-idle-phase.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {copyNativeRecoveryGroup} from '../src/world/native-worker-route-recovery.js';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture as drawFixture,flush} from './helpers/remote-webgpu-fixture.js';

for(const loss of ['first cycle','pending successor','acquired successor'])test(`terminal Draw recovers the only worker in Idle21 (${loss})`,async()=>{
 const {state}=nativeIdleStrollGameSave();
 const waiting=loss==='pending successor',inherited=loss==='acquired successor';
 let cycle,pending,release;
 const retained=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(state,{nativeWorkerLifecycle:true,onCommit(record,data){
  if(record.kind==='idle-cycle')cycle=data.nativeIdleCycleBinding;
 },onPrepare(record){
  if(waiting&&!pending&&cycle&&record.kind==='idle-cycle'&&record.resources.nativeIdleCycle.sourceCycleSequence){pending=record;return retained;}
 }});
 const ports=new MessageChannel();
 let replacement,attached=false,atLoss;
 try{
  for(let i=0;i<500;i++){
   const step=await f.command({kind:'advance',seconds:.05,steps:4,nightFastForward:false});
   for(const key of step.residency?.missing??[])f.command({kind:'addChunk',key});
   await f.present();
   const fresh=JSON.parse(step.snapshot);
   if(cycle&&fresh.workers[0].nativeRouteAdmission==='native-idle'&&(!waiting||pending)&&
      (!inherited||cycle.reference.sourceCycleSequence>0)){atLoss=fresh;break;}
  }
  assert(atLoss,'The worker never reached the selected Idle21');
  const holding=f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  f.retireResourceEndpoint();release();
  const hold=await holding;
  f.gpu.device.destroy();
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
  const retired=await f.authority.flushNativeResourcePreparation({forLostDraw:true,allowRetired:true});
  assert(retired.terminal&&retired.callbacksSettled);
  const route=await f.authority.terminalWorkerRoute();
  assert(route,'One acquired Idle21 is missing from terminal recovery');
  assert.deepEqual(route.members,[{kind:21,actorId:cycle.reference.actorId}]);
  assert.equal(Boolean(route.idleCyclePhases),inherited);
  replacement=await drawFixture({capabilities:{nativeIdleCycleVersion:1,nativeIdleCycleIdlePhaseVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:source}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  assert.equal(source.members.length,1);
  const [{execution,resources}]=source.members,at=execution.executedThrough,ref=execution.binding.reference;
  assert.deepEqual(execution.binding,cycle);
  assert.deepEqual(resources.nativeIdleCycleBinding,cycle);
  assert.equal(execution.finished,waiting);
  assert.equal(at,atLoss.elapsed);
  const proof={version:2,members:[{kind:21,proof:execution.binding}],idleCyclePhases:source.idleCyclePhases};
  assert.equal(copyNativeRecoveryGroup(proof,source.worldBoundary).ordinaryWorkers,true);
  assert.throws(()=>copyNativeRecoveryGroup(proof,{...source.worldBoundary,ticket:source.worldBoundary.ticket+1}),/acquired world cut/);

  const {client,host,pipeline}=replacement,epoch=ref.worldBoundary.effectiveTime,period=3.799999952316284;
  const buffer=client.device.createBuffer({size:16,usage:72});
  client.device.queue.writeBuffer(buffer,0,new Float32Array(4));
  client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch,nativeIdleCycle:ref});
  client.registerClockBinding(buffer,{byteOffset:4,semantic:'idle-offset',epoch,period,nativeIdleCycle:ref});
  const group=client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
  function frame(includeCycle){
   client.beginFrame({nativeWorldBoundary:source.worldBoundary,clock:{...f.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}});
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);
   if(includeCycle)pass.setBindGroup(0,group);
   pass.draw(3);pass.end();client.device.queue.submit([encoder.finish()]);
   return client.endFrame();
  }
  await assert.rejects(frame(false),/Replacement requires its bound worker clock/);
  const drawing=frame(true);drawing.catch(()=>{});await flush();await host.idle();
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  host.present();await drawing;
  const first=await f.authority.checkHeldDraw(30,hold,route),age=floorFloat32(waiting?ref.duration:at-epoch);
  assert.equal(first.elapsed,at);
  assert.equal(first.members[0].relativeTime,age);
  const pick=captureNativeRoutePickFrame(host.inspect()),phaseDelay=source.idleCyclePhases?.[0].phaseDelay??0;
  assert.equal(pick.getIdleCycleElapsed(ref),age);
  assert.equal(pick.getIdleCyclePhaseOffset(ref,period),nativeIdleCyclePhaseOffset({elapsed:at,executionEpoch:epoch,relativeTime:age,duration:ref.duration,period,phaseDelay}));
  await f.attachRecoveredResources(replacement);attached=true;
  assert.equal(f.authority.resumeNativeIntentProduction(hold),true);
  if(waiting){
   assert.equal(pending.committed,false);
   await untilProduction(f,()=>f.records.some(row=>row!==pending&&row.committed&&row.kind==='idle-cycle'&&row.resources.nativeIdleCycle.sourceCycleSequence));
  }
  const step=await f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
  const later=JSON.parse(step.snapshot),before=atLoss.workers[0],worker=later.workers[0];
  assert.equal(step.stepsExecuted,2);
  assert.equal(worker.id,before.id);
  assert.equal(worker.x,before.x);assert.equal(worker.z,before.z);
  assert.deepEqual(later.ledger,atLoss.ledger);
  assert.deepEqual(f.faults,[]);
 }finally{
  release();
  try{await f.close();}finally{
   if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}
   ports.port1.close();ports.port2.close();
  }
 }
});
