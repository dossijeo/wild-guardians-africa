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
import {nativeHomeRequestContinuesIdleCycle,nativeHomeRequestContinuesInitialIdle} from '../src/world/native-home-request-reference.js';
import {serialize} from '../src/persistence/snapshots.js';
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
   if(gate.count===2){
    state.structures.push({...state.structures.at(-1),id:'structure-1000001',created:29208,z:11.1});
    state.nextId=1000002;
   }
   entry.entry={x:-14,z:4.6};
   chunkKeys=[...Array.from({length:9},(_,i)=>[i%3-1,Math.floor(i/3)-1].join(',')),'2,-1','2,0','2,1'];
  }else entry.entry=source.point(-9,0);
  const point=gate?{x:-14,z:gate.count===2?13.4:11.8}:source.point(-4,6),target=createPlant(`plant-${state.nextId++}`,'mijo',point.x,point.z,worker.centerId);
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

test('a watering action acquired before shift end settles to the same native body and goes home',async()=>{
 const profile=PROFILES.find(p=>p.id==='youngMale');
 const source=nativeIdleCycleGameFixture({mode:'rest',remaining:5,profile:profile.id,peer:false});
 const holdHome=deferred();
 let f,home,idle,action;
 try{
  const state=structuredClone(source.state),worker=state.workers[0];
  state.time=profile.end-3;
  state.villages.find(v=>v.id===worker.villageId).entry=source.point(-9,0);
  const crop=state.plants[0],position=source.point(-3,0);
  Object.assign(crop,position);
  crop.water[0].status='due';
  f=await nativeProductionAuthority(state,{nativeWorkerLifecycle:true,onCommit(record,data){
   if(record.kind==='task-action')action=data.nativeTaskActionBinding;
   if(record.resources.nativeInitialIdleBody?.wateringSource)idle=data.nativeInitialIdleBodyBinding;
  },onReady(record){
   if(record.kind==='home-route'){home=record;return holdHome.promise;}
  }});
  const advance=async()=>{
   f.advance(.05);
   await f.present();await flush();
  };
  const completedWatering=()=>f.records.find(record=>record.kind==='initial-idle-body'&&record.resources.nativeInitialIdleBody.wateringSource);
  for(let i=0;i<180&&!completedWatering();i++)await advance();
  await untilProduction(f,()=>completedWatering()?.committed);
  assert(action&&idle);
  assert(state.time+action.reference.worldBoundary.effectiveTime-state.elapsed<profile.end);
  const published=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true}),stationary=JSON.parse(published.snapshot);
  assert(stationary.time>=profile.end);
  assert.equal(stationary.workers[0].nativeRouteAdmission,'native-idle');
  assert.equal(published.saveAvailable,false);
  assert.throws(()=>serialize(stationary),/Invalid native initial Idle declaration/);
  assert.equal(stationary.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===crop.id).length,1);
  assert.equal(idle.reference.bodyId,action.reference.request.bodyId);
  const currentPose=pose(stationary.workers[0]);
  await untilProduction(f,()=>f.host.inspect().nativeRouteFrame?.worldBoundary?.ticket===idle.reference.worldBoundary.ticket);
  assert(f.host.inspect().nativeRouteFrame.bindings.some(binding=>binding.nativeInitialIdleBody?.bodyId===idle.reference.bodyId));
  await advance();
  await untilProduction(f,()=>home?.packet);
  const current=f.snapshot();
  assert.equal(current.workers[0].nativeRouteAdmission,'pending-home-resources');
  assert.deepEqual(pose(current.workers[0]),currentPose);
  assert.equal(home.resources.bodyId,idle.reference.bodyId);
  assert(nativeHomeRequestContinuesInitialIdle(home.resources.sourceRequest,idle.reference.sourceRequest));
  assert(!f.records.slice(f.records.indexOf(completedWatering())+1).some(record=>record.kind==='idle-cycle'));
  holdHome.resolve();
  await untilProduction(f,()=>home.committed);
  const arrival=()=>f.records.find(record=>record.kind==='home-arrival');
  for(let i=0;i<180&&!arrival();i++)await advance();
  await untilProduction(f,()=>arrival()?.committed);
  await untilProduction(f,()=>f.host.inspect().nativeRouteFrame?.worldBoundary?.ticket>home.resources.worldBoundary.ticket&&!f.host.inspect().nativeRouteFrame.bindings.length);
  assert.equal(f.snapshot().workers[0].status,'home');
  assert.equal(f.snapshot().events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===crop.id).length,1);
  assert.deepEqual(f.faults,[]);
 }finally{holdHome.resolve();await f?.close();source.close();}
});

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

