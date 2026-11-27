import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {createPlant} from '../src/simulation/crops.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {tick} from '../src/simulation/game.js';
import {MessageChannel} from 'node:worker_threads';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {floorFloat32} from '../src/float32-time.js';
import {recoveredStoppedGateSamplesMatch,stopFields} from '../src/world/native-stop24-task-recovery.js';
import {copyTask25HomeResources} from '../src/world/native-task25-home-recovery.js';
import {copyNativeStoppedClock} from '../src/rendering/native-stopped-clock.js';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function movingTask(profile,onReady,nativeWorkerLifecycle=false,onCommit,gate=null){
 const source=nativeIdleCycleGameFixture({mode:'rest',remaining:5,profile:profile.id,peer:false});let f;
 try{
  const state=structuredClone(source.state),worker=state.workers[0];state.time=profile.end-(gate?.lead??.55);
  const entry=state.villages.find(v=>v.id===worker.villageId);
  let chunkKeys;
  if(gate){
   const center=state.structures.find(row=>row.id===worker.centerId);
   Object.assign(worker,{x:-14,z:5.7});
   Object.assign(center,{x:-14,z:2});
   Object.assign(state.plants.find(row=>row.id==='plant-900098'),{x:worker.x,z:worker.z});
   state.structures.push({id:'structure-1000000',created:29207,kind:'wall',material:'zarzas',gate:true,
    x:-14,z:8.2,yaw:0,hp:60,maxHp:60,status:'intact',villageId:worker.villageId,cost:10,collapseRemaining:0,gateOpen:0});
   state.nextId=1000001;
   entry.entry={x:-14,z:4.6};
   chunkKeys=[...Array.from({length:9},(_,i)=>[i%3-1,Math.floor(i/3)-1].join(',')),'2,-1','2,0','2,1'];
  }else entry.entry=source.point(-9,0);
  const point=gate?{x:-14,z:11.8}:source.point(-4,6),target=createPlant(`plant-${state.nextId++}`,'mijo',point.x,point.z,worker.centerId);
  target.growth=999999;for(const slot of target.water)slot.status='manual';state.plants.push(target);
  f=await nativeProductionAuthority(state,{onReady,nativeWorkerLifecycle,onCommit,...(chunkKeys?{chunkKeys}:{})});
  await untilProduction(f,()=>f.records.some(r=>r.kind==='initial-idle-body'&&r.committed));
  assert.equal(f.command({kind:'harvest',id:'harvest-before-shift-end',targetId:target.id}).value,true);
  for(let i=0;i<4&&!f.records.some(r=>r.kind==='task-start'&&r.committed);i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='task-start'&&r.committed));
  const start=f.records.find(r=>r.kind==='task-start'&&r.committed),before=f.snapshot();
  return {f,start,before,source,async close(){await f.close();source.close();}};
 }catch(error){await f?.close();source.close();throw error;}
}
const pose=w=>[w.x,w.z,w.heading,w.runPhase,w.walkPhase,w.carryPhase];

test('unsupported return checks the same rounded clock edge before moving native bodies',()=>{
 const f=createNativeTaskGameFixture();try{
  const end=Math.min(...f.state.workers.map(w=>PROFILES.find(p=>p.id===w.profile).end));
  f.state.time=end-.05-4.5e-12;const elapsed=f.state.elapsed,at=f.state.time,bodies=[f.body(1),f.body(3)],tasks=f.state.workers.map(w=>w.taskId);
  assert(at+.05<end);assert(Math.abs(at+.05-end)<1e-9);
  f.nav.intentTaskPlanner={...f.planner,nativeTaskReturnSource:()=>null};
  assert.throws(()=>tick(f.state,.05,f.nav),/unsupported return boundary/);
  assert.equal(f.state.time,at);assert.equal(f.state.elapsed,elapsed);assert.deepEqual([f.body(1),f.body(3)],bodies);assert.deepEqual(f.state.workers.map(w=>w.taskId),tasks);
 }finally{f.close();}
});

