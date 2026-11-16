import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './helpers/native-initial-idle-request.js';
import {restoreNativeActionGame} from './helpers/native-task-action-restoration.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {tick} from '../src/simulation/game.js';
import {notifyWorkerPlanningChange} from '../src/simulation/tasks.js';
import {PROFILES} from '../src/simulation/workforce.js';

for(const mode of [null,'rest','watch'])test(`Game declares and projects the actual initial Idle source (${mode??'uninitialized'})`,()=>{
 const f=nativeInitialIdleRequestFixture({mode});try{
  const before=structuredClone(f.worker),body=f.body(1),rng=f.state.rng,result=f.planner.requestNativeInitialIdleResources(f.state,f.worker);
  assert.equal(result.status,'requested');assert.deepEqual(result.request.idleState,before.idleState);assert.equal(f.worker.nativeRouteAdmission,'pending-idle-resources');assert.deepEqual({...f.worker,nativeRouteAdmission:undefined},{...before,nativeRouteAdmission:undefined});
  assert.deepEqual(f.planner.projectNativeInitialIdleRequest(f.state,f.worker),result.request);notifyWorkerPlanningChange(f.state,f.worker);assert.equal(f.worker.nativeRouteAdmission,'pending-idle-resources');f.planner.flushTaskEvents();assert.deepEqual(f.planner.requestNativeInitialIdleResources(f.state,f.worker).request,result.request);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
  const json=serialize(f.state);assert.equal(json.includes('native-initial-idle-request-reference'),false);assert.deepEqual(deserialize(json).workers[0],f.worker);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
 }finally{f.close();}
});

test('initial declaration uses the supplied real heading and the original zero phase defaults only after native acceptance',()=>{
 const f=nativeInitialIdleRequestFixture({mode:null});try{
  for(const key of ['heading','runPhase','walkPhase','carryPhase'])delete f.worker[key];const before=structuredClone(f.worker),sequence=f.w.nav_intent_transition_sequence();
  assert.throws(()=>f.planner.requestNativeInitialIdleResources(f.state,f.worker),/Idle pose/);assert.deepEqual(f.worker,before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  const result=f.planner.requestNativeInitialIdleResources(f.state,f.worker,{yaw:-1.75});assert.equal(result.request.pose.yaw,-1.75);assert.equal(f.worker.heading,-1.75);for(const key of ['runPhase','walkPhase','carryPhase'])assert.equal(f.worker[key],0);assert.equal(f.worker.idleState,null);
 }finally{f.close();}
});

test('an unbound declaration grants no body reference and gains one fresh sequence on its first exact binding',()=>{
 const f=nativeInitialIdleRequestFixture({bound:false});try{
  assert.equal(f.planner.requestNativeInitialIdleResources(f.state,f.worker).request,null);const sequence=f.w.nav_intent_transition_sequence(),before=structuredClone(f.worker);
  assert.equal(f.planner.projectNativeInitialIdleRequest(f.state,f.worker),null);assert.equal(f.planner.requestNativeInitialIdleResources(f.state,f.worker).request,null);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.spatial_body_count(),0);
  assert.throws(()=>tick(f.state,.1,{intentTaskPlanner:f.planner}),/requires prepared execution admission/);assert.deepEqual(f.worker,before);
  f.bind();const request=f.planner.projectNativeInitialIdleRequest(f.state,f.worker);assert(request);assert(request.requestSequence>sequence);assert.equal(request.bodyId,1);
 }finally{f.close();}
});

test('a native physical rejection leaves missing pose fields and Game ownership untouched',()=>{
 const f=nativeInitialIdleRequestFixture({mode:null});try{
  for(const key of ['heading','runPhase','walkPhase','carryPhase'])delete f.worker[key];
  const before=structuredClone(f.worker),sequence=f.w.nav_intent_transition_sequence();assert.equal(f.w.spatial_body_upsert(1,f.worker.x,f.worker.z,.28,0,3),1);
  assert.throws(()=>f.planner.requestNativeInitialIdleResources(f.state,f.worker,{yaw:.85}),/declaration rejected/);assert.deepEqual(f.worker,before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);
 }finally{f.close();}
});

test('the existing control observer receives the declaration after Game has adopted its pending source',()=>{
 const f=nativeInitialIdleRequestFixture({mode:null});try{
  const seen=[],closed=[],detach=f.planner.observeNativeIntentControl({onBaseline(){},onChanges:changes=>{assert.equal(f.worker.nativeRouteAdmission,'pending-idle-resources');assert(f.planner.projectNativeInitialIdleRequest(f.state,f.worker));seen.push(...changes);},onClosed:reason=>closed.push(reason)});
  try{f.planner.requestNativeInitialIdleResources(f.state,f.worker);assert.deepEqual(seen,[]);f.planner.flushNativeIntentControl();assert.equal(seen.length,1);assert.equal(seen[0].state,6);assert.equal(seen[0].taskId,null);assert.deepEqual(closed,[]);}finally{detach();}
 }finally{f.close();}
});

test('cold declaration restoration precedes all physical binding in the new native session',()=>{
 const f=nativeInitialIdleRequestFixture({bound:false});try{
  f.planner.requestNativeInitialIdleResources(f.state,f.worker);const old=f.w.nav_intent_session(),saved=deserialize(serialize(f.state)),result=f.planner.resetFromState(saved);assert.deepEqual(result.restoredInitialIdleIds,[f.worker.id]);assert.notEqual(f.w.nav_intent_session(),old);assert.equal(f.w.spatial_body_count(),0);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);
  assert.equal(f.w.spatial_body_upsert(1,saved.workers[0].x,saved.workers[0].z,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(f.actor,1),1);assert(f.planner.projectNativeInitialIdleRequest(saved,saved.workers[0]));assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);
 }finally{f.close();}
});

