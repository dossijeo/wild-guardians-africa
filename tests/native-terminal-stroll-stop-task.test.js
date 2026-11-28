import assert from 'node:assert/strict';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rational} from '../src/simulation/money.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {deserialize} from '../src/persistence/snapshots.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {copyStop12Resources,stopFields} from '../src/world/native-stop24-task-recovery.js';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';

for(const endpointFirst of [false,true])test(`terminal Stop12 recovers the Idle22 body before Task14 (${endpointFirst?'endpoint first':'hold first'})`,{timeout:30000},async()=>{
 const source=nativeIdleCycleGameFixture({mode:'watch',remaining:.03,rng:0,peer:false});
 const state=structuredClone(source.state),point=source.point(-9,10);
 state.ledger.balance=rational(100000);
 let release,stop,task,replacement,attached=false;
 const ready=new Promise(resolve=>release=resolve),ports=new MessageChannel();
 const f=await nativeProductionAuthority(state,{nativeWorkerLifecycle:true,
  onReady(record){if(record.kind==='task-start'&&!task){task=record;return ready;}},
  onCommit(_record,data){stop??=data.nativeIdleStrollStopBinding;}});
 try{
  const step=async()=>{const result=f.advance();await f.present();return result;};
  await untilProduction(f,()=>f.records.some(r=>r.kind==='initial-idle-body'&&r.committed));
  for(let i=0;i<8&&!f.records.some(r=>r.kind==='idle-stroll'&&r.committed);i++)await step();
  await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));
  const walk=f.records.find(r=>r.kind==='idle-stroll'&&r.committed),before=await step();
  assert.equal(before.workers[0].nativeRouteAdmission,'native-idle-stroll');
  const commandId='single-ordinary-plant-stop12';
  assert.equal(f.command({kind:'plant',id:commandId,species:'mijo',x:point.x,z:point.z}).value,true);
  for(let i=0;i<10&&!task;i++)await step();
  await untilProduction(f,()=>task&&stop&&f.host.inspect().nativeRouteFrame?.bindings.some(b=>b.nativeStopped));
  const old=f.host.inspect().nativeRouteFrame.bindings.find(b=>b.nativeStopped),cut=f.snapshot(),worker=cut.workers[0];
  assert.equal(worker.nativeRouteAdmission,'pending-resources');
  const retire=()=>{f.gpu.device.destroy();f.retireResourceEndpoint();release();};
  if(endpointFirst){retire();await untilProduction(f,()=>f.authority.nativeIntentProductionStatus().last?.status==='cancelled');}
  const held=f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  if(!endpointFirst)retire();
  const hold=await held;
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
  const terminal=await f.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true});
  assert(terminal.terminal&&terminal.callbacksSettled&&task.aborted&&!task.committed);
  const route=await f.authority.terminalWorkerRoute();
  assert.deepEqual(route,{kind:12,actorId:walk.resources.actorId});
  replacement=await fixture({capabilities:{nativeIdleStrollStopVersion:1,nativeIdleStrollStopClockVersion:1,
   nativeTaskStartVersion:1,nativeTaskActionVersion:1,nativeTaskActionClockVersion:1,nativeInitialIdleBodyVersion:1,
   nativeIdleCycleVersion:1,nativeIdleStrollVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  await assert.rejects(f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,{...route,kind:24}),/Expected current native recovery assignments/);
  const {recoveredWorkerRoute:{resources,execution}}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  const {client,host,pipeline}=replacement,proof=execution.binding,ref=proof.reference;
  assert.deepEqual(proof.proof,stop);
  assert.deepEqual(resources.strollTemplate.rows,walk.resources.rows);
  assert.equal(ref.epoch,old.epoch);
  const invalid=structuredClone(resources);
  invalid.stoppedTaskBinding.stroll.assignmentSequence++;
  assert.throws(()=>copyStop12Resources(invalid),/Invalid suspended worker task recovery/);
  const buffer=client.device.createBuffer({size:40,usage:72});
  const group=client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
  client.device.queue.writeBuffer(buffer,0,new Float32Array(10));
  const clock={nativeStopped:ref.selector,epoch:ref.epoch,resourceEnd:Number.MAX_SAFE_INTEGER};
  client.registerClockBinding(buffer,{...clock,byteOffset:0,semantic:'relative'});
  function frame(){
   client.beginFrame({nativeWorldBoundary:ref.worldBoundary,clock:{...f.clock,elapsed:cut.elapsed,safeUntil:cut.elapsed,paused:true,segments:[]}});
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();client.device.queue.submit([encoder.finish()]);
   return client.endFrame();
  }
  await assert.rejects(frame(),/Replacement requires its bound worker clock/);
  for(const [i,stopField] of stopFields.entries())client.registerClockBinding(buffer,{...clock,byteOffset:(i+1)*4,semantic:'stop-value',stopField});
  const drawing=frame();drawing.catch(()=>{});await flush();await host.idle();
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted worker route/);
  host.present();await drawing;
  const witness=await f.authority.checkHeldDraw(30,hold,route),pick=captureNativeRoutePickFrame(host.inspect()).getStoppedBody(ref.selector,ref.epoch);
  assert.deepEqual(witness.projection,old.projection);
  assert.equal(pick.x,Math.fround(worker.x));
  assert.equal(pick.walkPhase,Math.fround(worker.walkPhase));
  await f.attachRecoveredResources(replacement);attached=true;
  assert(f.authority.resumeNativeIntentProduction(hold));
  await untilProduction(f,()=>f.records.some(record=>record.kind==='task-start'&&record.committed));
  const acquired=f.records.find(record=>record.kind==='task-start'&&record.committed);
  assert.equal(acquired.resources.bodyId,ref.bodyId);
  assert(acquired.resources.worldBoundary.ticket>task.resources.worldBoundary.ticket);
  let final=cut;
  for(let i=0;i<450&&!final.events.some(e=>e.type==='WaterSatisfied');i++)final=await step();
  const crop=final.events.find(event=>event.type==='CropPlaced'&&event.commandId===commandId)?.targetId;
  assert(crop);
  assert.equal(final.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===crop&&e.workerId===worker.id).length,1);
  assert.deepEqual(final.ledger,cut.ledger);
  assert.deepEqual(f.faults,[]);
 }finally{
  release();
  try{await f.close();}finally{
   source.close();
   if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}
   ports.port1.close();ports.port2.close();
  }
 }
});