for(const profile of PROFILES)test(`${profile.id}: ordinary shift end retains Task through delayed READY25, then Home18 and absence19`,async()=>{
 const stop=deferred(),home=deferred();let stopReady=false,homeReady=false;
 const t=await movingTask(profile,async record=>{
  if(record.kind==='task-route-stop'){stopReady=true;await stop.promise;}
  if(record.kind==='home-route'){homeReady=true;await home.promise;}
 });const {f,start,before}=t,taskId=before.workers[0].taskId,actor=before.workers[0].id;
 try{
  for(let i=0;i<16&&!stopReady;i++){f.advance();await f.present();}
  await untilProduction(f,()=>stopReady);
  const waiting=f.snapshot(),stopRecord=f.records.find(r=>r.kind==='task-route-stop');
  assert(waiting.time>=profile.end);assert.equal(stopRecord.committed,false);
  assert.equal(waiting.workers[0].status,'walking');assert.equal(waiting.workers[0].nativeRouteAdmission,'native-task');
  assert.equal(waiting.workers[0].taskId,taskId);assert.equal(waiting.tasks.find(t=>t.id===taskId).workerId,actor);
  const stoppedOwner=stopRecord.resources.nativeStop.routes.find(r=>r.nativeRoute.actorId===start.resources.actorId);
  assert.equal(stoppedOwner.bodyId,start.resources.bodyId);
  f.command({kind:'pause',reason:'task-stop-proof'});const paused=f.snapshot();f.advance();assert.deepEqual(pose(f.snapshot().workers[0]),pose(paused.workers[0]));
  assert.equal(f.snapshot().elapsed,paused.elapsed);f.command({kind:'resume',reason:'task-stop-proof'});
  for(let i=0;i<3;i++){f.advance();await f.present();}
  const later=f.snapshot();assert.notDeepEqual(pose(later.workers[0]),pose(waiting.workers[0]));
  assert.equal(later.workers[0].taskId,taskId);assert.equal(later.tasks.find(t=>t.id===taskId).workerId,actor);
  assert.equal(f.records.filter(r=>r.kind==='home-route').length,0);
  stop.resolve();await untilProduction(f,()=>homeReady);
  assert.equal(stopRecord.committed,true);const held=f.snapshot(),worker=held.workers[0];
  assert.equal(worker.status,'returning');assert.equal(worker.nativeRouteAdmission,'pending-home-resources');
  assert.equal(worker.taskId,null);assert.equal(held.tasks.find(t=>t.id===taskId).workerId,null);
  const homeRecord=f.records.find(r=>r.kind==='home-route');assert.equal(homeRecord.resources.bodyId,start.resources.bodyId);
  for(let i=0;i<3;i++){f.advance();await f.present();}
  assert.deepEqual(pose(f.snapshot().workers[0]),pose(worker));
  home.resolve();await untilProduction(f,()=>homeRecord.committed);
  for(let i=0;i<250&&!f.records.some(r=>r.kind==='home-arrival');i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='home-arrival'&&r.committed));
  assert.equal(f.snapshot().workers[0].status,'home');
  assert.deepEqual(f.records.filter(r=>r.committed).map(r=>r.kind),['initial-idle-body','task-start','task-route-stop','home-route','home-arrival']);
  assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{stop.resolve();home.resolve();await t.close();}
});

test('a rejected Task25 preparation never publishes Task25 or Home and fails closed',async()=>{
 const ready=deferred();let stopReady=false;
 const t=await movingTask(PROFILES.find(p=>p.id==='youngMale'),async r=>{if(r.kind==='task-route-stop'){stopReady=true;await ready.promise;throw Error('deliberate Task25 READY rejection');}});
 try{
  for(let i=0;i<16&&!stopReady;i++){t.f.advance();await t.f.present();}await untilProduction(t.f,()=>stopReady);
  const state=t.f.snapshot();assert.equal(state.workers[0].taskId,t.before.workers[0].taskId);
  assert.equal(state.workers[0].nativeRouteAdmission,'native-task');assert.equal(state.tasks.find(t=>t.id===state.workers[0].taskId).workerId,state.workers[0].id);
  ready.resolve();
  for(let i=0;i<200&&t.f.authority.nativeIntentProductionStatus().phase!=='failed';i++)await t.f.present();
  assert.equal(t.f.authority.nativeIntentProductionStatus().phase,'failed');
  assert.equal(t.f.records.filter(r=>r.kind==='task-route-stop'&&r.committed).length,0);assert.equal(t.f.records.filter(r=>r.kind==='home-route').length,0);
  assert.throws(()=>t.f.snapshot(),/deliberate Task25 READY rejection/);
 }finally{ready.resolve();await t.close();}
});

for(const {endpointFirst,gate} of [{endpointFirst:false},{endpointFirst:true},
 {endpointFirst:false,gate:{lead:.4,stopped:true}},{endpointFirst:true,gate:{lead:2,stopped:false}}])