for(const kind of ['initial-idle-body','idle-cycle'])test(`shift end cancels a retained Task14 READY and returns from the stationary ${kind} owner`,async()=>{
 const profile=PROFILES.find(p=>p.id==='youngMale');
 const source=nativeIdleCycleGameFixture({mode:'rest',remaining:5,profile:profile.id,peer:false});
 const taskReady=deferred(),homeReady=deferred();
 let f,pending,home,initial,cycle;
 try{
  const state=structuredClone(source.state),worker=state.workers[0];
  state.time=profile.end-.45;
  state.villages.find(v=>v.id===worker.villageId).entry=source.point(-9,0);
  const point=source.point(-4,6),target=createPlant(`plant-${state.nextId++}`,'mijo',point.x,point.z,worker.centerId);
  target.growth=999999;
  for(const water of target.water)water.status='manual';
  state.plants.push(target);
  f=await nativeProductionAuthority(state,{onCommit:(_record,data)=>{
   initial??=data.nativeInitialIdleBodyBinding;
   cycle??=data.nativeIdleCycleBinding;
  },onReady:async record=>{
   if(record.kind==='task-start'){pending=record;await taskReady.promise;}
   if(record.kind==='home-route'&&!home){home=record;await homeReady.promise;}
  }});
  await untilProduction(f,()=>f.records.some(r=>r.kind===kind&&r.committed));
  assert.equal(f.command({kind:'harvest',id:'harvest-with-late-task-ready',targetId:target.id}).value,true);
  for(let i=0;i<5&&!pending;i++){f.advance(.025);await f.present();}
  await untilProduction(f,()=>pending);
  const before=f.snapshot(),assigned=before.workers[0],taskId=assigned.taskId;
  assert(before.time<profile.end);
  assert.equal(assigned.nativeRouteAdmission,'pending-resources');
  assert.equal(before.tasks.find(row=>row.id===taskId)?.workerId,worker.id);
  assert.equal(pending.committed,false);
  for(let i=0;i<20&&f.snapshot().time<profile.end;i++){
   const current=f.snapshot();
   f.command({kind:'advance',seconds:Math.min(.025,profile.end-current.time),steps:1,nightFastForward:false});
   await f.present();
  }
  const expired=f.snapshot(),held=expired.workers[0];
  assert.equal(expired.time,profile.end);
  assert.equal(held.nativeRouteAdmission,'pending-home-resources');
  assert.deepEqual(pose(held),pose(assigned));
  assert.equal(held.runRemaining,assigned.runRemaining);
  assert.equal(held.taskId,null);
  assert.equal(expired.tasks.find(row=>row.id===taskId)?.workerId,null);
  assert.deepEqual(expired.ledger,before.ledger);
  const cancelled=assert.rejects(pending.packet.presented);
  taskReady.resolve();
  await cancelled;
  await untilProduction(f,()=>home);
  assert.equal(pending.aborted,true);
  assert.equal(home.resources.bodyId,pending.resources.bodyId);
  if(kind==='idle-cycle')assert(nativeHomeRequestContinuesIdleCycle(home.resources.sourceRequest,cycle));
  else{
   assert.equal(cycle,undefined);
   assert(nativeHomeRequestContinuesInitialIdle(home.resources.sourceRequest,initial.reference.sourceRequest));
  }
  f.advance(.05);
  assert.deepEqual(pose(f.snapshot().workers[0]),pose(assigned));
  homeReady.resolve();
  await untilProduction(f,()=>home.committed);
  for(let i=0;i<120&&!f.records.some(r=>r.kind==='home-arrival');i++){f.advance(.15);await f.present();}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='home-arrival'&&r.committed));
  assert.equal(f.snapshot().workers[0].status,'home');
  assert(f.records.every(r=>!r.committed||!['task-start','task-action','task-route-stop'].includes(r.kind)));
  assert.deepEqual(f.faults,[]);
  assert.deepEqual(f.errors,[]);
 }finally{taskReady.resolve();homeReady.resolve();await f?.close();source.close();}
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