test('terminal Stop12 recovers the worker and the stopped enclosure gate before Task14',{timeout:45000},async()=>{
 const disk=gunzipSync(readFileSync(new URL('./fixtures/desierto712-enclosure-day2.json.gz',import.meta.url))).toString();
 const ports=new MessageChannel();
 let task,stop,releaseTask,replacement,attached=false;
 const taskReady=new Promise(resolve=>releaseTask=resolve);
 const f=await nativeProductionAuthority(deserialize(disk),{
  ...savedNativeAuthorityOptions(disk),emptyBeastPhysics:true,drawFarmGate:true,
  onReady(record){if(record.kind==='task-start'&&!task){task=record;return taskReady;}},
  onCommit(record,data){if(record.kind==='idle-stroll-stop')stop=data.nativeIdleStrollStopBinding;}
 });
 try{
  const step=async()=>{
   const packet=await f.command({kind:'advance',seconds:.05,steps:4,nightFastForward:false});
   await f.present();return packet;
  };
  const hired=f.command({kind:'hire',id:'second-enclosed-shift',selection:{youngMale:1}});
  assert.equal(JSON.parse(hired.snapshot).workers[0].id,'worker-29');
  for(let i=0;i<150&&!task;i++)await step();
  await untilProduction(f,()=>task&&stop&&f.host.inspect().nativeRouteFrame?.bindings.some(row=>row.nativeStopped?.kind==='native-idle-stroll-stopped-gate'));
  const cut=f.snapshot(),old=f.host.inspect().nativeRouteFrame;
  assert.equal(cut.workers[0].nativeRouteAdmission,'pending-resources');
  const [gate]=stop.reference.gates,oldMotor=old.bindings.find(row=>row.nativeStopped?.gateId===gate.gateId);
  assert.equal(gate.gateId,7);
  assert.equal(oldMotor.opening,Math.fround(stop.projection.gateEffects.rows[2]));

  const holding=f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  f.gpu.device.destroy();f.retireResourceEndpoint();releaseTask();
  const hold=await holding;
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
  const terminal=await f.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true});
  assert(terminal.terminal&&terminal.callbacksSettled&&task.aborted&&!task.committed);
  const route=await f.authority.terminalWorkerRoute();
  assert.deepEqual(route,{kind:12,actorId:29});
  replacement=await fixture({capabilities:{nativeIdleStrollStopVersion:1,nativeIdleStrollStopClockVersion:1,nativeIdleStrollStopGateVersion:1,
   nativeTaskStartVersion:1,nativeTaskActionVersion:1,nativeTaskActionClockVersion:1,nativeInitialIdleBodyVersion:1,nativeIdleCycleVersion:1,nativeIdleStrollVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  const {recoveredWorkerRoute:{resources,execution}}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  const {client,host,pipeline}=replacement,{reference:ref,proof}=execution.binding;
  assert.deepEqual(proof,stop);
  assert.deepEqual(resources.strollTemplate.gates.map(row=>row.gateId),[7]);
  assert.throws(()=>copyStop12Resources({...resources,strollTemplate:{...resources.strollTemplate,gates:[]}}),/lost its admitted Idle table/);

  const uniform=size=>{
   const buffer=client.device.createBuffer({size,usage:72});
   client.device.queue.writeBuffer(buffer,0,new Float32Array(size/4));
   return {buffer,group:client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]})};
  };
  const body=uniform(40),motor=uniform(16),clock={nativeStopped:ref.selector,epoch:ref.epoch,resourceEnd:Number.MAX_SAFE_INTEGER};
  client.registerClockBinding(body.buffer,{...clock,byteOffset:0,semantic:'relative'});
  stopFields.forEach((stopField,i)=>client.registerClockBinding(body.buffer,{...clock,byteOffset:(i+1)*4,semantic:'stop-value',stopField}));
  const gateSelector={kind:'native-idle-stroll-stopped-gate',version:1,stop:stop.preparedReference,...gate},gateEpoch=gateSelector.stop.worldBoundary.effectiveTime;
  client.registerClockBinding(motor.buffer,{byteOffset:0,semantic:'stop-value',epoch:gateEpoch,nativeStopped:gateSelector,stopField:'opening'});
  function draw(groups){
   client.beginFrame({nativeWorldBoundary:ref.worldBoundary,clock:{...f.clock,elapsed:cut.elapsed,safeUntil:cut.elapsed,paused:true,segments:[]}});
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);for(const {group} of groups){pass.setBindGroup(0,group);pass.draw(3);}
   pass.end();client.device.queue.submit([encoder.finish()]);return client.endFrame();
  }
  await assert.rejects(draw([body]),/Replacement requires its bound worker clock/);
  const drawing=draw([body,motor]);drawing.catch(()=>{});await flush();await host.idle();
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted worker route/);
  host.present();await drawing;
  const recovered=await f.authority.checkHeldDraw(30,hold,route),pick=captureNativeRoutePickFrame(host.inspect());
  assert.deepEqual(recovered.stoppedGates,[oldMotor]);
  assert.equal(pick.getStoppedGate(gateSelector,gateEpoch).opening,oldMotor.opening);
  assert.equal(pick.getStoppedBody(ref.selector,ref.epoch).x,Math.fround(cut.workers[0].x));

  await f.attachRecoveredResources(replacement);attached=true;
  assert(f.authority.resumeNativeIntentProduction(hold));
  await untilProduction(f,()=>f.records.some(record=>record.kind==='task-start'&&record.committed));
  const acquired=f.records.find(record=>record.kind==='task-start'&&record.committed);
  assert.equal(acquired.resources.bodyId,ref.bodyId);
  assert(acquired.resources.worldBoundary.ticket>task.resources.worldBoundary.ticket);
  let watered;
  for(let i=0;i<150&&!watered;i++)watered=(await step()).events.find(event=>event.type==='WaterSatisfied'&&event.workerId==='worker-29'&&event.targetId==='plant-3');
  assert(watered);
  assert.deepEqual(f.snapshot().ledger,cut.ledger);
  assert.deepEqual(f.faults,[]);
 }finally{
  releaseTask();
  try{await f.close();}finally{
   if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}
   ports.port1.close();ports.port2.close();
  }
 }
});