test(`terminal Task25 presents the stopped body before resuming Home18 (${gate?(gate.stopped?'opening gate':'settled gate'):endpointFirst?'endpoint first':'hold first'})`,{timeout:30000},async()=>{
 const ready=deferred(),stopReady=deferred();let pending,proposedStop,stop,replacement,attached=false;
 const ports=new MessageChannel();
 const t=await movingTask(PROFILES.find(p=>p.id==='youngMale'),record=>{
  if(record.kind==='home-route'&&!pending){pending=record;return ready.promise;}
  if(gate&&record.kind==='task-route-stop'){proposedStop=record;return stopReady.promise;}
 },true,(_record,data)=>{stop??=data.nativeTaskRouteStopBinding;},gate);
 const {f}=t;
 try{
  if(gate){
   assert.equal(t.start.resources.gates.length,1);
   for(let i=0;i<45&&!proposedStop;i++){f.advance(.025);await f.present();}
   await untilProduction(f,()=>proposedStop);
   const waiting=f.snapshot(),opening=waiting.structures.find(row=>row.id==='structure-1000000').gateOpen;
   assert.equal(waiting.workers[0].nativeRouteAdmission,'native-task');
   assert.equal(proposedStop.committed,false);
   assert.equal(proposedStop.resources.nativeStop.gates.length,gate.stopped?1:0);
   assert(gate.stopped?opening>0&&opening<1:opening===1);
   f.advance(.025);await f.present();
   stopReady.resolve();
  }
  for(let i=0;i<18&&!pending;i++){f.advance(.025);await f.present();}
  await untilProduction(f,()=>pending&&f.host.inspect().nativeRouteFrame?.bindings.some(row=>
   row.nativeStopped?.kind==='native-task-route-stopped-body'));
  const cut=f.snapshot(),worker=cut.workers[0],bindings=f.host.inspect().nativeRouteFrame.bindings;
  const old=bindings.find(row=>row.nativeStopped?.kind==='native-task-route-stopped-body');
  const oldMotor=bindings.find(row=>row.nativeStopped?.kind==='native-task-route-stopped-gate');
  if(gate){
   assert.equal(!!oldMotor,gate.stopped);
   const opening=cut.structures.find(row=>row.id==='structure-1000000').gateOpen;
   if(gate.stopped){
    assert(opening>0&&opening<1);
    assert.equal(oldMotor.opening,Math.fround(opening));
    assert.deepEqual(oldMotor.worldBoundary,stop.reference.worldBoundary);
   }else{
    assert.equal(opening,1);
    assert(bindings.some(row=>row.nativeGate?.gateId===1000000));
   }
  }
  assert.equal(worker.nativeRouteAdmission,'pending-home-resources');
  assert.equal(pending.committed,false);
  const retire=()=>{f.gpu.device.destroy();f.retireResourceEndpoint();ready.resolve();};
  if(endpointFirst){retire();await untilProduction(f,()=>f.authority.nativeIntentProductionStatus().last?.status==='cancelled');}
  const holding=f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  if(!endpointFirst)retire();
  const hold=await holding;
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
  const terminal=await f.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true});
  assert(terminal.terminal&&terminal.callbacksSettled&&pending.aborted&&!pending.committed);
  const route=await f.authority.terminalWorkerRoute();
  assert.deepEqual(route,{kind:25,actorId:pending.resources.nativeHome.actorId});
  replacement=await fixture({capabilities:{nativeTaskRouteStopVersion:1,nativeTaskRouteStopClockVersion:1,nativeTaskRouteStopGateVersion:1,nativeHomeRouteVersion:1,nativeHomeArrivalVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  await assert.rejects(f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,{...route,actorId:199}),
   /Expected current native recovery assignments/);
  const {recoveredWorkerRoute:{resources,execution}}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  const {client,host,pipeline}=replacement,proof=execution.binding,ref=proof.reference;
  assert.deepEqual(resources.stoppedHomeBinding.proof,stop);
  assert.deepEqual(proof.request,pending.resources.nativeHome.sourceRequest);
  assert.deepEqual(resources.taskTemplate.rows,t.start.resources.rows);
  if(gate)assert.equal(resources.taskTemplate.gates.length,1);
  assert.equal(ref.bodyId,old.bodyReference.bodyId);
  assert.equal(ref.epoch,old.epoch);
  const wrongHome=structuredClone(resources);
  wrongHome.stoppedHomeBinding.request.pose.x+=.01;
  assert.throws(()=>copyTask25HomeResources(wrongHome),/pending Home pose/);
  const wrongTable=structuredClone(resources);
  wrongTable.taskTemplate.nativeStart=structuredClone({...wrongTable.taskTemplate.nativeStart,bodyId:2});
  assert.throws(()=>copyTask25HomeResources(wrongTable),/task start presentation/);

  const buffer=client.device.createBuffer({size:40,usage:72});
  client.device.queue.writeBuffer(buffer,0,new Float32Array(10));
  const motorBuffer=oldMotor?client.device.createBuffer({size:4,usage:72}):null;
  if(motorBuffer){
   const {nativeStopped,semantic,epoch,stopField}=oldMotor;
   const binding={nativeStopped,semantic,epoch,stopField,byteOffset:0};
   client.device.queue.writeBuffer(motorBuffer,0,new Float32Array([0]));
   assert.throws(()=>copyNativeStoppedClock({...binding,nativeStopped:{...nativeStopped,kind:'native-farm-arrival-stopped-gate'}}),/Invalid native stopped gate/);
   assert.throws(()=>copyNativeStoppedClock({...binding,nativeStopped:{...nativeStopped,mechanism:42}}),/Invalid native stopped gate/);
   client.registerClockBinding(motorBuffer,binding);
  }
  const group=includeMotor=>client.device.createBindGroup({entries:[buffer,...(includeMotor&&motorBuffer?[motorBuffer]:[])]
   .map((buffer,binding)=>({binding,resource:{buffer}}))});
  const clock={nativeStopped:ref.selector,epoch:ref.epoch,resourceEnd:Number.MAX_SAFE_INTEGER};
  client.registerClockBinding(buffer,{...clock,byteOffset:0,semantic:'relative'});
  function frame(includeMotor=true){
   client.beginFrame({nativeWorldBoundary:ref.worldBoundary,
    clock:{...f.clock,elapsed:cut.elapsed,safeUntil:cut.elapsed,paused:true,segments:[]}});
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,group(includeMotor));pass.draw(3);pass.end();client.device.queue.submit([encoder.finish()]);
   return client.endFrame();
  }
  await assert.rejects(frame(),/Replacement requires its bound worker clock/);
  for(const [i,stopField] of stopFields.entries())client.registerClockBinding(buffer,{...clock,byteOffset:(i+1)*4,semantic:'stop-value',stopField});
  if(oldMotor)await assert.rejects(frame(false),/Replacement requires its bound worker clock/);
  const drawing=frame();drawing.catch(()=>{});await flush();await host.idle();
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted worker route/);
  host.present();await drawing;
  const witness=await f.authority.checkHeldDraw(30,hold,route);
  assert.deepEqual(witness.projection,old.projection);
  assert.equal(witness.relativeTime,floorFloat32(cut.elapsed-ref.epoch));
  const pick=captureNativeRoutePickFrame(host.inspect()).getStoppedBody(ref.selector,ref.epoch);
  assert.equal(pick.x,Math.fround(worker.x));
  assert.equal(pick.walkPhase,Math.fround(worker.walkPhase));
  assert(recoveredStoppedGateSamplesMatch(witness.stoppedGates??[],proof));
  if(oldMotor){
   assert.equal(captureNativeRoutePickFrame(host.inspect()).getStoppedGate(oldMotor.nativeStopped,oldMotor.epoch).opening,oldMotor.opening);
   const next=frame(false);next.catch(()=>{});await flush();await host.idle();host.present();await next;
   await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted worker route/);
   const complete=frame();complete.catch(()=>{});await flush();await host.idle();host.present();await complete;
   assert(recoveredStoppedGateSamplesMatch((await f.authority.checkHeldDraw(30,hold,route)).stoppedGates,proof));
  }

  await f.attachRecoveredResources(replacement);attached=true;
  assert(f.authority.resumeNativeIntentProduction(hold));
  await untilProduction(f,()=>f.records.some(record=>record.kind==='home-route'&&record.committed));
  const home=f.records.find(record=>record.kind==='home-route'&&record.committed);
  assert(home.resources.worldBoundary.ticket>pending.resources.worldBoundary.ticket);
  assert.equal(home.resources.bodyId,ref.bodyId);
  assert.deepEqual(home.resources.nativeHome.sourceRequest,proof.request);
  for(let i=0;i<250&&!f.records.some(record=>record.kind==='home-arrival');i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.some(record=>record.kind==='home-arrival'&&record.committed));
  const final=f.snapshot(),matches=final.workers.filter(item=>item.id===worker.id);
  assert.equal(matches.length,1);assert.equal(matches[0].status,'home');
  assert.deepEqual(final.ledger,cut.ledger);
  assert.deepEqual(f.faults,[]);
 }finally{
  ready.resolve();stopReady.resolve();
  try{await t.close();}finally{
   if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}
   ports.port1.close();ports.port2.close();
  }
 }
});
