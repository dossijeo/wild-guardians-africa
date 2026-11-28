import assert from 'node:assert/strict';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {plant} from '../src/simulation/game.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {floorFloat32} from '../src/float32-time.js';
import {stop24ProjectionMatches,stopFields} from '../src/world/native-stop24-task-recovery.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';

for(const retireFirst of [false,true])test(`terminal Stop24 replaces the drawn worker with Task14 pending (${retireFirst?'endpoint first':'hold first'})`,{timeout:30000},async()=>{
 const {state,nav,dispose}=await createSpatialCampaignOpening();
 try{
  const center=state.structures.find(item=>item.kind==='center');
  state.tutorial.step='plant';
  assert(plant(state,'first-native-crop','platano',center.x+4,center.z-7,nav));
 }finally{dispose();}
 let release,stop,successor;
 const ready=new Promise(resolve=>release=resolve);
 const f=await nativeProductionAuthority(state,{nativeWorkerLifecycle:true,
  onReady(record){if(stop&&!successor&&record.kind==='task-start'){successor=record;return ready;}},
  onCommit(_record,data){stop??=data.nativeFarmArrivalStopBinding;}});
 const ports=new MessageChannel();
 let replacement,attached=false;
 try{
  f.command({kind:'setNavigationView',view:{bounds:[24,-48,144,48],eye:{x:76,z:30},target:{x:75,z:-4}}});
  f.command({kind:'openInitialHiring'});
  f.command({kind:'hire',id:'savanna-moving-hire',selection:{youngMale:1}});
  async function advance(steps){
   const result=await f.command({kind:'advance',seconds:.05,steps,nightFastForward:false});
   for(const key of result.residency?.missing??[])f.command({kind:'addChunk',key});
   await f.present();
   return f.snapshot();
  }
  let cut,old;
  for(let i=0;i<120;i++){
   const frame=await advance(4);
   old=f.host.inspect().nativeRouteFrame?.bindings.find(row=>row.nativeStopped?.kind==='native-farm-arrival-stopped-body');
   if(old&&successor){cut=frame;break;}
  }
  assert(cut);
  const worker=cut.workers[0];
  assert.equal(worker.nativeRouteAdmission,'pending-resources');
  assert.equal(successor.committed,false);
  const retire=()=>{f.gpu.device.destroy();f.retireResourceEndpoint();release();};
  if(retireFirst){retire();await untilProduction(f,()=>f.authority.nativeIntentProductionStatus().last?.status==='cancelled');}
  const holding=f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  if(!retireFirst)retire();
  const hold=await holding;
  assert(successor.aborted&&!successor.committed);
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
  const terminal=await f.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true});
  assert(terminal.terminal&&terminal.callbacksSettled);
  const route=await f.authority.terminalWorkerRoute();
  assert.deepEqual(route,{kind:24,actorId:6});
  replacement=await fixture({capabilities:{nativeFarmArrivalStopVersion:1,nativeFarmArrivalStopClockVersion:1,
   nativeTaskStartVersion:1,nativeTaskActionVersion:1,nativeTaskActionClockVersion:1,nativeInitialIdleBodyVersion:1,
   nativeIdleCycleVersion:1,nativeIdleStrollVersion:1,nativeIdleCycleIdlePhaseVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  await assert.rejects(f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,{...route,actorId:199}),
   /Expected current native recovery assignments/);
  const {recoveredWorkerRoute:{resources,execution}}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  const {client,host,pipeline}=replacement,proof=execution.binding,ref=proof.reference;
  assert.deepEqual(resources.stoppedTaskBinding,proof);
  assert.deepEqual(proof.proof,stop);
  assert.equal(ref.bodyId,1);assert.equal(ref.epoch,old.epoch);
  assert.equal(execution.executedThrough,cut.elapsed);
  const priorFarm=f.records.find(record=>record.kind==='farm-arrival'&&record.committed);
  assert.deepEqual(resources.farmTemplate.rows,priorFarm.resources.rows);
  assert.deepEqual(resources.farmTemplate.nativeFarmArrival,priorFarm.resources.nativeFarmArrival);

  const buffer=client.device.createBuffer({size:40,usage:72});
  client.device.queue.writeBuffer(buffer,0,new Float32Array(10));
  const group=client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
  const register=(nativeStopped,values)=>{
   const binding={nativeStopped,epoch:ref.epoch,resourceEnd:Number.MAX_SAFE_INTEGER};
   client.registerClockBinding(buffer,{...binding,byteOffset:0,semantic:'relative'});
   if(values)for(const [i,stopField] of stopFields.entries())
    client.registerClockBinding(buffer,{...binding,byteOffset:(i+1)*4,semantic:'stop-value',stopField});
  };
  function frame(){
   client.beginFrame({nativeWorldBoundary:ref.worldBoundary,
    clock:{...f.clock,elapsed:cut.elapsed,safeUntil:cut.elapsed,paused:true,segments:[]}});
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();client.device.queue.submit([encoder.finish()]);
   return client.endFrame();
  }
  register(ref.selector,false);
  await assert.rejects(frame(),/Replacement requires its bound worker clock/);
  register({...ref.selector,stop:{...ref.selector.stop,worldBoundary:{...ref.worldBoundary,ticket:77}}},true);
  await assert.rejects(frame(),/Replacement requires its bound worker clock/);
  register(ref.selector,true);
  const drawing=frame();drawing.catch(()=>{});await flush();await host.idle();
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted worker route/);
  host.present();await drawing;
  const witness=await f.authority.checkHeldDraw(30,hold,route);
  assert(stop24ProjectionMatches(witness,proof));
  assert.deepEqual(witness.projection,old.projection);
  assert.equal(witness.relativeTime,floorFloat32(cut.elapsed-old.epoch));
  const presented=captureNativeRoutePickFrame(host.inspect()).getStoppedBody(ref.selector,ref.epoch);
  assert.equal(presented.x,Math.fround(worker.x));
  assert.equal(presented.walkPhase,Math.fround(worker.walkPhase));

  await f.attachRecoveredResources(replacement);attached=true;
  assert(f.authority.resumeNativeIntentProduction(hold));
  await untilProduction(f,()=>f.records.some(record=>record.kind==='task-start'&&record.committed));
  const task=f.records.find(record=>record.kind==='task-start'&&record.committed);
  assert.notEqual(task,successor);
  assert(task.resources.worldBoundary.ticket>successor.resources.worldBoundary.ticket);
  assert.equal(task.resources.bodyId,1);
  let final;
  for(let i=0;i<160;i++){
   final=await advance(10);
   if(final.events.some(event=>event.type==='WaterSatisfied'))break;
  }
  assert.equal(final.events.filter(event=>event.type==='WaterSatisfied').length,1);
  assert.deepEqual(final.ledger,cut.ledger);
  assert.deepEqual(f.faults,[]);
 }finally{
  release();
  try{await f.close();}finally{
   if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}
   ports.port1.close();ports.port2.close();
  }
 }
});
