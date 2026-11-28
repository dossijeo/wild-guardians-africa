import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {copyNativeSuspendedBodyReference,nativeSuspendedBodiesFromProposal,nativeSuspendedBodyReferenceCovered} from '../src/world/native-suspended-body-reference.js';

const boundary=Object.freeze({version:1,authorityEpoch:'native',nativeSession:1,ticket:1,effectiveTime:10});
const route=(actorId=1,assignmentSequence=1,generation=3)=>({actorId,assignmentSequence,routeHandle:{authorityEpoch:'native',session:1,slot:actorId-1,generation}});
const reference=(nativeRoute=route(),bodyId=nativeRoute.actorId,worldBoundary=boundary)=>({kind:'native-suspended-body',version:1,nativeRoute,bodyId,resumeGeneration:nativeRoute.routeHandle.generation+1,suspendedAt:worldBoundary.effectiveTime,worldBoundary});
function fixture(routes=[route()]){const control=createNativeRouteControl({authorityEpoch:'native',initialSequence:routes.length,initialTime:10,routes:routes.map(r=>({...r,startTime:10}))});let sequence=routes.length,clockSequence=0,through=10;
 const clock=()=>control.acceptClock({protocolVersion:2,clockVersion:1,authorityEpoch:'native',nativeSession:1,clockSequence:++clockSequence,intentSequence:sequence,committedThrough:through,rate:1,paused:false,reanchor:clockSequence===1,anchorAbsoluteMs:100,anchorLogicalTime:10},{baseline:clockSequence===1});clock();
 return {control,clock,advance(at){through=at;clock();},event(actorId,state,type='RouteInvalidated',handle=routes.find(r=>r.actorId===actorId)?.routeHandle){control.accept({protocolVersion:2,authorityEpoch:'native',sequence:++sequence,effectiveTime:through,actorId,state,type,...(type==='RouteAssigned'?{routeHandle:handle}:type==='IntentChanged'?{}:{revokedRouteHandle:handle})});},close(){control.dispose();}};}

test('a prepared suspended reference cannot display until direct authority attests the exact native stop',()=>{
 const f=fixture();try{const ref=reference(),pending=f.control.admitSuspended(ref,{preparingWorldBoundary:boundary});assert.equal(pending.isPrepared(),true);assert.equal(pending.isCurrent(),false);assert.throws(()=>f.control.admitSuspended(ref),/direct authority/);f.event(1,4);f.clock();assert.equal(pending.isPrepared(),false);assert.equal(pending.isCurrent(),false);assert.throws(()=>f.control.admit(route()),/obsolete/);assert.equal(f.control.installSuspendedBodies(boundary,[ref]),1);assert.equal(pending.isCurrent(),true);assert.equal(f.control.admitSuspended(ref).isCurrent(),true);f.advance(12);assert.equal(pending.isCurrent(),true);assert.equal(f.control.clockLease(10,Number.MAX_SAFE_INTEGER).safeUntil,12);}finally{f.close();}
});

test('a pending resource proposal expires on a clock advance instead of extending its physical frontier',()=>{
 const f=fixture();try{const pending=f.control.admitSuspended(reference(),{preparingWorldBoundary:boundary});f.advance(10.1);assert.equal(pending.isPrepared(),false);assert.equal(pending.isCurrent(),false);assert.throws(()=>f.control.admitSuspended(reference(),{preparingWorldBoundary:boundary}),/obsolete/);}finally{f.close();}
});

test('new assignments and later same-state events cannot resurrect a prior suspended reference',()=>{
 for(const replace of [false,true]){const f=fixture();try{const ref=reference(),pending=f.control.admitSuspended(ref,{preparingWorldBoundary:boundary});f.event(1,4);f.clock();f.control.installSuspendedBodies(boundary,[ref]);assert.equal(pending.isCurrent(),true);if(replace){const next=route(1,3,7);f.event(1,1,'RouteAssigned',next.routeHandle);assert.equal(pending.isCurrent(),false);f.event(1,4,'RouteInvalidated',next.routeHandle);}else f.event(1,4,'IntentChanged');f.clock();assert.equal(pending.isCurrent(),false);assert.throws(()=>f.control.installSuspendedBodies(boundary,[ref]),/exact revocation/);assert.throws(()=>f.control.admitSuspended(ref),/obsolete/);}finally{f.close();}}
});

test('cancelled actors, body reuse and control disposal permanently invalidate the old suspension',()=>{
 const f=fixture();const ref=reference(),pending=f.control.admitSuspended(ref,{preparingWorldBoundary:boundary});f.event(1,4);f.clock();f.control.installSuspendedBodies(boundary,[ref]);f.event(1,5,'IntentChanged');f.clock();assert.equal(pending.isCurrent(),false);f.event(1,1,'RouteAssigned',route(1,4,9).routeHandle);f.clock();assert.equal(pending.isPrepared(),false);f.close();assert.equal(pending.isCurrent(),false);assert.throws(()=>f.control.admitSuspended(ref),/obsolete/);
});

test('a needs-plan event has no suspended-body ownership and cannot authorize a held presentation',()=>{
 const f=fixture();try{const ref=reference(),pending=f.control.admitSuspended(ref,{preparingWorldBoundary:boundary});f.event(1,0);f.clock();assert.equal(pending.isPrepared(),false);assert.throws(()=>f.control.installSuspendedBodies(boundary,[ref]),/exact revocation/);}finally{f.close();}
});

test('authority attestations validate the entire actor set before installing any prefix',()=>{
 const a=route(),b=route(2,2,5),f=fixture([a,b]);try{const ra=reference(a),rb=reference(b),pending=f.control.admitSuspended(ra,{preparingWorldBoundary:boundary});f.event(1,4);f.event(2,4);f.clock();assert.throws(()=>f.control.installSuspendedBodies(boundary,[ra,{...rb,resumeGeneration:99}]),/suspension identity/);assert.equal(pending.isCurrent(),false);assert.throws(()=>f.control.installSuspendedBodies(boundary,[ra,ra]),/exact revocation/);assert.equal(pending.isCurrent(),false);assert.equal(f.control.installSuspendedBodies(boundary,[ra,rb]),2);assert.equal(pending.isCurrent(),true);}finally{f.close();}
});

test('copied native effects are identities rather than writable authority or executable handles',()=>{
 const row=new Float64Array(26);row.set([1,1,0,3,1,4,10,4]);const resources={version:1,phase:'proposal',nativeSession:1,ticket:1,effectiveTime:10,routeEffects:{version:1,rowWidth:26,rows:row}},refs=nativeSuspendedBodiesFromProposal(resources,boundary);assert.equal(refs.length,1);assert(Object.isFrozen(refs[0].nativeRoute.routeHandle));row.fill(-1);assert.deepEqual(refs[0],copyNativeSuspendedBodyReference(reference()));assert.equal(nativeSuspendedBodyReferenceCovered(refs[0],{...boundary,ticket:2,effectiveTime:11}),true);assert.equal(nativeSuspendedBodyReferenceCovered(refs[0],{...boundary,authorityEpoch:'other'}),false);for(const mutate of [v=>v.version++,v=>v.bodyId=0,v=>v.resumeGeneration=9,v=>v.suspendedAt=11,v=>v.worldBoundary.nativeSession=2]){const value=structuredClone(reference());mutate(value);assert.throws(()=>copyNativeSuspendedBodyReference(value),TypeError);}assert.deepEqual(nativeSuspendedBodiesFromProposal({},boundary),[]);
});
