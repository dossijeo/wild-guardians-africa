import assert from 'node:assert/strict';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {plant} from '../src/simulation/game.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {nativeWorkerRouteRecoveryProfile} from '../src/world/native-worker-route-recovery.js';
import {nativeTaskActionProjectionMatches} from '../src/world/native-task-action-attestation.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture as drawFixture,flush} from './helpers/remote-webgpu-fixture.js';

for(const kind of [14,15])test(`terminal Draw recovery preserves acquired phase ${kind} through one watering action`,{timeout:45000},async()=>{
 const profile=nativeWorkerRouteRecoveryProfile(kind),action=kind===15;
 const opening=await createSpatialCampaignOpening();
 const {state,nav}=opening,chunkKeys=[...opening.loaded.keys()];
 try{
  const center=state.structures.find(item=>item.kind==='center');
  state.tutorial.step='plant';
  assert(plant(state,'first-native-crop','platano',center.x+4,center.z-7,nav));
 }finally{opening.dispose();}
 let releaseFarm,acquired;
 const farmReady=new Promise(resolve=>releaseFarm=resolve);
 const f=await nativeProductionAuthority(state,{chunkKeys,nativeWorkerLifecycle:true,
  onReady:record=>record.kind==='farm-arrival'?farmReady:undefined,
  onCommit(_record,receipt){acquired??=receipt[profile.bindingField];}});
 const ports=new MessageChannel();
 let replacement,attached=false;
 try{
  f.command({kind:'setNavigationView',view:{bounds:[24,-48,144,48],eye:{x:76,z:30},target:{x:75,z:-4}}});
  f.command({kind:'openInitialHiring'});
  f.command({kind:'hire',id:'savanna-first-hire',selection:{youngMale:1}});
  async function advance(steps){
   const result=await f.command({kind:'advance',seconds:.05,steps,nightFastForward:false});
   for(const key of result.residency?.missing??[])f.command({kind:'addChunk',key});
   await f.present();
   return f.snapshot();
  }
  let cut;
  for(let i=0;i<600;i++){
   const current=await advance(2);
   if(current.workers[0]?.nativeRouteAdmission==='pending-resources')releaseFarm();
   const frame=f.host.inspect().nativeRouteFrame;
   const earliest=action&&acquired?acquired.reference.request.duration*(3.8/7.2):0;
   if(acquired&&current.workers[0]?.nativeRouteAdmission===profile.admission&&
      frame?.bindings.some(row=>row[profile.clockField]&&row.relativeTime>earliest)){
    cut=current;
    break;
   }
  }
  assert(cut,`The paid phase ${kind} never appeared with positive age`);
  const holding=f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  f.retireResourceEndpoint();
  const hold=await holding;
  f.gpu.device.destroy();
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
  const terminal=await f.authority.flushNativeResourcePreparation({forLostDraw:true,allowRetired:true});
  assert(terminal.terminal&&terminal.callbacksSettled);
  const route=await f.authority.terminalWorkerRoute();
  assert.deepEqual(route,{kind,actorId:6});
  replacement=await drawFixture({capabilities:{nativeTaskStartVersion:1,nativeTaskActionVersion:1,nativeTaskActionClockVersion:1,
   nativeInitialIdleBodyVersion:1,nativeIdleCycleVersion:1,nativeIdleCycleIdlePhaseVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:source}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  const {execution,resources}=source,ref=acquired.reference,epoch=ref.worldBoundary.effectiveTime;
  assert.deepEqual(execution.binding,acquired);
  assert.deepEqual(resources[profile.bindingField],acquired);
  assert.equal(execution.executedThrough,cut.elapsed);
  assert.equal(execution.bodyId,1);
  if(action){
   const worker=cut.workers[0],task=cut.tasks.find(task=>task.id===worker.taskId);
   assert(nativeTaskActionProjectionMatches(execution,worker,task,cut.elapsed));
   assert(!nativeTaskActionProjectionMatches(execution,worker,{...task,targetId:'plant-100'},cut.elapsed));
   assert(!nativeTaskActionProjectionMatches(execution,{...worker,actionRemaining:worker.actionRemaining+.05},task,cut.elapsed));
   assert.throws(()=>profile.copyResources({...resources,worldBoundary:{...resources.worldBoundary,
    ticket:resources.worldBoundary.ticket+1}}),/Native action resource boundary mismatch/);
   assert.equal(cut.events.filter(event=>event.type==='WaterSatisfied').length,0);
  }else{
   for(const field of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])
    assert.equal(execution[field],cut.workers[0][field]);
   assert.equal('task-'+execution.taskId,cut.workers[0].taskId);
   assert.equal(resources.nativeRoute.assignmentSequence,acquired.assignmentSequence);
   assert.throws(()=>profile.copyResources({...resources,nativeRoute:{...resources.nativeRoute,
    routeHandle:{...resources.nativeRoute.routeHandle,generation:resources.nativeRoute.routeHandle.generation+1}}}),
    /Recovered Task14 program differs/);
  }

  const {host,client,pipeline}=replacement;
  const buffer=client.device.createBuffer({size:16,usage:72});
  client.device.queue.writeBuffer(buffer,0,new Float32Array(4));
  client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch,[profile.clockField]:ref,
   ...(action?{}:{resourceEnd:nativeClockResourceEnd(epoch,ref.endTime)})});
  const group=client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
  function frame(bind){
   client.beginFrame({nativeWorldBoundary:ref.worldBoundary,clock:{...f.clock,
    elapsed:cut.elapsed,safeUntil:cut.elapsed,paused:true,segments:[]}});
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);
   if(bind)pass.setBindGroup(0,group);
   pass.draw(3);pass.end();client.device.queue.submit([encoder.finish()]);
   return client.endFrame();
  }
  await assert.rejects(frame(false),/Replacement requires its bound worker clock/);
  const pending=frame(true);pending.catch(()=>{});await flush();await host.idle();
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted worker route/);
  host.present();await pending;
  const witness=await f.authority.checkHeldDraw(30,hold,route),age=floorFloat32(cut.elapsed-epoch);
  assert.equal(witness.relativeTime,age);
  assert.equal(witness.assignmentSequence,action?acquired.actionSequence:acquired.assignmentSequence);
  assert.deepEqual(witness[profile.clockField],ref);
  const pick=captureNativeRoutePickFrame(host.inspect());
  assert.equal(action?pick.getActionElapsed(ref):pick.getStartTime(ref,epoch),action?age:epoch+age);
  await f.attachRecoveredResources(replacement);attached=true;
  assert(f.authority.resumeNativeIntentProduction(hold));

  let later;
  for(let i=0;i<300;i++){
   later=await advance(4);
   if(later.workers[0].nativeRouteAdmission==='native-idle'&&later.events.some(event=>event.type==='WaterSatisfied'))break;
  }
  assert.equal(later.workers[0].nativeRouteAdmission,'native-idle');
  assert.equal(later.events.filter(event=>event.type==='WaterSatisfied').length,1);
  assert.equal(f.records.filter(record=>record.kind==='task-start'&&record.committed).length,1);
  assert.equal(f.records.filter(record=>record.kind==='task-action'&&record.committed).length,1);
  assert.equal(later.workers[0].id,cut.workers[0].id);
  assert.deepEqual(later.ledger,cut.ledger);
  assert.deepEqual(f.faults,[]);
 }finally{
  releaseFarm();
  try{await f.close();}finally{
   if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}
   ports.port1.close();ports.port2.close();
  }
 }
});
