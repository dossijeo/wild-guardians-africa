import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmIdleApproachFixture as fixture} from './helpers/native-farm-idle-approach.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {copyNativeIdleStrollReference,copyNativeIdleStrollProposal} from '../src/world/native-idle-stroll.js';
import {updateIdle} from '../src/simulation/idle.js';
import {nativeIdleStrollLiveState,nativeIdleStrollSavedState} from '../src/world/native-idle-stroll-state.js';
import {tick} from '../src/simulation/game.js';

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} actual Farm outside its original anchor prepares native approach22 and enters REST21`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({core:runtime?.core,profile:profile.id});assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');const body=f.body(1),rng=f.state.rng,sequence=f.w.nav_intent_transition_sequence(),p=f.prepareApproach(),r=p.nativeIdleStroll,q=r.sourceFarm;
  assert.equal(q.kind,'native-farm-arrival-idle-source');assert.equal(q.sourceSequence,f.farmBinding.assignmentSequence);assert.equal(q.sourceAt,f.farmBinding.reference.endTime);assert.equal(r.sourceCycleSequence,0);assert.equal(r.sourceRequest,undefined);assert.deepEqual(r.destination,{x:f.idleAnchor.x,z:f.idleAnchor.z});assert.equal(r.walkRng,f.birth.rng);assert.equal(r.approachRetry,1);assert(Math.hypot(r.pose.x-r.anchor.x,r.pose.z-r.anchor.z)>r.anchor.radius);assert(Math.hypot(p.rows[1]-r.anchor.x,p.rows[2]-r.anchor.z)>r.anchor.radius);assert.equal(p.motionFlags,0);assert.equal(p.runDistance,0);assert.equal(p.runBudget,f.source.runRemaining);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.worker.status,'arriving');assert.equal(f.worker.idleState,null);
  f.advance(1.8);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor).assignmentSequence,f.farmBinding.assignmentSequence);const next=f.planner.revalidateNativeIdleStrollProposal(p.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameRelativeProgram);assert(f.planner.cancelNativeIdleStrollProposal(next.proposal.ticket));assert.deepEqual(f.body(1),body);
  const candidate=f.prepareApproach();f.advance(.3);assert.equal(f.planner.revalidateNativeIdleStrollProposal(candidate.ticket).status,'revalidated');const b=f.commitApproach(candidate);assert.deepEqual(b.reference.sourceFarm,q);assert(b.reference.worldBoundary.effectiveTime>b.preparedReference.worldBoundary.effectiveTime);assert.equal(f.worker.status,'idle');assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert.equal(f.worker.destinationId,q.idleState.anchorId);assert.equal(f.worker.idleState.remaining,f.birth.remaining);assert.equal(f.worker.idleState.rng,f.birth.rng);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);nativeIdleStrollLiveState(f.state,f.worker);
  f.advance(.2);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.runRemaining,q.pose.runRemaining);assert.equal(f.worker.runPhase,q.pose.runPhase);assert(f.worker.walkPhase>q.pose.walkPhase);assert.equal(f.worker.running,false);assert.equal(f.worker.idleState.rng,f.birth.rng);
  f.advance(b.reference.endTime-f.state.elapsed+.01);const execution=f.planner.nativeIdleStrollExecution(f.actor);assert(execution.arrived);assert.equal(f.worker.idleState.mode,'walk');assert(execution.desiredRest);const arrived=f.body(1),rest=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(rest.status,'proposed');assert.equal(rest.proposal.nativeIdleCycle.sourceBody.kind,'native-idle-stroll-arrival-source');const rb=f.commitIdle(rest.proposal);assert.deepEqual(f.body(1),arrived);assert.equal(f.worker.idleState.mode,'rest');assert.equal(f.worker.idleState.rng,execution.desiredRest.rng);assert.equal(rb.reference.initialState.remaining,execution.desiredRest.remaining);assert.equal(f.state.rng,rng);
 }finally{f?.close();await runtime?.dispose();}
});

test('approach target and retained remaining/retry match original idle.js without a random WALK choice',()=>{
 const f=fixture();try{const p=f.prepareApproach(),oracle=structuredClone(f.worker);oracle.status='idle';let calls=0;const nav={version:1,path(worker,target,radius,unused,ambient){calls++;assert.equal(target.id,f.idleAnchor.id);assert.equal(radius,.28);assert.equal(ambient,true);return [{x:worker.x,z:worker.z},{x:target.x,z:target.z}];}};
  updateIdle(oracle,f.idleAnchor,0,nav,f.state.seed);assert.equal(calls,1);assert.equal(oracle.idleState.mode,'walk');assert.equal(oracle.idleState.rng,p.nativeIdleStroll.walkRng);assert.equal(oracle.idleState.remaining,f.birth.remaining);assert.equal(oracle.idleState.approachRetry,1);assert.equal(oracle.destinationId,f.idleAnchor.id);f.commitApproach(p);assert.equal(f.worker.idleState.remaining,oracle.idleState.remaining);assert.equal(f.worker.idleState.approachRetry,oracle.idleState.approachRetry);
 }finally{f.close();}
});

test('approach provenance cannot relax local stroll containment or alter its exact Farm body/anchor',()=>{
 const f=fixture();try{const p=f.prepareApproach(),r=p.nativeIdleStroll;assert.deepEqual(copyNativeIdleStrollReference(r),r);assert.deepEqual(copyNativeIdleStrollProposal(p).points,p.points);
  for(const change of [{sourceFarm:undefined},{bodyId:r.bodyId+1},{sourceCycleSequence:1},{sourceDecisionSequence:r.sourceDecisionSequence+1},{requestedAt:r.requestedAt+.1},{walkRng:r.walkRng+1},{approachRetry:0},{destination:{x:r.destination.x+.1,z:r.destination.z}},{sourceFarm:{...r.sourceFarm,bodyId:r.bodyId+1}}])assert.throws(()=>copyNativeIdleStrollReference({...r,...change}));
 }finally{f.close();}
});

test('moving Farm and an endpoint already inside its anchor never acquire an approach22',()=>{
 for(const options of [{complete:false},{offset:1}]){const f=fixture(options);try{const body=f.body(1),seq=f.w.nav_intent_transition_sequence();assert.equal(f.planner.prepareNativeIdleStrollProposal(f.actor).status,'unsupported');assert.equal(f.rawApproach(),-2);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),seq);}finally{f.close();}}
});

test('raw approach rejects foreign identity, anchor coordinates and malformed birth without replacing Farm',()=>{
 const f=fixture();try{const body=f.body(1),seq=f.w.nav_intent_transition_sequence();for(const change of [{actor:900012},{session:f.w.nav_intent_session()+1},{sequence:f.farmBinding.assignmentSequence+1},{kind:3},{id:900097},{x:f.idleAnchor.x+100},{radius:0},{rng:0},{rng:NaN},{rng:0x100000000}])assert.notEqual(f.rawApproach(change),1);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),seq);}finally{f.close();}
});

for(const field of ['heading','profile','centerId','contractDay'])test(`changed ${field} cannot prepare an approach from incompatible Farm semantics`,()=>{
 const f=fixture();try{if(field==='profile')f.worker.profile='youngFemale';else if(field==='centerId')f.worker.centerId='center-123456';else if(field==='personId')f.worker.personId='different-person';else f.worker[field]+=(field==='contractDay'?-1:.1);assert.equal(f.planner.prepareNativeIdleStrollProposal(f.actor).status,'unsupported');}finally{f.close();}
});

for(const field of ['heading','profile','centerId','contractDay','personId'])test(`changed ${field} while approach waits cannot revalidate its original semantic source`,()=>{
 const f=fixture();try{const p=f.prepareApproach(),body=f.body(1);if(field==='profile')f.worker.profile='youngFemale';else if(field==='centerId')f.worker.centerId='center-123456';else if(field==='personId')f.worker.personId='different-person';else f.worker[field]+=(field==='contractDay'?-1:.1);assert.equal(f.planner.revalidateNativeIdleStrollProposal(p.ticket).status,'stale');assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert(f.planner.cancelNativeIdleStrollProposal(p.ticket));}finally{f.close();}
});

test('an unavailable distant approach never becomes a route or consumes either RNG stream',()=>{
 const f=fixture({offset:500});try{const body=f.body(1),rng=f.state.rng,seq=f.w.nav_intent_transition_sequence();assert.equal(f.planner.prepareNativeIdleStrollProposal(f.actor).status,'conflict');assert.deepEqual(f.body(1),body);assert.equal(f.worker.idleState,null);assert.equal(f.state.rng,rng);assert.equal(f.w.nav_intent_transition_sequence(),seq);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);}finally{f.close();}
});

test('an occupied approach endpoint rejects admission and keeps its actual Farm owner',()=>{
 const f=fixture();try{const body=f.body(1),seq=f.w.nav_intent_transition_sequence();assert.equal(f.w.spatial_body_upsert(99,Math.fround(f.idleAnchor.x),Math.fround(f.idleAnchor.z),.4,0,1),1);assert.equal(f.planner.prepareNativeIdleStrollProposal(f.actor).status,'conflict');assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),seq);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor).assignmentSequence,f.farmBinding.assignmentSequence);}finally{f.close();}
});

test('late Farm acquisition supplies its actual end and a pending approach pins that same body',()=>{
 const f=fixture({farmDelay:.3});try{assert(f.farmBinding.reference.endTime>f.farmBinding.preparedReference.endTime);const p=f.prepareApproach(),body=f.body(1);assert.equal(p.nativeIdleStroll.sourceFarm.sourceAt,f.farmBinding.reference.endTime);assert.notEqual(f.w.spatial_body_upsert(1,body.x+.1,body.z,body.radius,body.kind,body.flags),1);assert.deepEqual(f.body(1),body);assert(f.planner.cancelNativeIdleStrollProposal(p.ticket));assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);}finally{f.close();}
});

test('body removal invalidates approach acquisition without inventing a stationary source',()=>{
 const f=fixture();try{const p=f.prepareApproach();assert.equal(f.w.spatial_body_remove(1),1);assert.notEqual(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);}finally{f.close();}
});

test('ordinary Game tick projects the native approach and original cancelWalk REST blueprint',()=>{
 const f=fixture();try{const p=f.prepareApproach(),b=f.commitApproach(p),before=f.body(1),rng=f.state.rng;tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),before);assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert.equal(f.worker.idleState.remaining,f.birth.remaining);assert.equal(f.worker.idleState.rng,f.birth.rng);f.advance(b.reference.endTime-f.state.elapsed+.01);const view=f.planner.nativeIdleStrollExecution(f.actor),oracle=structuredClone(f.worker);oracle.path=[{x:oracle.x,z:oracle.z}];oracle.pathVersion=1;oracle.idleState.pathVersion=1;const nav={version:1,path(){throw Error('Arrived approach must not replan');}};updateIdle(oracle,f.idleAnchor,.01,nav,f.state.seed);assert.equal(oracle.idleState.mode,'rest');assert.equal(view.desiredRest.rng,oracle.idleState.rng);assert.equal(view.desiredRest.remaining,oracle.idleState.remaining);assert.equal(f.state.rng,rng);}finally{f.close();}
});

test('explicit moving stop preserves the same approach provenance and original semantic target',()=>{
 const f=fixture();try{const b=f.commitApproach(f.prepareApproach());f.advance(.12);const stop=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(stop.status,'proposed');f.advance(.1);assert.equal(f.planner.revalidateNativeIdleStrollStopProposal(stop.ticket).status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),stop.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const held=f.planner.projectNativeIdleStroll(f.state,f.worker);assert.equal(held.kind,'native-idle-stroll-held-execution');assert.deepEqual(held.sourceReference.sourceFarm,b.reference.sourceFarm);assert.equal(f.worker.destinationId,f.idleAnchor.id);assert.equal(f.worker.idleState.remaining,f.birth.remaining);const body=f.body(1);f.advance(.2);assert.deepEqual(f.body(1),body);}finally{f.close();}
});

test('Home consumes the actual stopped approach body without restoring Farm or an initial Idle owner',()=>{
 const f=fixture();try{f.commitApproach(f.prepareApproach());f.advance(.12);const p=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(p.status,'proposed');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.planner.projectNativeIdleStroll(f.state,f.worker);const held=f.planner.nativeIdleStrollHeldExecution(f.actor),body=f.body(1);f.state.time=600;const request=f.planner.requestNativeIdleHome(f.state,f.worker);assert(request);assert.equal(request.bodyId,1);assert.deepEqual(request.pose,held.pose);assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.body(1),body);}finally{f.close();}
});

test('an approach inside its anchor preserves its distinct target and birth in saved semantics',()=>{
 const f=fixture();try{const b=f.commitApproach(f.prepareApproach());f.advance((b.reference.endTime-f.state.elapsed)*.7);const view=f.planner.nativeIdleStrollExecution(f.actor);assert(!view.arrived);assert(Math.hypot(f.worker.x-f.idleAnchor.x,f.worker.z-f.idleAnchor.z)<f.idleAnchor.idleRadius);const body=f.body(1);nativeIdleStrollLiveState(f.state,f.worker);const saved=nativeIdleStrollSavedState(f.state,f.worker);assert.equal(saved.idleState.destination.id,saved.idleState.anchorId);assert.deepEqual(f.body(1),body);assert.equal(saved.idleState.remaining,f.birth.remaining);assert.equal(f.planner.nativeIdleStrollRequestReference(f.actor),null);}finally{f.close();}
});
