import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './helpers/native-initial-idle-request.js';
import {copyNativeInitialIdleRequestReference,sameNativeInitialIdleRequestReference} from '../src/world/native-initial-idle-request-reference.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createPlant} from '../src/simulation/crops.js';
import {emit} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';
import {updateIdle} from '../src/simulation/idle.js';

for(const mode of [null,'rest','watch'])test(`initial Idle declares its exact semantic source without a fabricated route or delivery (${mode??'uninitialized'})`,()=>{
 const f=nativeInitialIdleRequestFixture({mode});try{
  const before=structuredClone(f.state),body=f.body(1);assert.equal(f.w.nav_initial_idle_request_version(),1);assert.equal(f.w.nav_intent_request_initial_idle(...f.args()),1);const ref=f.planner.nativeInitialIdleRequestReference(f.actor);assert(ref);assert.deepEqual(ref.idleState,f.worker.idleState);assert.equal(ref.bodyId,1);assert.equal(ref.pose.x,f.worker.x);assert.equal(ref.pose.z,f.worker.z);for(const k of ['runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(ref.pose[k],f.worker[k]);assert.equal(ref.pose.yaw,f.worker.heading);assert.deepEqual(f.state,before);assert.deepEqual(f.body(1),body);
  assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert.equal(f.planner.nativeTaskConsequenceBinding(f.actor),null);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.equal(f.planner.pendingTaskRoute(f.actor),null);assert.deepEqual(f.planner.nativeInitialIdleRequestReferences(),[ref]);assert.equal(f.w.nav_intent_route_points(f.actor),-1);
  assert(Object.isFrozen(ref));assert(Object.isFrozen(ref.pose));if(mode)assert(Object.isFrozen(ref.idleState));assert.throws(()=>copyNativeInitialIdleRequestReference({...ref,sourceCarry:{}}),/initial native Idle/);assert.throws(()=>copyNativeInitialIdleRequestReference({...ref,idleState:{...ref.idleState,mode:'walk'}}),/Idle semantic/);
  const sequence=ref.requestSequence;assert.equal(f.w.nav_intent_request_initial_idle(...f.args()),1);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor).requestSequence,sequence);const changed=f.args();changed[9]+=.5;assert.equal(f.w.nav_intent_request_initial_idle(...changed),-3);assert(sameNativeInitialIdleRequestReference(ref,f.planner.nativeInitialIdleRequestReference(f.actor)));assert.equal(f.w.nav_intent_finish(f.actor),0);
 }finally{f.close();}
});

test('an unbound declaration has no usable source; first exact binding establishes its new birth',()=>{
 const f=nativeInitialIdleRequestFixture({bound:false});try{
  assert.equal(f.w.nav_intent_request_initial_idle(...f.args()),1);const declaration=f.planner.intentChanges().find(e=>e.actorId===f.actor);assert(declaration);assert.equal(declaration.state,6);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.deepEqual(f.planner.nativeInitialIdleRequestReferences(),[]);
  assert.equal(f.w.spatial_body_upsert(77,f.worker.x+1,f.worker.z,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(f.actor,77),0);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.equal(f.w.spatial_body_upsert(78,f.worker.x,f.worker.z,.28,0,3),1);assert.equal(f.w.nav_gate_bind_worker(f.actor,78),0);assert.equal(f.w.spatial_body_upsert(79,f.worker.x,f.worker.z,2.1,0,1),1);assert.equal(f.w.nav_gate_bind_worker(f.actor,79),0);f.bind();const ref=f.planner.nativeInitialIdleRequestReference(f.actor);assert(ref);assert(ref.requestSequence>declaration.sequence);assert.equal(ref.bodyId,1);const sequence=ref.requestSequence;assert.equal(f.w.nav_gate_bind_worker(f.actor,1),1);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor).requestSequence,sequence);assert.equal(f.w.nav_gate_bind_worker(f.actor,77),0);
 }finally{f.close();}
});

for(const profile of ['olderMale','olderFemale','youngMale','youngFemale'])test(`initial Idle retains the original semantic profile and watch stream (${profile})`,()=>{
 const f=nativeInitialIdleRequestFixture({mode:'watch',profile});try{assert.equal(f.w.nav_intent_request_initial_idle(...f.args()),1);const ref=f.planner.nativeInitialIdleRequestReference(f.actor);assert.equal(ref.workerProfile,profile);assert.deepEqual(ref.idleState,f.worker.idleState);assert.equal(ref.idleState.rng,0xfabcde98);assert.equal(ref.pose.runRemaining,40);}finally{f.close();}
});