for(const profile of PROFILES)test(`a fresh load restores initial ${profile.id} semantics, never an old physical or graphical permission`,()=>{
 const source=nativeInitialIdleRequestFixture({profile:profile.id,mode:'watch'});let saved,old;try{old=source.planner.requestNativeInitialIdleResources(source.state,source.worker).request;saved=deserialize(serialize(source.state));}finally{source.close();}
 const f=restoreNativeActionGame(saved,{admitPeer:false});try{
  const request=f.planner.projectNativeInitialIdleRequest(f.state,f.worker);assert(request);assert.notEqual(request.authorityEpoch,old.authorityEpoch);assert.equal(request.workerProfile,profile.id);assert.deepEqual(request.pose,old.pose);assert.deepEqual(request.idleState,old.idleState);assert.deepEqual(f.worker,saved.workers[0]);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
  const before=serialize(f.state),body=f.body(1);assert.throws(()=>tick(f.state,.1,f.nav),/requires prepared execution admission/);assert.equal(serialize(f.state),before);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeGameExecutionState(),-1);
 }finally{f.close();}
});

test('legacy stationary Idle remains undeclared on load',()=>{
 const source=nativeInitialIdleRequestFixture();let saved;try{saved=deserialize(serialize(source.state));}finally{source.close();}
 const f=restoreNativeActionGame(saved,{admitPeer:false});try{assert.equal(f.worker.nativeRouteAdmission,undefined);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.equal(f.planner.projectNativeInitialIdleRequest(f.state,f.worker),null);}finally{f.close();}
});

test('projection detects changes to the retained semantic pose, policy, assignment and owning state',()=>{
 const f=nativeInitialIdleRequestFixture();try{
  f.planner.requestNativeInitialIdleResources(f.state,f.worker);const saved=structuredClone(f.worker);
  for(const mutate of [w=>w.x+=.1,w=>w.heading+=.1,w=>w.runPhase+=1,w=>w.runRemaining-=1,w=>w.idleState.rng^=1,w=>w.idleState.remaining+=1,w=>w.profile='olderFemale',w=>w.taskId='task-999999',w=>w.path=[]]){
   mutate(f.worker);assert.throws(()=>f.planner.projectNativeInitialIdleRequest(f.state,f.worker),/Idle/);Object.assign(f.worker,structuredClone(saved));
  }
  assert.throws(()=>f.planner.projectNativeInitialIdleRequest(structuredClone(f.state),f.worker),/another game/);assert.throws(()=>f.planner.requestNativeInitialIdleResources(structuredClone(f.state),f.worker),/another game/);assert(f.planner.projectNativeInitialIdleRequest(f.state,f.worker));
 }finally{f.close();}
});

test('invalid initial declarations and snapshots fail before changing the actor or native session',()=>{
 const f=nativeInitialIdleRequestFixture();try{
  const saved=structuredClone(f.worker),sequence=f.w.nav_intent_transition_sequence();
  for(const mutate of [w=>w.status='walking',w=>w.taskId='task-999999',w=>w.crateId='crate-999999',w=>w.idleState.mode='walk',w=>w.idleState.rng=-1,w=>w.running=true,w=>w.running=7,w=>w.gateWaiting=true,w=>w.runRemaining=-1,w=>w.heading=NaN,w=>w.nativeRouteAdmission='native-home']){
   mutate(f.worker);const before=structuredClone(f.worker);assert.throws(()=>f.planner.requestNativeInitialIdleResources(f.state,f.worker),/Idle/);assert.deepEqual(f.worker,before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);Object.assign(f.worker,structuredClone(saved));delete f.worker.nativeRouteAdmission;
  }
  f.planner.requestNativeInitialIdleResources(f.state,f.worker);const valid=serialize(f.state);
  for(const mutate of [w=>w.runPhase=undefined,w=>w.idleState.mode='walk',w=>w.idleState.remaining=-1,w=>w.running=true,w=>w.nativeTaskAction={}]){const state=JSON.parse(valid);mutate(state.workers[0]);assert.throws(()=>serialize(state));}
 }finally{f.close();}
});

test('restoration preflight preserves the existing session and consumers on invalid semantics or a reused physical world',()=>{
 for(const bound of [false,true]){
  const f=nativeInitialIdleRequestFixture({bound});try{
   f.planner.requestNativeInitialIdleResources(f.state,f.worker);const session=f.w.nav_intent_session(),sequence=f.w.nav_intent_transition_sequence(),closed=[];
   const detach=f.planner.observeNativeIntentControl({onBaseline(){},onChanges(){},onClosed:reason=>closed.push(reason)});
   try{const invalid=structuredClone(f.state);invalid.workers[0].idleState.mode='walk';assert.throws(()=>f.planner.resetFromState(invalid));if(bound)assert.throws(()=>f.planner.resetFromState(structuredClone(f.state)),/fresh physical world/);assert.equal(f.w.nav_intent_session(),session);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(closed,[]);if(!bound)f.bind();assert(f.planner.projectNativeInitialIdleRequest(f.state,f.worker));}finally{detach();}
  }finally{f.close();}
 }
});
