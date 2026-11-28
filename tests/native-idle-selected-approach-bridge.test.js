import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedApproachSource} from './helpers/native-idle-selected-approach-source.js';
import {nativeIdleStrollSourceFixture} from './helpers/native-idle-stroll-source.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {copyNativeIdleStrollReference,copyNativeIdleStrollProposal,copyNativeIdleStrollAttestation,copyNativeIdleStrollHeldExecution,nativeIdleStrollContinuesNext,nativeIdleStrollSuccessor} from '../src/world/native-idle-stroll.js';

const ticket=(f,p)=>({kind:'native-idle-stroll-proposal-ticket',authorityEpoch:f.bridge.nativeIdleCycleBinding(f.actor).reference.worldBoundary.authorityEpoch,session:f.q.nativeSession,ticket:p.ticket});
const decode=(f,p)=>f.bridge.captureNativeIdleStrollProposal(ticket(f,p));
// Source integration only. A trusted fixture mirrors the actual ended21 phase
// so the owning bridge can check its current semantic source before preparation.
// This is not Game projection, a GPU receipt or an ordinary producer.
function mirrorCycle(f){const view=f.bridge.nativeIdleCycleExecution(f.actor);assert(view.finished);Object.assign(f.worker,{nativeRouteAdmission:'native-idle',idleState:structuredClone(view.idleState),destinationId:null});return view;}

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} typed selected22 bridge retains actual WALK remaining through acquisition and arrival`,async()=>{
 const f=await selectedApproachSource({threaded,profile:profile.id});try{
  mirrorCycle(f);const current=f.bridge.nativeIdleCycleNextRequest(f.actor),worker=structuredClone(f.worker),body=f.body(1),rng=f.state.rng;
  assert(current.approach);const prepared=f.bridge.prepareNativeIdleStrollProposal(f.actor);assert.equal(prepared.status,'proposed');const p=prepared.proposal,r=p.nativeIdleStroll;
  assert.equal(r.version,2);assert.equal(r.walkRemaining,current.idleState.remaining);assert.notEqual(r.walkRemaining,r.idleSeconds*2);assert.equal(r.sourceRequest,undefined);assert.equal(r.sourceFarm,undefined);assert.equal(r.sourceCycleSequence,current.sourceCycle.cycleSequence);assert(nativeIdleStrollContinuesNext(r,current));assert.deepEqual(copyNativeIdleStrollProposal(structuredClone(p)),p);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);
  assert.equal(f.commit(f.capture()),1);const binding=f.bridge.nativeIdleStrollBinding(f.actor);assert.deepEqual(binding.reference,r);assert.deepEqual(binding.preparedReference,r);assert.deepEqual(copyNativeIdleStrollAttestation(structuredClone(binding)),binding);assert.equal(f.bridge.nativeIdleCycleBinding(f.actor),null);assert.equal(f.bridge.nativeInitialIdleBodyBinding(f.actor),null);assert.deepEqual(f.bridge.nativeIdleStrollBindings(),[binding]);
  const duration=r.endTime-r.worldBoundary.effectiveTime;f.advance(duration/2);const view=f.bridge.nativeIdleStrollExecution(f.actor);assert.equal(view.walkState.remaining,r.walkRemaining);assert.equal(view.walkState.rng,r.walkRng);assert.equal(view.arrived,false);assert.notDeepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,rng);
  f.advance(duration/2+1e-7);const arrived=f.bridge.nativeIdleStrollExecution(f.actor);assert(arrived.arrived);assert.equal(arrived.walkState.remaining,r.walkRemaining);assert.notEqual(arrived.desiredRest.rng,r.walkRng);assert.notEqual(arrived.desiredRest.remaining,r.walkRemaining);
  const a=r.anchor;assert.equal(f.w.nav_idle_cycle_proposal_stage(f.actor,f.q.nativeSession,binding.assignmentSequence,a.kind,a.id,a.x,a.z,a.radius,r.idleSeconds,f.c.alertSeconds),1);const successor=f.tuple();assert.equal(f.w.nav_idle_cycle_source_snapshot(f.actor,successor[1]),1);const raw=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_source_ptr(),26));assert.equal(raw[1],22);assert.equal(raw[23],arrived.desiredRest.remaining);assert.equal(raw[24],arrived.desiredRest.rng);assert.equal(f.w.nav_idle_cycle_proposal_cancel(f.q.nativeSession,successor[1]),1);
 }finally{await f.dispose();}
});

for(const retry of ['watch','rest-end','watch-end'])test(`typed ${retry} selected approach preserves its actual remaining including zero`,async()=>{
 const f=await selectedApproachSource({retry});try{mirrorCycle(f);const n=f.bridge.nativeIdleCycleNextRequest(f.actor),p=f.bridge.prepareNativeIdleStrollProposal(f.actor);assert.equal(p.status,'proposed');const r=p.proposal.nativeIdleStroll;assert.equal(r.walkRemaining,n.idleState.remaining);assert(nativeIdleStrollContinuesNext(r,n));if(retry!=='watch')assert.equal(r.walkRemaining,0);else assert(r.walkRemaining>0);}finally{await f.dispose();}
});

test('selected descriptor rejects absent/foreign scalar, disguised legacy/cold/Farm and widened geometry',async()=>{
 const f=await selectedApproachSource();try{
  const raw=f.stage();assert.equal(raw.status,1);const p=decode(f,raw),r=p.nativeIdleStroll,n=f.bridge.nativeIdleCycleNextRequest(f.actor);assert(nativeIdleStrollContinuesNext(r,n));
  for(const change of [{version:1},{version:3},{walkRemaining:undefined},{walkRemaining:-1},{walkRemaining:Infinity},{walkRemaining:2**128},{sourceCycleSequence:0},{sourceRequest:f.q},{sourceFarm:{}},{approachRetry:0},{destination:{x:r.destination.x+.01,z:r.destination.z}},{pose:{...r.pose,x:r.anchor.x,z:r.anchor.z}}])assert.throws(()=>copyNativeIdleStrollReference({...r,...change}));
  const wrong=copyNativeIdleStrollReference({...r,walkRemaining:r.walkRemaining+.01});assert.equal(nativeIdleStrollContinuesNext(wrong,n),false);assert.equal(nativeIdleStrollSuccessor(r,wrong),false);
  for(const change of [{walkRng:(r.walkRng^1)>>>0},{sourceCycleSequence:r.sourceCycleSequence+1},{sourceDecisionSequence:r.sourceDecisionSequence+1},{requestedAt:r.requestedAt+.01}])assert.equal(nativeIdleStrollContinuesNext({...r,...change},n),false);
  assert.throws(()=>copyNativeIdleStrollProposal({...p,points:new Float32Array([r.anchor.x+.01,r.anchor.z])}));
 }finally{await f.dispose();}
});

test('legacy local reference keeps its exact shape and cannot borrow selected WALK remaining',()=>{
 const f=nativeIdleStrollSourceFixture();try{const raw=f.stage();assert.equal(raw.status,1);const proof=f.planner.captureNativeIdleStrollProposal({kind:'native-idle-stroll-proposal-ticket',authorityEpoch:f.bodyBinding.reference.worldBoundary.authorityEpoch,session:f.w.nav_intent_session(),ticket:raw.ticket});const r=proof.nativeIdleStroll;assert.equal(r.version,1);assert.equal(Object.hasOwn(r,'walkRemaining'),false);for(const walkRemaining of [0,1,undefined])assert.throws(()=>copyNativeIdleStrollReference({...r,walkRemaining}));assert.throws(()=>copyNativeIdleStrollReference({...r,version:2,walkRemaining:0}));}finally{f.close();}
});

test('bridge cancellation and retiming retain selected request/remaining without consuming a private draw',async()=>{
 const f=await selectedApproachSource();try{mirrorCycle(f);const n=f.bridge.nativeIdleCycleNextRequest(f.actor),first=f.bridge.prepareNativeIdleStrollProposal(f.actor).proposal;assert(first);assert.equal(f.bridge.cancelNativeIdleStrollProposal(first.ticket),true);assert.deepEqual(f.bridge.nativeIdleCycleNextRequest(f.actor),n);const p=f.bridge.prepareNativeIdleStrollProposal(f.actor).proposal;assert(p);f.advance(.2);const actual=f.bridge.revalidateNativeIdleStrollProposal(p.ticket);assert.equal(actual.status,'revalidated');assert(actual.timeTranslation.sameRelativeProgram);assert(nativeIdleStrollSuccessor(p.nativeIdleStroll,actual.proposal.nativeIdleStroll));assert(nativeIdleStrollContinuesNext(actual.proposal.nativeIdleStroll,n));assert.equal(f.commit(f.capture(),p.ticket.ticket),1);const b=f.bridge.nativeIdleStrollBinding(f.actor);assert.deepEqual(b.preparedReference,p.nativeIdleStroll);assert.deepEqual(b.reference,actual.proposal.nativeIdleStroll);}finally{await f.dispose();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} held selected execution transports exact remaining without a former graphical grant`,async()=>{
 const f=await selectedApproachSource({threaded});try{const raw=f.stage(),p=decode(f,raw);assert.equal(f.commit(raw),1);const b=f.bridge.nativeIdleStrollBinding(f.actor);f.advance(.12);assert.equal(f.w.nav_gate_suspend_route(f.q.nativeSession,raw.header[20],raw.header[4]),1);assert(f.w.nav_intent_clock_commit(1,0)>=0);assert.equal(f.w.nav_gate_suspended_route(f.actor),1);const held=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_gate_suspended_route_ptr(),27)),goal=f.point(6,-4),village=Number(f.worker.villageId.split('-').at(-1));assert.equal(f.w.nav_intent_idle_stroll_home_request(f.actor,f.q.nativeSession,b.assignmentSequence,held[3],village,goal.x,goal.z),1);assert(f.w.nav_intent_clock_commit(1,0)>=0);const v=f.bridge.nativeIdleStrollHeldExecution(f.actor);assert.equal(v.walkState.remaining,p.nativeIdleStroll.walkRemaining);assert.deepEqual(copyNativeIdleStrollHeldExecution(structuredClone(v)),v);assert.equal(f.bridge.nativeIdleStrollBinding(f.actor),null);for(const remaining of [undefined,-1,v.walkState.remaining+.01])assert.throws(()=>copyNativeIdleStrollHeldExecution({...v,walkState:{...v.walkState,remaining}}));f.advance(.2);assert.deepEqual(f.bridge.nativeIdleStrollHeldExecution(f.actor).walkState,v.walkState);}finally{await f.dispose();}
});
