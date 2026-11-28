import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHomeArrivalFixture} from './helpers/native-home-arrival.js';
import {copyNativeHomeArrivalAttestation} from '../src/world/native-home-arrival.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

function clock(c,value,baseline=false){const prior=c.status().clock,reanchor=baseline||value.reanchor;c.acceptClock({...value,anchorLogicalTime:reanchor?value.committedThrough:prior.anchorLogicalTime,anchorAbsoluteMs:reanchor?1000:prior.anchorAbsoluteMs},{baseline});}
function fixture(){const f=nativeHomeArrivalFixture();f.planner.intentChanges();const b=f.planner.nativeIntentControlBaseline(),control=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes});clock(control,b.clock,true);control.installStartedRoutes(b.worldBoundary,b.nativeStartedRoutes??[],{bootstrap:true});control.installActions(b.worldBoundary,b.nativeActions??[],{bootstrap:true});control.installConsequences(b.worldBoundary,b.nativeConsequences??[],{bootstrap:true});control.installHomes(b.worldBoundary,b.nativeHomes??[],{bootstrap:true});return {...f,control,sync(){f.planner.commitNativeCausalClock();for(const e of f.planner.intentChanges())control.accept(e);const next=f.planner.nativeCausalClock();if(control.status().clock.clockSequence!==next.clockSequence)clock(control,next);},proof(actual,prepared=actual){const a=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_home_arrival_result_ptr(),52));assert.equal(a[0],1);return copyNativeHomeArrivalAttestation({kind:'native-home-arrival-attestation',version:1,projectionVersion:1,retiredSequence:a[1],reference:actual.nativeHomeArrival,preparedReference:prepared.nativeHomeArrival});},close(){control.dispose();f.close();}};}

for(const late of [false,true])test(`absence accepts only its direct issued Home retirement (${late?'late boundary':'exact boundary'})`,()=>{
 const f=fixture();try{const p=f.prepareArrival().proposal,old=f.control.admitHome(f.homeSource.reference),lease=f.control.admitHomeArrival(p.nativeHomeArrival,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.throws(()=>f.control.admitHomeArrival(p.nativeHomeArrival),/boundary/);let actual=p;if(late){f.advance(.3);f.sync();const n=f.planner.revalidateNativeHomeArrivalProposal(p.ticket);assert.equal(n.status,'revalidated');actual=n.proposal;}assert.equal(f.commitArrival(actual,p),1);const proof=f.proof(actual,p);assert.throws(()=>lease.validateCommitted(proof),/issued/);f.sync();assert.equal(lease.isPrepared(),false);assert.equal(old.isCurrent(),false);assert.deepEqual(lease.validateCommitted(proof),proof);assert.throws(()=>f.control.admitHome(p.nativeHomeArrival.sourceHome.reference),/obsolete/);assert.throws(()=>f.control.admitHomeArrival(p.nativeHomeArrival,{preparingWorldBoundary:p.worldBoundary}),/source/);
 }finally{f.close();}
});

test('foreign Home history and a substituted retired sequence cannot authorize absence',()=>{
 const f=fixture();try{const p=f.prepareArrival().proposal,foreign=structuredClone(p.nativeHomeArrival);foreign.sourceHome.preparedReference.sourceControlSequence--;assert.throws(()=>f.control.admitHomeArrival(foreign,{preparingWorldBoundary:p.worldBoundary}),/source|prepared/);const lease=f.control.admitHomeArrival(p.nativeHomeArrival,{preparingWorldBoundary:p.worldBoundary});assert.equal(f.commitArrival(p),1);f.sync();const proof=f.proof(p),wrong=structuredClone(proof);wrong.retiredSequence++;assert.throws(()=>lease.validateCommitted(wrong),/issued/);wrong.retiredSequence=proof.retiredSequence;wrong.reference.pose.yaw+=.2;wrong.preparedReference.pose.yaw+=.2;assert.throws(()=>lease.validateCommitted(wrong),/issued/);assert.deepEqual(lease.validateCommitted(proof),proof);
 }finally{f.close();}
});

test('a late clock advance or disposed control cannot reuse an old absence release fact',()=>{
 const f=fixture();try{const p=f.prepareArrival().proposal,lease=f.control.admitHomeArrival(p.nativeHomeArrival,{preparingWorldBoundary:p.worldBoundary});assert.equal(f.commitArrival(p),1);f.sync();const proof=f.proof(p);assert(lease.validateCommitted(proof));f.advance(.1);f.sync();assert.throws(()=>lease.validateCommitted(proof),/issued/);f.control.dispose();assert.equal(lease.isPrepared(),false);assert.throws(()=>lease.validateCommitted(proof),/issued/);
 }finally{f.close();}
});
