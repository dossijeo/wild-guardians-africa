import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivedTaskFixture as fixture} from './helpers/native-farm-arrived-task.js';
import {nativeFarmArrivedHomeFixture as homeFixture} from './helpers/native-farm-arrived-home.js';
import {nativeFarmArrivedIdleCycleFixture as idleFixture} from './helpers/native-farm-arrived-idle-cycle.js';
import {nativeFarmMovingTaskFixture} from './helpers/native-farm-moving-task.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick,emit} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {enqueue} from '../src/simulation/tasks.js';
import {nativeHomeRequestContinuesCompletedFarmArrival} from '../src/world/native-home-request-reference.js';

async function core(threaded){if(!threaded)return null;const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');return createThreadedSpatialWorld(factory);}
function queueHarvest(f){const p=f.point(6,0),crop=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);crop.growth=999999;crop.harvestRequested=true;crop.water=[];f.state.plants.push(crop);emit(f.state,'CropPlaced',{targetId:crop.id});enqueue(f.state,f.worker.centerId,'harvest',crop.id);return crop;}

// Source/Game integration with actual standalone/pthread execution. Source
// fixtures acquire the trusted ABI; they do not manufacture a GPU receipt.
for(const threaded of [false,true])for(const profile of PROFILES)for(const inside of [false,true])test(`${threaded?'pthread':'standalone'} ${profile.id} ${inside?'zero-distance':'travelled'} Farm23 completion remains arriving while Game advances its native cohort`,async()=>{
 let runtime,f;try{
  runtime=await core(threaded);f=fixture({core:runtime?.core,profile:profile.id,inside});const worker=structuredClone(f.worker),body=f.body(1),count=f.w.spatial_body_count(),rng=f.state.rng,at=f.state.elapsed,peer=f.body(3),peerArrived=f.planner.nativeTaskExecution(f.state.workers[1].id).arrived;
  assert.equal(f.planner.nativeGameExecutionState(),1);tick(f.state,.1,f.nav);assert.equal(f.state.elapsed,at+.1);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);assert.equal(f.worker.status,'arriving');assert.equal(f.worker.idleState,null);assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);
  if(peerArrived)assert.deepEqual(f.body(3),peer);else assert.notDeepEqual(f.body(3),peer);const current=f.planner.nativeFarmArrivalRouteExecution(f.actor);assert.equal(current.executedThrough,f.state.elapsed);assert.equal(current.arrived,true);assert.equal(current.currentSpeed,0);assert.deepEqual(current.binding,f.farmBinding);
 }finally{f?.close();await runtime?.dispose();}
});

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} Game claims genuine work from completed23 and holds its body until14`,async()=>{
 let runtime,f;try{
  runtime=await core(threaded);f=fixture({core:runtime?.core,profile:profile.id,inside:true});const crop=queueHarvest(f),body=f.body(1),count=f.w.spatial_body_count(),rng=f.state.rng,ledger=structuredClone(f.state.ledger);
  tick(f.state,.1,f.nav);const task=f.state.tasks.find(t=>t.targetId===crop.id);assert.equal(task.workerId,f.worker.id);assert.equal(f.worker.taskId,task.id);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.status,'waiting-task');assert.equal(f.worker.idleState,null);assert.equal(f.worker.path,null);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);assert.equal(crop.alive,true);assert.equal(f.state.rng,rng);assert.deepEqual(f.state.ledger,ledger);
  const request=f.planner.pendingTaskRoute(f.actor);assert(request);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.pendingTaskRoute(f.actor),request);assert.equal(crop.alive,true);
  const p=f.prepareTask(request);assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.planner.reconcileWorkerRoutes(f.state,{navVersion:f.nav.version});tick(f.state,.1,f.nav);assert(f.planner.nativeTaskStartBinding(f.actor));assert.equal(f.w.spatial_body_count(),count);assert.equal(crop.alive,true);assert.deepEqual(f.state.ledger,ledger);
 }finally{f?.close();await runtime?.dispose();}
});

for(const threaded of [false,true])for(const profile of PROFILES)for(const expiry of ['day','hour'])test(`${threaded?'pthread':'standalone'} ${profile.id} completed Farm chooses real Home on ${expiry} expiry before claiming queued work`,async()=>{
 let runtime,f;try{
  runtime=await core(threaded);f=homeFixture({core:runtime?.core,profile:profile.id,inside:true,peer:false});const crop=queueHarvest(f),body=f.body(1),count=f.w.spatial_body_count(),ledger=structuredClone(f.state.ledger),rng=f.state.rng;
  if(expiry==='day')f.worker.contractDay--;else f.state.time=profile.end-.05;
  tick(f.state,.1,f.nav);const request=f.planner.nativeHomeRequestReference(f.actor);assert(request);assert(nativeHomeRequestContinuesCompletedFarmArrival(request,f.source));assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.status,'returning');assert.equal(f.worker.idleState,null);assert.equal(f.worker.taskId,null);assert.equal(f.state.tasks.find(t=>t.targetId===crop.id).workerId,null);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);assert.deepEqual(f.state.ledger,ledger);
  const p=f.prepareHome();f.commitHome(p);assert(f.planner.projectNativeHomeExecution(f.state,f.worker));tick(f.state,.1,f.nav);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.equal(f.w.spatial_body_count(),count);
 }finally{f?.close();await runtime?.dispose();}
});

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} Game waits for genuine Idle21 acquisition after completed23`,async()=>{
 let runtime,f;try{
  runtime=await core(threaded);f=idleFixture({core:runtime?.core,profile:profile.id});const before=structuredClone(f.worker),body=f.body(1),rng=f.state.rng;
  tick(f.state,.1,f.nav);assert.deepEqual(f.worker,before);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);const at=f.state.elapsed,p=f.prepare();f.commitIdle(p);assert.equal(f.state.elapsed,at);assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.deepEqual(f.worker.idleState,{...f.birth});assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);tick(f.state,.1,f.nav);assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.equal(f.planner.nativeIdleCycleExecution(f.actor).executedThrough,f.state.elapsed);
 }finally{f?.close();await runtime?.dispose();}
});

test('an unfinished Farm route still rejects Game before either body or time advances',()=>{
 const f=nativeFarmMovingTaskFixture({stop:false});try{const worker=structuredClone(f.worker),bodies=[f.body(1),f.body(3)],at=f.state.elapsed;assert.equal(f.planner.nativeGameExecutionState(),-1);assert.throws(()=>tick(f.state,.1,f.nav),/intention class/);assert.equal(f.state.elapsed,at);assert.deepEqual(f.worker,worker);assert.deepEqual([f.body(1),f.body(3)],bodies);}finally{f.close();}
});

for(const cause of ['retired','changed-center'])test(`completed Farm marker cannot authorize Game with ${cause} source`,()=>{
 const f=fixture({inside:true});try{if(cause==='retired'){assert.equal(f.w.nav_intent_retire_actor(f.actor),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');}else f.state.structures.find(s=>s.id===f.worker.centerId).x+=.2;const worker=structuredClone(f.worker),bodies=[f.body(1),f.body(3)],at=f.state.elapsed;assert.throws(()=>tick(f.state,.1,f.nav),/native|Native|unsupported/i);assert.equal(f.state.elapsed,at);assert.deepEqual(f.worker,worker);assert.deepEqual([f.body(1),f.body(3)],bodies);}finally{f.close();}
});
