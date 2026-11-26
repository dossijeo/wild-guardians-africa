import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollGameFixture} from './helpers/native-idle-stroll-game.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {emit,tick} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {cropBecameInactive} from '../src/simulation/active-crops.js';
import {createIdleState} from '../src/simulation/idle.js';
import {LOCOMOTION} from '../src/simulation/locomotion-calibration.js';
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

for(const threaded of [false,true])for(const outside of [false,true])test(`${threaded?'pthread':'standalone'} a retired crop reanchors an arrived native stroll ${outside?'outside':'inside'} the next radius`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeIdleStrollGameFixture({peer:false,core:runtime?.core});
  const stroll=f.commitStroll();f.planner.projectNativeIdleStroll(f.state,f.worker);
  f.advance(stroll.reference.endTime-f.state.elapsed+.05);
  const arrived=f.planner.projectNativeIdleStroll(f.state,f.worker),old=f.state.plants.find(p=>p.id==='plant-900098');
  assert(arrived.arrived);
  const next=createPlant('plant-900099','mijo',f.worker.x+(outside?4:1),f.worker.z,f.worker.centerId);
  for(const water of next.water)water.status='manual';
  f.state.plants.push(next);emit(f.state,'CropPlaced',{targetId:next.id});f.planner.flushWorldEvents();
  const {idleSeconds,alertSeconds}=LOCOMOTION.sources.find(row=>row.profile===f.worker.profile);
  const initial={...createIdleState(f.worker,{id:`farm-${next.id}`},f.state.seed),approachRetry:0};
  const stage=(sequence=stroll.assignmentSequence,x=next.x)=>f.w.nav_idle_cycle_stroll_reanchor_proposal_stage(f.actor,f.w.nav_intent_session(),sequence,1,900099,x,next.z,3,idleSeconds,alertSeconds,initial.rng);
  assert.equal(stage(),-2,'an acquired Walk keeps its live anchor');
  old.alive=false;cropBecameInactive(f.state.plants);emit(f.state,'CropDestroyed',{targetId:old.id});f.planner.flushWorldEvents();
  assert.equal(stage(stroll.assignmentSequence+1),-2);
  assert.equal(stage(stroll.assignmentSequence,next.x+.25),-2);

  const pose=f.body(1),worker=structuredClone(f.worker),ledger=structuredClone(f.state.ledger),rng=f.state.rng;
  const original=f.prepare(),rest=original.nativeIdleCycle;
  assert.equal(rest.sourceBody.kind,'native-idle-stroll-reanchor-source');
  assert.equal(rest.sourceBody.sourceSequence,stroll.assignmentSequence);
  assert.deepEqual(rest.initialState,initial);
  assert.equal(rest.duration===0,outside);
  assert.deepEqual(f.worker,worker);
  assert.equal(f.planner.cancelNativeIdleCycleProposal(original.ticket),true);
  assert.deepEqual(f.planner.nativeIdleStrollBinding(f.actor),stroll);

  const candidate=f.prepare();f.advance(.1);f.planner.projectNativeIdleStroll(f.state,f.worker);
  const retimed=f.planner.revalidateNativeIdleCycleProposal(candidate.ticket);
  assert.equal(retimed.status,'revalidated');
  assert.equal(retimed.timeTranslation.compatible,true);
  const acquired=f.commit(retimed.proposal);
  assert.equal(acquired.reference.bodyId,stroll.reference.bodyId);
  assert.deepEqual(f.worker.idleState,initial);
  assert.deepEqual(f.body(1),pose);
  if(outside){
   const intent=f.planner.nativeIdleCycleNextRequest(f.actor);
   assert.equal(intent.approach,true);
   assert.deepEqual(intent.idleState.destination,{id:initial.anchorId,x:next.x,z:next.z});
   const proposal=f.planner.prepareNativeIdleStrollProposal(f.actor);
   assert.equal(proposal.status,'proposed');
   assert.equal(proposal.proposal.nativeIdleStroll.bodyId,stroll.reference.bodyId);
   assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),proposal.proposal.ticket.ticket),1);
   assert.equal(f.planner.beginNativeRouteExecution().status,'started');f.planner.commitNativeCausalClock();
   f.planner.projectNativeIdleStroll(f.state,f.worker);
   f.advance(proposal.proposal.endTime-f.state.elapsed+.05);
   assert(f.planner.projectNativeIdleStroll(f.state,f.worker).arrived);
   f.commit();assert.equal(f.worker.idleState.anchorId,initial.anchorId);
   assert.equal(f.worker.idleState.mode,'rest');
  }else{
   f.advance(acquired.reference.watchStartOffset);f.planner.projectNativeIdleCycle(f.state,f.worker);
   assert.equal(f.worker.idleState.mode,'watch');
  }
  assert.deepEqual(f.state.ledger,ledger);assert.equal(f.state.rng,rng);
 }finally{f?.close();await runtime?.dispose();}
});