test('the declaration preserves an actual legacy rest-to-watch transition and its private random stream',()=>{
 const f=nativeInitialIdleRequestFixture({mode:null});try{
  const anchor={id:`farm-${f.worker.centerId}`,x:f.worker.x,z:f.worker.z},rng=f.state.rng,nav={version:1,path(){throw Error('Rest/watch must not request a route');}};
  for(let i=0;i<10000&&f.worker.idleState?.mode!=='watch';i++){updateIdle(f.worker,anchor,.1,nav,f.state.seed);f.state.elapsed+=.1;}
  assert.equal(f.worker.idleState.mode,'watch');const semantic=structuredClone(f.worker.idleState),body=f.body(1);assert.equal(f.w.nav_intent_set_time(f.state.elapsed),1);assert.equal(f.w.nav_intent_request_initial_idle(...f.args()),1);const ref=f.planner.nativeInitialIdleRequestReference(f.actor);assert.deepEqual(ref.idleState,semantic);assert.equal(ref.requestedAt,f.state.elapsed);assert.equal(f.state.rng,rng);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('initial Idle birth preserves another prepared TaskStart candidate for exact native revalidation',()=>{
 const f=nativeInitialIdleRequestFixture({peer:true,declareRequest:false,admitPeer:false});try{
  const body=f.body(1),peer=f.body(3),old=f.peerProposal;assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.equal(f.w.nav_intent_request_initial_idle(...f.args()),1);const ref=f.planner.nativeInitialIdleRequestReference(f.actor);assert(ref);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const next=f.planner.revalidateNativeTaskStartProposal(old.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameFloat32Motion);assert.deepEqual(f.body(1),body);assert.deepEqual(f.body(3),peer);
  assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);const tuple=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));assert.equal(f.w.nav_task_start_proposal_commit_bound(...tuple.slice(0,5),old.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');f.advance(.25);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.planner.nativeInitialIdleRequestReference(f.actor),ref);
 }finally{f.close();}
});

for(const threaded of [false,true])test(`pending initial Idle holds one body while the existing native TaskStart peer advances (${threaded?'pthread':'standalone'})`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeInitialIdleRequestFixture({peer:true,...(runtime?{core:runtime.core}:{})});const ref=f.planner.nativeInitialIdleRequestReference(f.actor),body=f.body(1),peer=f.body(3),semantics=structuredClone(f.worker.idleState),rng=f.state.rng;assert(f.peerBinding);f.advance(.5);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.planner.nativeInitialIdleRequestReference(f.actor),ref);assert.deepEqual(f.worker.idleState,semantics);assert.equal(f.state.rng,rng);assert.equal(f.planner.nativeGameExecutionState(),-1);assert.equal(f.planner.nativeCausalClock().committedThrough,f.state.elapsed);
 }finally{f?.close();await runtime?.dispose();}
});

test('initial semantic declarations reject unsupported walking, malformed policy fields and actors already owning tasks',()=>{
 const f=nativeInitialIdleRequestFixture();try{
  for(const [index,value] of [[1,4],[1,.5],[2,3],[3,-1],[4,-1],[5,4294967296],[6,4],[7,0],[8,-1],[9,NaN],[10,-1]]){const args=f.args();args[index]=value;assert.equal(f.w.nav_intent_request_initial_idle(...args),-1);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);}
  const missing=f.args();missing[0]=999999;assert.equal(f.w.nav_intent_request_initial_idle(...missing),0);
 }finally{f.close();}
 const peer=nativeInitialIdleRequestFixture({peer:true});try{const args=peer.args();args[0]=900012;assert.equal(peer.w.nav_intent_request_initial_idle(...args),-2);assert.equal(peer.planner.nativeInitialIdleRequestReference(900012),null);assert(peer.planner.nativeTaskStartBinding(900012));}finally{peer.close();}
});

test('the existing body fence and removal/reset revoke the initial source without granting inactivity',()=>{
 for(const reset of [false,true]){const f=nativeInitialIdleRequestFixture();try{assert.equal(f.w.nav_intent_request_initial_idle(...f.args()),1);const ref=f.planner.nativeInitialIdleRequestReference(f.actor),body=f.body(1);assert.equal(f.w.spatial_body_upsert(1,body.x+1,body.z,body.radius,0,1),0);assert.equal(f.w.spatial_body_upsert(1,body.x,body.z,body.radius,0,3),0);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),false);if(reset)f.w.spatial_bodies_reset();else assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.deepEqual(f.planner.nativeInitialIdleRequestReferences(),[]);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),false);assert.equal(ref.bodyId,1);
 }finally{f.close();}}
});

test('a genuine task can replace the initial request only as pending prepared resources on the same body',()=>{
 const f=nativeInitialIdleRequestFixture();try{
  assert.equal(f.w.nav_intent_request_initial_idle(...f.args()),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const ref=f.planner.nativeInitialIdleRequestReference(f.actor),body=f.body(1),session=f.w.nav_intent_session();
  const p=f.point(6,0),target=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);target.growth=999999;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});enqueue(f.state,f.worker.centerId,'harvest',target.id);f.planner.flushWorldEvents();f.planner.flushTaskEvents();const first=f.planner.planIfNeeded(f.state.elapsed);assert.equal(first.filter(p=>p.status===1).length,1);assert.throws(()=>f.planner.commitTaskBatchToState(f.state,first,{navVersion:1}),/became stale/);assert.deepEqual(f.planner.nativeInitialIdleRequestReference(f.actor),ref);assert.equal(f.w.nav_intent_session(),session);assert.equal(f.worker.status,'idle');assert.deepEqual(f.body(1),body);
  const next=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,next,{navVersion:1,pendingResources:true}),1);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.equal(f.worker.status,'waiting-task');assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);assert(f.planner.pendingTaskRoute(f.actor));assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);
 }finally{f.close();}
});
