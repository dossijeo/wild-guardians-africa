import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleArrivalFixture} from './helpers/native-idle-arrival.js';
import {createPlant} from '../src/simulation/crops.js';
import {emit} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {nativeTaskStartReferenceFromProposal} from '../src/world/native-task-start-reference.js';
import {nativeIdleCycleBodyState} from '../src/world/native-idle-cycle-body-source.js';

function arrivedRest(options={}){
 const f=nativeIdleArrivalFixture(options);
 try{f.arrive();const p=f.prepareRest(),idleLease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),idleBinding=f.commitRest(p);return {...f,idleLease,idleBinding};}catch(error){f.close();throw error;}
}
function planTask(f){
 const p=f.point(6,0),target=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);target.growth=999999;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});enqueue(f.state,f.worker.centerId,'harvest',target.id);f.planner.flushWorldEvents();f.planner.flushTaskEvents();return f.planner.planIfNeeded(f.state.elapsed);
}
function requestTask(f){
 const plan=planTask(f);assert.equal(plan.filter(p=>p.status===1).length,1);assert.equal(f.planner.commitTaskBatchToState(f.state,plan,{navVersion:1,pendingResources:true}),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');return f.planner.pendingTaskRoute(f.actor);
}
function options(f){return {bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase};}
function prepare(f,request){const p=f.planner.prepareNativeTaskStartProposal(request,options(f));assert.equal(p.status,'proposed',JSON.stringify(p));return p.proposal;}

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} TaskStart acquires the actual post-stroll body and phases`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=arrivedRest({profile:profile.id,core:runtime?.core});const body=f.body(1),rng=f.state.rng,held=f.idleBinding,q=nativeIdleCycleBodyState(held.reference.sourceBody);assert.equal(q.kind,'native-idle-stroll-arrival-source');assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);
  const request=requestTask(f);assert(request);assert(request.requestSequence>held.cycleSequence);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);assert(f.idleLease.isCurrent());assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');
  for(const key of ['runPhase','walkPhase','carryPhase','runRemaining']){const bad={...options(f),[key]:options(f)[key]+1};assert.notEqual(f.planner.prepareNativeTaskStartProposal(request,bad).status,'proposed',key);}
  const p=prepare(f,request),ref=nativeTaskStartReferenceFromProposal(p),lease=f.c.admitStart(ref,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());f.advance(.2);assert.deepEqual(f.body(1),body);assert(f.idleLease.isCurrent());
  const refreshed=f.planner.revalidateNativeTaskStartProposal(p.ticket);assert.equal(refreshed.status,'revalidated');assert(refreshed.timeTranslation.sameFloat32Motion);assert.equal(f.planner.cancelNativeTaskStartProposal(refreshed.proposal.ticket),true);assert.deepEqual(f.body(1),body);assert(f.idleLease.isCurrent());
  const next=prepare(f,request),prepared=nativeTaskStartReferenceFromProposal(next),nextLease=f.c.admitStart(prepared,{preparingWorldBoundary:next.worldBoundary});assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),next.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const binding=f.planner.nativeTaskStartBinding(f.actor);assert.deepEqual(binding.preparedReference,prepared);assert.equal(f.c.installStartedRoutes(binding.reference.worldBoundary,[binding]),1);assert(nextLease.isCurrent());assert(!f.idleLease.isCurrent());assert.deepEqual(f.body(1),body);f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});assert.equal(f.worker.nativeRouteAdmission,'native-task');f.advance(.2);assert.notDeepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);
 }finally{f?.close();await runtime?.dispose();}
});

test('legacy immediate task planning cannot discard the actual arrived Idle owner',()=>{
 const f=arrivedRest();try{const binding=f.idleBinding,body=f.body(1),plan=planTask(f);assert.equal(plan.filter(p=>p.status===1).length,1);assert.throws(()=>f.planner.commitTaskBatchToState(f.state,plan,{navVersion:1}),/became stale/);assert.deepEqual(f.planner.nativeIdleCycleBinding(f.actor),binding);assert.deepEqual(f.body(1),body);assert(f.idleLease.isCurrent());const next=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,next,{navVersion:1,pendingResources:true}),1);assert(f.planner.pendingTaskRoute(f.actor));}finally{f.close();}
});