for(const {name,endpointFirst=false,gate} of [
 {name:'hold first'},{name:'endpoint first',endpointFirst:true},
 {name:'opening gate',gate:{lead:.4,count:1,opening:true}},
 {name:'settled gate',endpointFirst:true,gate:{lead:2,count:1,opening:false}},
 {name:'opening and future gates',gate:{lead:.4,count:2,opening:true}},
 {name:'settled and future gates',endpointFirst:true,gate:{lead:2,count:2,opening:false}}
])
test(`terminal Task25 presents the stopped body before resuming Home18 (${name})`,{timeout:30000},async()=>{
 const ready=deferred(),stopReady=deferred();let pending,proposedStop,stop,replacement,attached=false;
 const ports=new MessageChannel();
 const t=await movingTask(PROFILES.find(p=>p.id==='youngMale'),record=>{
  if(record.kind==='home-route'&&!pending){pending=record;return ready.promise;}
  if(gate&&record.kind==='task-route-stop'){proposedStop=record;return stopReady.promise;}
 },true,(_record,data)=>{stop??=data.nativeTaskRouteStopBinding;},gate);
 const {f}=t;
 try{
  if(gate){
   assert.deepEqual(t.start.resources.gates.map(row=>row.gateId),gate.count===2?[1000000,1000001]:[1000000]);
   for(let i=0;i<45&&!proposedStop;i++){f.advance(.025);await f.present();}
   await untilProduction(f,()=>proposedStop);
   const waiting=f.snapshot(),opening=waiting.structures.find(row=>row.id==='structure-1000000').gateOpen;
   assert.equal(waiting.workers[0].nativeRouteAdmission,'native-task');
   assert.equal(proposedStop.committed,false);
   const expectedIds=[...(gate.opening?[1000000]:[]),...(gate.count===2?[1000001]:[])];
   assert.deepEqual(proposedStop.resources.nativeStop.gates.map(row=>row.gateId),expectedIds);
   assert(gate.opening?opening>0&&opening<1:opening===1);
   f.advance(.025);await f.present();
   stopReady.resolve();
  }
  for(let i=0;i<18&&!pending;i++){f.advance(.025);await f.present();}
  await untilProduction(f,()=>pending&&f.host.inspect().nativeRouteFrame?.bindings.some(row=>
   row.nativeStopped?.kind==='native-task-route-stopped-body'));
  const cut=f.snapshot(),worker=cut.workers[0],bindings=f.host.inspect().nativeRouteFrame.bindings;
  const old=bindings.find(row=>row.nativeStopped?.kind==='native-task-route-stopped-body');
  const oldMotors=bindings.filter(row=>row.nativeStopped?.kind==='native-task-route-stopped-gate');
  if(gate){
   assert.deepEqual(oldMotors.map(row=>row.nativeStopped.gateId),stop.reference.gates.map(row=>row.gateId));
   const opening=cut.structures.find(row=>row.id==='structure-1000000').gateOpen;
   if(gate.opening)assert(opening>0&&opening<1);
   else{
    assert.equal(opening,1);
    assert(bindings.some(row=>row.nativeGate?.gateId===1000000));
   }
   if(gate.count===2)assert.equal(cut.structures.find(row=>row.id==='structure-1000001').gateOpen,0);
   for(const motor of oldMotors){
    const wall=cut.structures.find(row=>row.id===`structure-${motor.nativeStopped.gateId}`);
    assert.equal(motor.opening,Math.fround(wall.gateOpen));
    assert.deepEqual(motor.worldBoundary,stop.reference.worldBoundary);
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
  assert.deepEqual(resources.taskTemplate.gates,t.start.resources.gates);
  if(gate&&!gate.opening){
   assert.deepEqual(proof.settledGates,[{gateId:1000000,mechanism:t.start.resources.gates[0].mechanism,opening:1}]);
   const changed=structuredClone(resources);
   changed.stoppedHomeBinding.settledGates[0].opening=.5;
   assert.throws(()=>copyTask25HomeResources(changed),/lost its admitted Task table/);
  }
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
  const motorBuffers=oldMotors.map(({nativeStopped,semantic,epoch,stopField})=>{
   const motorBuffer=client.device.createBuffer({size:4,usage:72});
   const binding={nativeStopped,semantic,epoch,stopField,byteOffset:0};
   client.device.queue.writeBuffer(motorBuffer,0,new Float32Array([0]));
   assert.throws(()=>copyNativeStoppedClock({...binding,nativeStopped:{...nativeStopped,kind:'native-farm-arrival-stopped-gate'}}),/Invalid native stopped gate/);
   assert.throws(()=>copyNativeStoppedClock({...binding,nativeStopped:{...nativeStopped,mechanism:42}}),/Invalid native stopped gate/);
   client.registerClockBinding(motorBuffer,binding);
   return {id:nativeStopped.gateId,buffer:motorBuffer};
  });
  const group=omittedGate=>client.device.createBindGroup({entries:[buffer,...motorBuffers.filter(motor=>motor.id!==omittedGate).map(motor=>motor.buffer)]
   .map((buffer,binding)=>({binding,resource:{buffer}}))});
  const clock={nativeStopped:ref.selector,epoch:ref.epoch,resourceEnd:Number.MAX_SAFE_INTEGER};
  client.registerClockBinding(buffer,{...clock,byteOffset:0,semantic:'relative'});
  function frame(omittedGate=null){
   client.beginFrame({nativeWorldBoundary:ref.worldBoundary,
    clock:{...f.clock,elapsed:cut.elapsed,safeUntil:cut.elapsed,paused:true,segments:[]}});
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,group(omittedGate));pass.draw(3);pass.end();client.device.queue.submit([encoder.finish()]);
   return client.endFrame();
  }
  await assert.rejects(frame(),/Replacement requires its bound worker clock/);
  for(const [i,stopField] of stopFields.entries())client.registerClockBinding(buffer,{...clock,byteOffset:(i+1)*4,semantic:'stop-value',stopField});
  for(const {id} of motorBuffers)await assert.rejects(frame(id),/Replacement requires its bound worker clock/);
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
  const pickFrame=captureNativeRoutePickFrame(host.inspect());
  for(const motor of oldMotors){
   assert.equal(pickFrame.getStoppedGate(motor.nativeStopped,motor.epoch).opening,motor.opening);
   const next=frame(motor.nativeStopped.gateId);next.catch(()=>{});await flush();await host.idle();host.present();await next;
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
