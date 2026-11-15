import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeGateCrossingFixture} from './helpers/native-gate-crossings.js';

function fixture(at=20){
 const f=nativeGateCrossingFixture(),admitted=f.admit(f.route({facts:{urgent:true,runRemaining:6}}));assert.equal(admitted.status,'admitted');assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.commitNativeCausalClock();assert.equal(f.advance(10.3).status,'advanced');const held=f.bridge.suspendNativeGateRoute(admitted.routeHandle);assert.equal(held.status,'suspended');assert.equal(f.advance(at).status,'advanced');f.bridge.commitNativeCausalClock();const first=f.bridge.prepareNativeGateResumeProposal(held.suspendedRoute.resumeHandle);assert.equal(first.status,'proposed');return {...f,held:held.suspendedRoute,proposal:first.proposal};
}

test('native revalidation separates a translated execution origin from identical native motion and gate data',()=>{
 const f=fixture();try{
  const before=f.body(1),moving=f.worker(2,f.point(-6,6),f.point(6,6));assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.commitNativeCausalClock();const other=f.body(2);assert.equal(f.advance(21.25).status,'advanced');f.bridge.commitNativeCausalClock();
  const result=f.bridge.revalidateNativeGateResumeProposal(f.proposal.ticket);assert.equal(result.status,'revalidated');const proof=result.timeTranslation;
  assert.equal(proof.kind,'native-resume-time-translation');assert.equal(proof.version,2);assert.deepEqual(proof.previousTicket,f.proposal.ticket);assert.deepEqual(proof.ticket,result.proposal.ticket);assert.deepEqual(proof.sourceResumeHandle,f.held.resumeHandle);assert.equal(proof.previousStartTime,20);assert.equal(proof.startTime,21.25);assert.equal(proof.previousEndTime,f.proposal.endTime);assert.equal(proof.endTime,result.proposal.endTime);assert.equal(proof.sameNativeMotion,true,JSON.stringify(proof));assert.equal(proof.sameNativeGates,true,JSON.stringify(proof));assert(Object.isFrozen(proof));assert.equal(proof.authorizedAutonomy,false);assert.equal(proof.authorizedPassage,false);assert.equal(result.requiresResourcePreparation,true);assert.equal(f.bridge.nativeRouteTiming(result.proposal.expectedRouteHandle),null);assert.deepEqual(f.body(1),before);assert(f.body(2).x>other.x);assert(f.bridge.nativeRouteTiming(moving));
 }finally{f.session.dispose();}
});

test('a replaced native gate cannot be called equivalent merely because source body and points match',()=>{
 const f=fixture();try{
  const gate=f.gates[0];assert.equal(f.service.remove(gate.id),true);assert.equal(f.service.register({...gate,gateOpen:.5}),true);assert.equal(f.service.installMechanism(gate.id,gate.material).status,'installed');
  const result=f.bridge.revalidateNativeGateResumeProposal(f.proposal.ticket);assert.equal(result.status,'revalidated',JSON.stringify(result));assert.deepEqual(result.proposal.points,f.proposal.points);assert.equal(result.proposal.bodyId,f.proposal.bodyId);assert.equal(result.timeTranslation.sameNativeGates,false,JSON.stringify(result.timeTranslation));assert.equal(result.timeTranslation.sameFloat32Gates,false);assert.equal(result.requiresResourcePreparation,true);assert.equal(f.bridge.nativeRouteTiming(result.proposal.expectedRouteHandle),null);
 }finally{f.session.dispose();}
});

