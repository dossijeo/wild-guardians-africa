import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeIdleMovingTask} from './helpers/native-idle-moving-task.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeTaskStartReferenceFromProposal} from '../src/world/native-task-start-reference.js';
import {createPlant} from '../src/simulation/crops.js';
import {emit,tick} from '../src/simulation/game.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {enqueue} from '../src/simulation/tasks.js';

function plan(f){const point=f.point(6,0),target=createPlant(`plant-${f.state.nextId++}`,'mijo',point.x,point.z,f.worker.centerId);target.growth=999999;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});enqueue(f.state,f.worker.centerId,'harvest',target.id);f.planner.flushWorldEvents();f.planner.flushTaskEvents();return f.planner.planIfNeeded(f.state.elapsed);}
for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} TaskStart retains the actually stopped22 body and phase source through acquisition`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=controlledNativeIdleMovingTask({profile:profile.id,core:runtime?.core});const body=f.body(1),peer=f.body(3),rng=f.state.rng,count=f.w.spatial_body_count(),source=f.source,events=f.events.length,request=f.requestTask();assert(request);assert(request.requestSequence>source.assignmentSequence);assert(f.heldLease.isCurrent());assert(!f.legacyHeldLease.isCurrent());assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);assert.equal(f.w.spatial_body_count(),count);
  assert.equal(f.planner.nativeIdleStrollHeldExecution(f.actor),null);assert.equal(f.planner.nativeIdleStrollExecution(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeSuspendedGateRoute(f.actor),null);assert(f.events.slice(events).filter(e=>e.actorId===f.actor).every(e=>e.type==='IntentChanged'&&e.state===6),'claim must not retire its graphical held source');
  for(const field of ['runPhase','walkPhase','carryPhase','runRemaining'])assert.notEqual(f.planner.prepareNativeTaskStartProposal(request,{...f.policy(),[field]:f.policy()[field]+1}).status,'proposed',field);
  const p=f.prepareTask(),ref=nativeTaskStartReferenceFromProposal(p),lease=f.c.admitStart(ref,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());assert.throws(()=>f.c.admitStart({...ref,bodyId:2},{preparingWorldBoundary:p.worldBoundary}),/obsolete/);f.advance(source.sourceReference.endTime-f.state.elapsed+.2);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert(f.heldLease.isCurrent());assert.equal(f.heldLease.value('yaw'),source.pose.yaw);
  const refreshed=f.planner.revalidateNativeTaskStartProposal(p.ticket);assert.equal(refreshed.status,'revalidated');assert(refreshed.timeTranslation.sameFloat32Motion);assert.equal(f.planner.cancelNativeTaskStartProposal(refreshed.proposal.ticket),true);assert(f.heldLease.isCurrent());assert.deepEqual(f.planner.pendingTaskRoute(f.actor),request);
  const next=f.prepareTask(),prepared=nativeTaskStartReferenceFromProposal(next),nextLease=f.c.admitStart(prepared,{preparingWorldBoundary:next.worldBoundary});assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),next.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const binding=f.planner.nativeTaskStartBinding(f.actor),bad=structuredClone(binding);bad.reference.bodyId=bad.preparedReference.bodyId=2;assert.throws(()=>f.c.installStartedRoutes(binding.reference.worldBoundary,[bad]),/stopped stroll body/);assert.equal(f.c.installStartedRoutes(binding.reference.worldBoundary,[binding]),1);assert(nextLease.isCurrent());assert(!f.heldLease.isCurrent());assert.deepEqual(f.body(1),body);f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});assert.equal(f.worker.nativeRouteAdmission,'native-task');f.advance(.2);assert.notDeepEqual(f.body(1),body);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);
 }finally{f?.close();await runtime?.dispose();}
});
for(const stop of [false,true])test(`${stop?'suspended':'still moving'}22 cannot discard its owner through immediate task assignment`,()=>{
 const f=controlledNativeIdleMovingTask({stop});try{const body=f.body(1),worker=structuredClone(f.worker),binding=f.planner.nativeIdleStrollBinding(f.actor),rows=plan(f);assert.equal(rows.filter(r=>r.status===1).length,1);assert.throws(()=>f.planner.commitTaskBatchToState(f.state,rows,{navVersion:1}),/became stale/);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeIdleStrollBinding(f.actor),binding);assert(stop?f.heldLease.isCurrent():f.walkLease.isCurrent());if(!stop){const retry=f.planner.planIfNeeded(f.state.elapsed);assert.throws(()=>f.planner.commitTaskBatchToState(f.state,retry,{navVersion:1,pendingResources:true}),/became stale/);assert(f.walkLease.isCurrent());assert.deepEqual(f.worker,worker);}}
 finally{f.close();}
});
test('the pending stopped22 task body rejects physical writes and releases its claim source on removal',()=>{
 const f=controlledNativeIdleMovingTask();try{f.requestTask();const body=f.body(1);for(const change of [{x:body.x+.1},{flags:body.flags|2},{radius:body.radius+.1}]){const b={...body,...change};assert.notEqual(f.w.spatial_body_upsert(1,b.x,b.z,b.radius,b.kind,b.flags),1);assert.deepEqual(f.body(1),body);}assert(['committed','unchanged'].includes(f.planner.commitNativeCausalClock().status));assert(f.heldLease.isCurrent());assert.equal(f.w.spatial_body_remove(1),1);f.planner.commitNativeCausalClock();assert.equal(f.planner.pendingTaskRoute(f.actor),null);assert(!f.heldLease.isCurrent());assert.equal(f.body(1),null);}
 finally{f.close();}
});


test('a delayed eligibility notice uses the recognized native pose and rejects a changed live Game pose before applying it',()=>{
 const f=controlledNativeIdleMovingTask({stop:false});try{
  const source=f.planner.nativeIdleStrollBinding(f.actor),body=f.body(1),x=f.worker.x;f.worker.x+=.1;
  assert.throws(()=>plan(f),/executed Game pose/);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeIdleStrollBinding(f.actor),source);assert(f.walkLease.isCurrent());
  f.worker.x=x;assert(f.planner.flushTaskEvents()>0);const rows=f.planner.planIfNeeded(f.state.elapsed);assert.equal(rows.filter(r=>r.status===1).length,1);assert.throws(()=>f.planner.commitTaskBatchToState(f.state,rows,{navVersion:1,pendingResources:true}),/became stale/);assert(f.walkLease.isCurrent());assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('the existing Game task cohort advances after a stopped22 claim without a JS mover before or after TaskStart',()=>{
 const f=controlledNativeIdleMovingTask({configureState(state){state.structures=state.structures.filter(s=>!s.gate);Object.assign(state,{pauses:[],result:null,initialPreparation:false,raid:null,spells:[],dayPlan:{done:true},nightPlan:{done:true}});if(state.awakenings)state.awakenings.enabled=false;state.tutorial.step='done';for(const p of state.plants)if(p.water[0])p.water[0].status='manual';}});
 try{
  f.requestTask();const nav=createSpatialNavigationMovement(f.session,f.state);nav.intentTaskPlanner=f.planner;const fail=()=>{throw Error('Stopped22 TaskStart must not invoke legacy JS movement or navigation');};nav.path=fail;nav.workerMotionClear=fail;nav.workerRouteClear=fail;
  assert.equal(f.planner.nativeGameExecutionState(),1);const body=f.body(1),peer=f.body(3);tick(f.state,.1,nav);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert(f.heldLease.isCurrent());
  const p=f.prepareTask();assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);f.planner.beginNativeRouteExecution();f.planner.commitNativeCausalClock();const b=f.planner.nativeTaskStartBinding(f.actor);f.c.installStartedRoutes(b.reference.worldBoundary,[b]);f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});assert.equal(f.worker.nativeRouteAdmission,'native-task');tick(f.state,.1,nav);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.x,f.body(1).x);assert.equal(f.worker.z,f.body(1).z);assert(!f.heldLease.isCurrent());
 }finally{f.close();}
});
