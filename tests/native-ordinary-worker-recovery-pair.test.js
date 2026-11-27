import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {gunzipSync} from 'node:zlib';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {nativeIdleCyclePhaseOffset} from '../src/rendering/native-farm-idle-phase.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {copyNativeRecoveryGroup} from '../src/world/native-worker-route-recovery.js';
import {nativeIdleCycleBodyState} from '../src/world/native-idle-cycle-body-source.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture as drawFixture,flush} from './helpers/remote-webgpu-fixture.js';

for(const loss of ['stroll','cycle','preparer first','hold first','acquired successor'])test(`terminal Draw recovery requires Home18 and ${loss==='stroll'?'Idle22':'Idle21'} at the same cut (${loss})`,async()=>{
 const stationary=loss!=='stroll',duringSuccessor=loss==='preparer first'||loss==='hold first',acquiredSuccessor=loss==='acquired successor';
 const save=gunzipSync(readFileSync(new URL('./fixtures/sabana714-d1-two-paid-workers-before-home.json.gz',import.meta.url))).toString();
 const options=savedNativeAuthorityOptions(save),manifest={epoch:'ordinary-worker-pair',chunks:options.chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 let successor,release,acquiredCycle;
 const retained=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(JSON.parse(save),{...options,getTerrainManifest:()=>manifest,onCommit(record,commit){
  const binding=commit.nativeIdleCycleBinding;
  if(acquiredSuccessor&&record.kind==='idle-cycle'&&binding.reference.actorId===6&&binding.reference.sourceCycleSequence)acquiredCycle=binding;
 },onPrepare(record){
  const ref=record.resources.nativeIdleCycle;
  if(duringSuccessor&&!successor&&record.kind==='idle-cycle'&&ref?.actorId===6&&ref.sourceCycleSequence){successor=record;return retained;}
 }});
 const ports=new MessageChannel();
 let replacement,attached=false,state;
 try{
  f.command({kind:'setNavigationView',view:options.navigationView});
  for(let i=0;i<250;i++){
   const result=await f.command({kind:'advance',seconds:.05,steps:4,nightFastForward:true});
   for(const key of result.residency?.missing??[])f.command({kind:'addChunk',key});
   await f.present();
   const view=JSON.parse(result.snapshot);
   if((!duringSuccessor||successor)&&(!acquiredSuccessor||acquiredCycle)&&view.workers.some(worker=>worker.nativeRouteAdmission==='native-home')&&
      view.workers.some(worker=>worker.nativeRouteAdmission===(stationary?'native-idle':'native-idle-stroll'))){state=view;break;}
  }
  assert(state);
  if(loss==='preparer first'){
   f.retireResourceEndpoint();release();
   await untilProduction(f,()=>f.authority.nativeIntentProductionStatus().active===null);
  }
  const holding=f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  if(loss!=='preparer first')f.retireResourceEndpoint();
  release();
  const hold=await holding;
  f.gpu.device.destroy();
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
  const retired=await f.authority.flushNativeResourcePreparation({forLostDraw:true,allowRetired:true});
  assert(retired.terminal&&retired.callbacksSettled);
  const route=await f.authority.terminalWorkerRoute();
  assert(route);
  const {idleCyclePhases,...membership}=route;
  const idleCyclePhase=idleCyclePhases?.[0];
  assert.deepEqual(membership,{version:2,members:[{kind:18,actorId:8},{kind:stationary?21:22,actorId:6}]});
  if(acquiredSuccessor){
   assert.equal(idleCyclePhase.cycleSequence,acquiredCycle.cycleSequence);
   assert.deepEqual(idleCyclePhase.worldBoundary,acquiredCycle.reference.worldBoundary);
   await assert.rejects(f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,
    {...route,idleCyclePhases:[{...idleCyclePhase,phaseDelay:idleCyclePhase.phaseDelay+0.01}]}),/exact Idle cycle phase/);
  }else assert.equal(idleCyclePhase,undefined);
  replacement=await drawFixture({capabilities:{nativeHomeRouteVersion:1,nativeIdleStrollVersion:1,nativeIdleCycleVersion:1,nativeIdleCycleIdlePhaseVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:source}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  assert.deepEqual(source.terrainManifest,manifest);
  const proofs={version:2,members:source.members.map(({resources,execution})=>({kind:resources.kind,proof:execution.binding})),idleCyclePhases:source.idleCyclePhases};
  if(acquiredSuccessor){
   assert.deepEqual(source.idleCyclePhases,[idleCyclePhase]);
   assert.throws(()=>copyNativeRecoveryGroup({...proofs,idleCyclePhases:undefined},source.worldBoundary),/requires its retired phase/);
  }
  assert.equal(copyNativeRecoveryGroup(proofs,source.worldBoundary).ordinaryWorkers,true);
  assert.throws(()=>copyNativeRecoveryGroup(proofs,{...source.worldBoundary,ticket:source.worldBoundary.ticket+1}),/one world cut/);
  const at=state.elapsed,metadata={nativeWorldBoundary:source.worldBoundary,clock:{...f.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}};
  const {client,host,pipeline}=replacement;
  const periods=[3.8,4.0416669845581055];
  function clockGroup(kind,ref,withPhase=false){
   const home=kind===18,cycle=kind===21,epoch=ref.worldBoundary.effectiveTime;
   const buffer=client.device.createBuffer({size:16,usage:72});client.device.queue.writeBuffer(buffer,0,new Float32Array(4));
   client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch,
    ...(cycle?{}:{resourceEnd:nativeClockResourceEnd(epoch,ref.endTime)}),[home?'nativeHome':cycle?'nativeIdleCycle':'nativeStroll']:ref});
   if(withPhase)for(const [i,period] of periods.entries())client.registerClockBinding(buffer,
    {byteOffset:4+i*4,semantic:'idle-offset',epoch,period,nativeIdleCycle:ref});
   return client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
  }
  const groups=source.members.map(({resources,execution})=>{
   const worker=state.workers.find(worker=>worker.id==='worker-'+execution.actorId),cycle=resources.kind===21,ref=execution.binding.reference;
   const pose=cycle?nativeIdleCycleBodyState(ref.sourceBody).pose:execution.pose??execution;
   assert.equal(execution.executedThrough,at);
   for(const key of ['x','z','walkPhase','runPhase','carryPhase','runRemaining'])assert.equal(worker[key],pose[key]);
   assert.equal(worker.heading,pose.yaw);
   if(cycle){assert.deepEqual(worker.idleState,execution.idleState);assert.equal(execution.finished,duringSuccessor);}
   return clockGroup(resources.kind,ref,cycle&&acquiredSuccessor);
  });
  function frame(bindings){
   client.beginFrame(metadata);
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);for(const group of bindings){pass.setBindGroup(0,group);pass.draw(3);}pass.end();
   client.device.queue.submit([encoder.finish()]);return client.endFrame();
  }
  await assert.rejects(frame(groups.slice(0,1)),/Replacement requires its bound worker clock/);
  const cycleReference=source.members[1].execution.binding.reference;
  if(acquiredSuccessor)await assert.rejects(frame([groups[0],clockGroup(21,cycleReference)]),/Replacement requires its bound worker clock/);
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  const drawing=frame(groups);drawing.catch(()=>{});await flush();await host.idle();
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  host.present();await drawing;
  const proof=await f.authority.checkHeldDraw(30,hold,route);
  assert.equal(proof.elapsed,at);
  if(acquiredSuccessor){
   assert.equal(proof.members[1].phaseDelay,idleCyclePhase.phaseDelay);
   const pick=captureNativeRoutePickFrame(host.inspect()),epoch=cycleReference.worldBoundary.effectiveTime;
   for(const period of periods)assert.equal(pick.getIdleCyclePhaseOffset(cycleReference,period),nativeIdleCyclePhaseOffset({elapsed:at,
    executionEpoch:epoch,relativeTime:proof.members[1].relativeTime,duration:cycleReference.duration,period,phaseDelay:idleCyclePhase.phaseDelay}));
  }
  for(const [i,{execution}] of source.members.entries()){
   const ref=execution.binding.reference;
   assert.equal(proof.members[i].relativeTime,floorFloat32(execution.finished?ref.duration:at-ref.worldBoundary.effectiveTime));
   assert.deepEqual(proof.members[i][i===0?'nativeHome':stationary?'nativeIdleCycle':'nativeStroll'],ref);
  }
  await f.attachRecoveredResources(replacement);attached=true;
  assert.equal(f.authority.resumeNativeIntentProduction(hold),true);
  if(duringSuccessor){
   assert.equal(successor.committed,false);
   await untilProduction(f,()=>f.records.some(row=>row!==successor&&row.kind==='idle-cycle'&&
    row.resources.nativeIdleCycle.actorId===6&&row.resources.nativeIdleCycle.sourceCycleSequence&&row.committed));
  }
  const result=await f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
  assert.equal(result.stepsExecuted,2);
  const later=JSON.parse(result.snapshot);
  assert.deepEqual(later.ledger,state.ledger);
  assert(later.workers.every(worker=>{
   const source=state.workers.find(peer=>peer.id===worker.id);
   if(stationary&&worker.id==='worker-6')return worker.x===source.x&&worker.z===source.z&&
    (duringSuccessor?worker.idleState!==null:worker.idleState.elapsed>source.idleState.elapsed);
   return worker.x!==source.x||worker.z!==source.z;
  }));
  assert.deepEqual(f.faults,[]);
 }finally{
  release();
  try{await f.close();}finally{if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}ports.port1.close();ports.port2.close();}
 }
});
