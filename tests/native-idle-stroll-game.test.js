import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollGameFixture} from './helpers/native-idle-stroll-game.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick} from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState,deserializeConfirmedState,prepareConfirmedStateTransport,confirmedStateSaveAvailable} from '../src/simulation/confirmed-live-state.js';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {strollAdmissionProtocol} from './helpers/native-idle-stroll-admission.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

for(const profile of PROFILES)test(`${profile.id} Game writeback adopts actual stroll pose and private WALK without a JS mover`,()=>{
 const f=nativeIdleStrollGameFixture({profile:profile.id});try{
  const rng=f.state.rng,before=structuredClone(f.worker),body=f.body(1),binding=f.commitStroll();assert.deepEqual(f.worker,before);let actual=f.planner.projectNativeIdleStroll(f.state,f.worker);assert.deepEqual(actual.binding,binding);assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert.equal(f.worker.idleState.mode,'walk');assert.equal(f.worker.idleState.elapsed,0);assert.equal(f.worker.idleState.rng,binding.reference.walkRng);assert.equal(f.worker.path,null);assert.deepEqual(f.body(1),body);assert.equal(f.planner.projectNativeIdleCycle(f.state,f.worker),null);assert.equal(f.planner.projectNativeInitialIdleBody(f.state,f.worker),null);
  f.advance(.2);actual=f.planner.projectNativeIdleStroll(f.state,f.worker);for(const key of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(f.worker[key],actual.pose[key]);assert.equal(f.worker.heading,actual.pose.yaw);assert.equal(f.worker.idleState.approachRetry,actual.walkState.approachRetry);assert.equal(actual.executedThrough,f.state.elapsed);assert.notDeepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.equal(f.worker.running,false);assert.equal(f.worker.gateWaiting,false);const idle=f.worker.idleState;f.planner.projectNativeIdleStroll(f.state,f.worker);assert.equal(f.worker.idleState,idle);
 }finally{f.close();}
});

test('arrival writeback keeps WALK and its private RNG while the native REST is only a blueprint',()=>{
 const f=nativeIdleStrollGameFixture();try{
  f.commitStroll();f.planner.projectNativeIdleStroll(f.state,f.worker);f.advance(f.proposal.endTime-f.state.elapsed+.2);const actual=f.planner.projectNativeIdleStroll(f.state,f.worker),sequence=f.w.nav_intent_transition_sequence(),body=f.body(1),idle=f.worker.idleState;assert(actual.arrived);assert.equal(actual.desiredRest.mode,'rest');assert.notEqual(actual.desiredRest.rng,idle.rng);assert.equal(idle.mode,'walk');assert.equal(idle.elapsed,0);assert.equal(idle.rng,f.proposal.nativeIdleStroll.walkRng);f.advance(.3);f.planner.projectNativeIdleStroll(f.state,f.worker);assert.equal(f.worker.idleState,idle);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
 }finally{f.close();}
});

test('stroll writeback rejects another Game, watermark, source pose and substituted live intent',()=>{
 const f=nativeIdleStrollGameFixture();try{
  f.commitStroll();assert.throws(()=>f.planner.projectNativeIdleStroll(structuredClone(f.state),f.worker),/another game/);const original=structuredClone(f.worker),at=f.state.elapsed;f.state.elapsed+=.1;assert.throws(()=>f.planner.projectNativeIdleStroll(f.state,f.worker),/executed game boundary/);f.state.elapsed=at;f.worker.x+=.1;assert.throws(()=>f.planner.projectNativeIdleStroll(f.state,f.worker),/executed game boundary/);f.worker.x=original.x;assert.deepEqual(f.worker,original);f.planner.projectNativeIdleStroll(f.state,f.worker);const rng=f.worker.idleState.rng;f.worker.idleState.rng=(rng^1)>>>0;assert.throws(()=>f.planner.projectNativeIdleStroll(f.state,f.worker),/native owner/);f.worker.idleState.rng=rng;f.worker.idleState.destination.x+=1;assert.throws(()=>f.planner.projectNativeIdleStroll(f.state,f.worker),/native owner/);
 }finally{f.close();}
});

test('live transport and semantic save accept actual stroll values while ordinary UI saving remains closed',()=>{
 const f=nativeIdleStrollGameFixture();try{
  assert(confirmedStateSaveAvailable(f.state));f.commitStroll();f.planner.projectNativeIdleStroll(f.state,f.worker);f.advance(.1);f.planner.projectNativeIdleStroll(f.state,f.worker);const encoded=serializeConfirmedState(f.state),restored=deserializeConfirmedState(encoded);assert.deepEqual(restored.workers[0],f.worker);assert.equal(prepareConfirmedStateTransport(f.state).snapshot,encoded);assert(!encoded.includes('native-idle-stroll-attestation'));assert(!encoded.includes('expectedRouteHandle'));assert.equal(confirmedStateSaveAvailable(f.state),false);assert.deepEqual(JSON.parse(serialize(f.state)).workers[0],f.worker);
  for(const mutate of [w=>{w.path=[];},w=>{w.idleState.mode='rest';},w=>{w.idleState.rng=-1;},w=>{w.idleState.binding={};},w=>{w.destinationId=null;}]){const bad=structuredClone(f.state);mutate(bad.workers[0]);assert.throws(()=>serializeConfirmedState(bad),/stroll/);}
 }finally{f.close();}
});

test('Game requires its prepared-stop capability before crossing the live stroll contract edge',()=>{
 const f=nativeIdleStrollGameFixture({peer:false});try{
  f.commitStroll();f.planner.projectNativeIdleStroll(f.state,f.worker);assert.equal(f.planner.nativeGameExecutionState(),1);const before=f.body(1),rng=f.state.rng;tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),before);assert.equal(f.state.rng,rng);f.state.time=PROFILES.find(p=>p.id===f.worker.profile).end-.05;const body=f.body(1),at=f.state.elapsed,worker=structuredClone(f.worker);const unsupported={...f.nav,intentTaskPlanner:{...f.planner,nativeIdleStrollStopRequest:undefined}};assert.throws(()=>tick(f.state,.1,unsupported),/unsupported return boundary/);assert.equal(f.state.elapsed,at);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert.equal(f.planner.nativeIdleStrollStopRequest(f.actor).reason,'home');assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
 }finally{f.close();}
});