test('comparison reads the native-owned draft and cannot be forged through mutated copied proposal data',()=>{
 const f=fixture();try{
  f.proposal.rows.fill(NaN);f.proposal.points.fill(-999);for(const gate of f.proposal.gates)gate.rows.fill(NaN);
  const result=f.bridge.revalidateNativeGateResumeProposal(f.proposal.ticket);assert.equal(result.status,'revalidated');assert.equal(result.timeTranslation.sameNativeMotion,true);assert.equal(result.timeTranslation.sameNativeGates,true);assert(result.proposal.rows.every(Number.isFinite));assert(result.proposal.points.every(value=>value!==-999));
  const {session,ticket}=result.proposal.ticket;assert(f.w.nav_gate_resume_proposal_time_translation_ptr(session,ticket));assert.equal(f.w.nav_gate_resume_proposal_time_translation_ptr(session+1,ticket),0);assert.equal(f.w.nav_gate_resume_proposal_time_translation_ptr(session,f.proposal.ticket.ticket),0);assert.equal(f.bridge.cancelNativeGateResumeProposal(result.proposal.ticket),true);assert.equal(f.w.nav_gate_resume_proposal_time_translation_ptr(session,ticket),0);assert.equal(f.bridge.revalidateNativeGateResumeProposal(result.proposal.ticket).status,'stale');
 }finally{f.session.dispose();}
});

test('a failed fresh physical proof discards the old native comparison without publishing an assignment',()=>{
 const f=fixture();try{
  const before=f.body(1),sequence=f.w.nav_intent_transition_sequence(),x=f.proposal.points.at(-2),z=f.proposal.points.at(-1);assert.equal(f.w.spatial_body_upsert(77,x,z,.28,0,1),1);const result=f.bridge.revalidateNativeGateResumeProposal(f.proposal.ticket);assert.notEqual(result.status,'revalidated');assert.equal(result.timeTranslation,undefined);assert.equal(f.w.nav_gate_resume_proposal_time_translation_ptr(f.proposal.ticket.session,f.proposal.ticket.ticket),0);assert.deepEqual(f.body(1),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.bridge.nativeSuspendedGateRoute(f.proposal.actorId));
 }finally{f.session.dispose();}
});

test('a newly reserved crossing must pass the current physical proof before any equivalence is reported',()=>{
 const f=fixture();try{
  const held=f.body(1),crossing=f.admit(f.route({id:2,origin:[.05,-1.4],points:[[.05,6]],facts:{urgent:true,runRemaining:20}}));assert.equal(crossing.status,'admitted');assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.commitNativeCausalClock();assert.equal(f.advance(20.1).status,'advanced');f.bridge.commitNativeCausalClock();
  const result=f.bridge.revalidateNativeGateResumeProposal(f.proposal.ticket);assert.equal(result.status,'conflict');assert.equal(result.timeTranslation,undefined);assert.deepEqual(f.body(1),held);assert(f.bridge.nativeSuspendedGateRoute(f.proposal.actorId));assert.equal(f.bridge.nativeRouteTiming(f.proposal.expectedRouteHandle),null);
 }finally{f.session.dispose();}
});

test('Float32 projection identifies equal render samples despite subtraction differences in native doubles',()=>{
 let observed=false;
 for(const at of [12.892954295226637,20.01]){const f=fixture(at);try{assert.equal(f.advance(at+.2).status,'advanced');f.bridge.commitNativeCausalClock();const result=f.bridge.revalidateNativeGateResumeProposal(f.proposal.ticket);assert.equal(result.status,'revalidated');assert.equal(result.timeTranslation.sameFloat32Motion,true,JSON.stringify(result.timeTranslation));assert.equal(result.timeTranslation.sameFloat32Gates,true,JSON.stringify(result.timeTranslation));observed||=!result.timeTranslation.sameNativeMotion||!result.timeTranslation.sameNativeGates;assert.equal(f.bridge.nativeRouteTiming(result.proposal.expectedRouteHandle),null);}finally{f.session.dispose();}}
 assert(observed,'test must exercise a native-double difference, not just identical inputs');
});

test('a changed Float32 timing representation still requires graphical preparation',()=>{
 const f=fixture(31.75);try{assert.equal(f.advance(31.95).status,'advanced');f.bridge.commitNativeCausalClock();const result=f.bridge.revalidateNativeGateResumeProposal(f.proposal.ticket);assert.equal(result.status,'revalidated');assert.equal(result.timeTranslation.sameFloat32Motion,false);assert.equal(result.requiresResourcePreparation,true);assert.equal(result.authorizedAutonomy,false);assert.equal(f.bridge.nativeRouteTiming(result.proposal.expectedRouteHandle),null);}finally{f.session.dispose();}
});
