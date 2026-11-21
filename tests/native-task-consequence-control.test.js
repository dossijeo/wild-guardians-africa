import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTaskConsequenceFixture} from './helpers/native-task-consequence.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {nativeTaskConsequenceReferenceFromProposal} from '../src/world/native-task-consequence.js';

function clock(control,value,baseline=false){const prior=control.status().clock,reanchor=baseline||value.reanchor;control.acceptClock({...value,anchorLogicalTime:reanchor?value.committedThrough:prior.anchorLogicalTime,anchorAbsoluteMs:reanchor?1000:prior.anchorAbsoluteMs},{baseline});}
function controlFor(b){const control=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingActionRequests:b.pendingActionRequests??[]});clock(control,b.clock,true);control.installStartedRoutes(b.worldBoundary,b.nativeStartedRoutes??[],{bootstrap:true});control.installActions(b.worldBoundary,b.nativeActions??[],{bootstrap:true});control.installConsequences(b.worldBoundary,b.nativeConsequences??[],{bootstrap:true});return control;}
function fixture(){const f=nativeTaskConsequenceFixture();f.planner.intentChanges();const control=controlFor(f.planner.nativeIntentControlBaseline());return {...f,control,sync(){f.planner.commitNativeCausalClock();for(const e of f.planner.intentChanges())control.accept(e);const current=f.planner.nativeCausalClock();if(control.status().clock.clockSequence!==current.clockSequence)clock(control,current);},close(){control.dispose();f.close();}};}

test('a prepared consequence requires its current native action and becomes current only after the exact issued route and attestation',()=>{
 const f=fixture();try{const p=f.prepare().proposal,r=nativeTaskConsequenceReferenceFromProposal(p),old=f.control.admitAction(f.source.reference),lease=f.control.admitConsequence(r,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.routeRecord,null);assert.throws(()=>f.control.admitConsequence(r),/obsolete/);
  assert.equal(f.commitSourceOnly(p),1);f.sync();assert.equal(old.isCurrent(),false);assert.equal(lease.isPrepared(),false);const actual=f.planner.nativeTaskConsequenceBinding(f.actor);assert.equal(f.control.installConsequences(actual.reference.worldBoundary,[actual]),1);assert(lease.isCurrent());assert.equal(lease.routeRecord.assignmentSequence,actual.assignmentSequence);assert.equal(lease.executionEpoch,actual.reference.worldBoundary.effectiveTime);assert.equal(lease.executionEnd,actual.reference.endTime);
  assert.equal(f.w.nav_intent_retire_actor(r.actorId),1);f.sync();assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);
 }finally{f.close();}
});

test('foreign source action or route proofs cannot authorize a consequence and a rejected batch installs nothing',()=>{
 const f=fixture();try{const p=f.prepare().proposal,r=nativeTaskConsequenceReferenceFromProposal(p),bad=structuredClone(r);bad.sourceAction.reference.request.heading+=.1;bad.sourceAction.preparedReference.request.heading+=.1;assert.throws(()=>f.control.admitConsequence(bad,{preparingWorldBoundary:p.worldBoundary}),/obsolete|Invalid/);assert.equal(f.commitSourceOnly(p),1);f.sync();const actual=f.planner.nativeTaskConsequenceBinding(f.actor),foreign=structuredClone(actual);foreign.assignmentSequence++;
  assert.throws(()=>f.control.installConsequences(actual.reference.worldBoundary,[actual,foreign]),/issued/);assert.throws(()=>f.control.admitConsequence(r),/obsolete/);assert.equal(f.control.installConsequences(actual.reference.worldBoundary,[actual]),1);assert(f.control.admitConsequence(r).isCurrent());
 }finally{f.close();}
});

test('a delayed consequence retains both prepared and actual identities while using the actual issued epoch',()=>{
 const f=fixture();try{const p=f.prepare().proposal,r=nativeTaskConsequenceReferenceFromProposal(p);f.advance(.7);f.sync();const next=f.planner.revalidateNativeTaskConsequenceProposal(p.ticket);assert.equal(next.status,'revalidated');assert.equal(f.commitSourceOnly(p),1);f.sync();const actual=f.planner.nativeTaskConsequenceBinding(f.actor);f.control.installConsequences(actual.reference.worldBoundary,[actual]);const lease=f.control.admitConsequence(r);assert(lease.isCurrent());assert.equal(lease.executionEpoch,next.proposal.startTime);assert(lease.executionEpoch>r.worldBoundary.effectiveTime);assert(f.control.admitConsequence(actual.reference).isCurrent());
 }finally{f.close();}
});

test('a fresh consumer restores the consequence only from its actual native route baseline',()=>{
 const f=fixture();let peer;try{const p=f.prepare().proposal;assert.equal(f.commitSourceOnly(p),1);f.sync();const b=f.planner.nativeIntentControlBaseline();assert.equal(b.nativeConsequences.length,1);peer=controlFor(b);assert(peer.admitConsequence(b.nativeConsequences[0].preparedReference).isCurrent());const wrong=structuredClone(b.nativeConsequences[0]);wrong.assignmentSequence++;assert.throws(()=>peer.installConsequences(b.worldBoundary,[wrong],{bootstrap:true}),/issued/);}finally{peer?.dispose();f.close();}
});