test('losing the native stroll owner cannot fall back to legacy Game movement',()=>{
 const f=nativeIdleStrollGameFixture();try{
  f.commitStroll();f.planner.projectNativeIdleStroll(f.state,f.worker);assert.equal(f.w.nav_intent_retire_actor(f.actor),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(f.planner.projectNativeIdleStroll(f.state,f.worker),null);const at=f.state.elapsed,worker=structuredClone(f.worker),lost={...f.nav,intentTaskPlanner:{nativeGameExecutionState:()=>0,projectNativeIdleStroll:()=>null}};assert.throws(()=>tick(f.state,.1,lost),/stroll has no current body owner/);assert.equal(f.state.elapsed,at);assert.deepEqual(f.worker,worker);
 }finally{f.close();}
});

test('the prepared transaction writes Game only after its actual native stroll acquisition',async()=>{
 const f=controlledNativeIdleStroll();let p;try{
  const previous=structuredClone(f.worker);p=await strollAdmissionProtocol(f,{onPrepare(){assert.deepEqual(f.worker,previous);f.advance(.2);},onDrain(){assert.deepEqual(f.worker,previous);f.advance(.1);},onCommit(){assert.deepEqual(f.worker,previous);}});const result=await p.run();assert.equal(result.status,'committed',JSON.stringify(result));assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert.equal(f.worker.idleState.rng,result.nativeIdleStrollBinding.reference.walkRng);assert.equal(f.worker.heading,f.planner.nativeIdleStrollExecution(f.actor).pose.yaw);assert.deepEqual(p.errors,[]);
 }finally{await p?.close();f.close();}
});

test('pthread stroll writeback reads the same executed pose and retains the terminal WALK',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');const runtime=await createThreadedSpatialWorld(factory);let f;try{
  f=nativeIdleStrollGameFixture({core:runtime.core});f.commitStroll();f.planner.projectNativeIdleStroll(f.state,f.worker);f.advance(.2);const view=f.planner.projectNativeIdleStroll(f.state,f.worker);assert.equal(f.worker.x,view.pose.x);assert.equal(f.worker.z,view.pose.z);assert.equal(f.worker.idleState.mode,'walk');assert.equal(f.planner.nativeGameExecutionState(),1);
 }finally{f?.close();await runtime.dispose();}
});
