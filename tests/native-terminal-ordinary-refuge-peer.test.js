import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {gunzipSync} from 'node:zlib';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {copyNativeRecoveryGroup,nativeWorkerRouteRecoveryProfile} from '../src/world/native-worker-route-recovery.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture as drawFixture,flush} from './helpers/remote-webgpu-fixture.js';

for(const [kind,admission,request] of [[21,'native-idle','idle-cycle'],[22,'native-idle-stroll','idle-stroll'],[18,'native-home','home-route']])test(`civil recovery holds worker ${kind} and the other worker’s acquired Home19 absence`,{timeout:45000},async()=>{
 const save=gunzipSync(readFileSync(new URL('./fixtures/sabana714-d1-two-paid-workers-before-home.json.gz',import.meta.url))).toString();
 const options=savedNativeAuthorityOptions(save),profile=nativeWorkerRouteRecoveryProfile(kind);
 const acquisitions=new Map();
 let acquired,arrival;
 const f=await nativeProductionAuthority(JSON.parse(save),{...options,onCommit(record,commit){
  if(commit[profile.bindingField]?.reference.actorId===6)acquisitions.set(record,commit[profile.bindingField]);
  if(commit.nativeHomeArrivalBinding?.reference.actorId===8)arrival=commit.nativeHomeArrivalBinding;
 }});
 const ports=new MessageChannel();
 let replacement,attached=false,state;
 try{
  f.command({kind:'setNavigationView',view:options.navigationView});
  // Two-step turns expose the short walk before the final Home stop.
  for(let i=0;i<600;i++){
   const step=await f.command({kind:'advance',seconds:.05,steps:kind===22?2:4,nightFastForward:true});
   for(const key of step.residency?.missing??[])f.command({kind:'addChunk',key});
   await f.present();
   const current=f.snapshot();
   if(arrival&&current.workers[0].nativeRouteAdmission===admission&&current.workers[1].status==='home'){
    const record=f.records.findLast(item=>item.kind===request);
    assert(record);
    await untilProduction(f,()=>acquisitions.has(record));
    acquired=acquisitions.get(record);state=current;break;
   }
  }
  assert(state,'The selected civilian recovery cut never occurred');
  const holding=f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  f.retireResourceEndpoint();
  const hold=await holding;
  f.gpu.device.destroy();
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
  const drained=await f.authority.flushNativeResourcePreparation({forLostDraw:true,allowRetired:true});
  assert(drained.terminal&&drained.callbacksSettled);
  const route=await f.authority.terminalWorkerRoute();
  assert.equal(route?.refuge,true);
  assert.deepEqual(route.members,[{kind,actorId:6}]);
  await assert.rejects(f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,{version:2,refuge:true,members:[]}),/Expected current native recovery assignments/);

  replacement=await drawFixture({capabilities:{nativeHomeRouteVersion:1,nativeIdleCycleVersion:1,nativeIdleCycleIdlePhaseVersion:1,nativeIdleStrollVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:source}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  assert.deepEqual(source.refuge,arrival);
  const [{execution,resources}]=source.members,at=execution.executedThrough,cut=source.worldBoundary;
  const ref=execution.binding.reference;
  assert.equal(at,state.elapsed);
  assert.deepEqual(execution.binding,acquired);
  assert.deepEqual(resources[profile.bindingField],acquired);
  assert.equal(ref.bodyId,1);
  assert.equal(arrival.reference.bodyId,2);
  assert.equal(cut.ticket,Math.max(ref.worldBoundary.ticket,arrival.reference.worldBoundary.ticket));
  const proofs={version:2,refuge:arrival,members:[{kind,proof:acquired}],idleCyclePhases:source.idleCyclePhases};
  assert(copyNativeRecoveryGroup(proofs,cut).ordinaryWorkers);
  assert.throws(()=>copyNativeRecoveryGroup(proofs,{...cut,ticket:cut.ticket+1}),/acquired refuge cut/);

  const {host,client,pipeline}=replacement;
  function clockGroup(reference,field,isIdle=false){
   const epoch=reference.worldBoundary.effectiveTime;
   const buffer=client.device.createBuffer({size:16,usage:72});
   client.device.queue.writeBuffer(buffer,0,new Float32Array(4));
   client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch,
    ...(isIdle?{}:{resourceEnd:nativeClockResourceEnd(epoch,reference.endTime)}),[field]:reference});
   if(isIdle)client.registerClockBinding(buffer,{byteOffset:4,semantic:'idle-offset',epoch,period:3.8,nativeIdleCycle:reference});
   return client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
  }
  const peer=clockGroup(ref,profile.clockField,kind===21),ghost=clockGroup(arrival.reference.sourceHome.reference,'nativeHome');
  function frame(groups){
   client.beginFrame({nativeWorldBoundary:cut,clock:{...f.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}});
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);
   for(const group of groups){pass.setBindGroup(0,group);pass.draw(3);}
   if(!groups.length)pass.draw(3);
   pass.end();client.device.queue.submit([encoder.finish()]);
   return client.endFrame();
  }
  await assert.rejects(frame([]),/Replacement requires its bound worker clock/);
  await assert.rejects(frame([peer,ghost]),/Replacement requires its bound worker clock/);
  const submitted=frame([peer]);submitted.catch(()=>{});await flush();await host.idle();
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted worker route/);
  host.present();await submitted;
  const result=await f.authority.checkHeldDraw(30,hold,route),age=floorFloat32(at-ref.worldBoundary.effectiveTime);
  assert.deepEqual(result.refuge,arrival);
  assert.deepEqual(result.worldBoundary,cut);
  assert.equal(result.members[0].relativeTime,age);
  const inspected=host.inspect(),pick=captureNativeRoutePickFrame(inspected);
  assert(inspected.nativeRouteFrame.bindings.every(row=>row[profile.clockField]?.actorId===6));
  const pickAge=kind===21?pick.getIdleCycleElapsed(ref):kind===22?pick.getStrollElapsed(ref):pick.getHomeElapsed(ref);
  assert.equal(pickAge,age);
  await f.attachRecoveredResources(replacement);attached=true;
  assert(f.authority.resumeNativeIntentProduction(hold));
  const after=await f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false}),later=JSON.parse(after.snapshot);
  assert.equal(after.stepsExecuted,1);
  assert.deepEqual(later.workers[1],state.workers[1]);
  assert.deepEqual(later.ledger,state.ledger);
  assert.deepEqual(f.faults,[]);
 }finally{
  try{await f.close();}finally{
   if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}
   ports.port1.close();ports.port2.close();
  }
 }
});
