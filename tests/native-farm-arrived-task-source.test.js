import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivedTaskFixture as fixture} from './helpers/native-farm-arrived-task.js';
import {nativeFarmMovingTaskFixture} from './helpers/native-farm-moving-task.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {nativeTaskStartReferenceFromProposal} from '../src/world/native-task-start-reference.js';
import {createPlant} from '../src/simulation/crops.js';
import {emit,tick} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';

for(const threaded of [false,true])for(const profile of PROFILES)for(const inside of [false,true])test(`${threaded?'pthread':'standalone'} ${profile.id} ${inside?'inside service radius':'travelled'}: arrived Farm23 seeds actual Task6/14 on its original body without24`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,inside,core:runtime?.core});
  const source=f.source,body=f.body(1),peer=f.body(3),count=f.w.spatial_body_count(),rng=f.state.rng,events=f.events.length;
  const peerArrived=f.planner.nativeTaskExecution(f.state.workers[1].id).arrived;
  const request=f.requestTask();assert(request);assert.equal(f.worker.status,'waiting-task');assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.idleState,null);
  assert(request.requestSequence>source.nativeRoute.assignmentSequence);assert(request.requestedAt>=source.binding.reference.endTime);assert.deepEqual(f.body(1),body);assert.equal(f.w.spatial_body_count(),count);
  const changes=f.events.slice(events).filter(e=>e.actorId===f.actor);
  assert.equal(changes.length,1);assert.equal(changes[0].type,'RouteInvalidated');assert.equal(changes[0].state,6);assert.deepEqual(changes[0].revokedRouteHandle,source.nativeRoute.routeHandle);
  assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeSuspendedGateRoute(f.actor),null);
  for(const field of ['runPhase','walkPhase','carryPhase','runRemaining'])assert.notEqual(f.planner.prepareNativeTaskStartProposal(request,{...f.policy(),[field]:f.policy()[field]+.25}).status,'proposed',field);
  const proposed=f.prepareTask(),reference=nativeTaskStartReferenceFromProposal(proposed);assert.equal(reference.bodyId,source.bodyId);
  f.advance(.3);assert.deepEqual(f.body(1),body);if(peerArrived)assert.deepEqual(f.body(3),peer);else assert.notDeepEqual(f.body(3),peer);
  const fresh=f.planner.revalidateNativeTaskStartProposal(proposed.ticket);assert.equal(fresh.status,'revalidated');assert(fresh.timeTranslation.sameFloat32Motion);assert.equal(f.planner.cancelNativeTaskStartProposal(fresh.proposal.ticket),true);assert.deepEqual(f.planner.pendingTaskRoute(f.actor),request);assert.deepEqual(f.body(1),body);
  const next=f.prepareTask();assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),next.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});
  assert.equal(f.worker.nativeRouteAdmission,'native-task');assert.deepEqual(f.body(1),body);f.advance(.1);assert(f.planner.projectNativeTaskExecution(f.state,f.worker));assert.equal(f.worker.x,f.body(1).x);assert.equal(f.worker.z,f.body(1).z);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);assert.equal(f.worker.idleState,null);
 }finally{f?.close();await runtime?.dispose();}
});

function queuedPlan(f){const p=f.point(6,0),target=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);target.growth=999999;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});enqueue(f.state,f.worker.centerId,'harvest',target.id);f.planner.flushWorldEvents();f.planner.flushTaskEvents();return f.planner.planIfNeeded(f.state.elapsed);}

for(const pendingResources of [false,true])test(`${pendingResources?'moving':'arrived but unprepared'} Farm cannot be replaced by a Task before its required boundary`,()=>{
 const f=pendingResources?nativeFarmMovingTaskFixture({stop:false}):fixture();try{
  const body=f.body(1),source=f.planner.nativeFarmArrivalRouteBinding(f.actor),worker=structuredClone(f.worker),rows=queuedPlan(f),events=f.events.length;assert.equal(rows.filter(r=>r.status===1).length,1);
  assert.throws(()=>f.planner.commitTaskBatchToState(f.state,rows,{navVersion:1,pendingResources}),/became stale/);
  assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.deepEqual(f.planner.nativeFarmArrivalRouteBinding(f.actor),source);assert.equal(f.planner.pendingTaskRoute(f.actor),null);assert.equal(f.events.length,events);
 }finally{f.close();}
});

test('arrived Farm pending Task preserves physical-write protection and removal invalidates its one body',()=>{
 const f=fixture();try{f.requestTask();const body=f.body(1);for(const change of [{x:body.x+.1},{radius:body.radius+.1},{flags:body.flags|2}]){const b={...body,...change};assert.notEqual(f.w.spatial_body_upsert(1,b.x,b.z,b.radius,b.kind,b.flags),1);assert.deepEqual(f.body(1),body);}assert.equal(f.w.spatial_body_remove(1),1);f.planner.commitNativeCausalClock();assert.equal(f.planner.pendingTaskRoute(f.actor),null);assert.equal(f.body(1),null);}finally{f.close();}
});

test('Game advances the actual arrived-Farm Task claim while14 waits, without a JS mover',()=>{
 const f=fixture({inside:true});try{f.requestTask();const body=f.body(1),peer=f.body(3);assert.equal(f.planner.nativeGameExecutionState(),1);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.idleState,null);}finally{f.close();}
});
