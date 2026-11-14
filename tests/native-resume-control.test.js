import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {copyNativeResumeReference,nativeResumeReferenceFromProposal} from '../src/world/native-resume-reference.js';

const stopBoundary={version:1,authorityEpoch:'native',nativeSession:1,ticket:1,effectiveTime:10};
const resumeBoundary={...stopBoundary,ticket:2,effectiveTime:20};
const handle=(actorId,generation)=>({authorityEpoch:'native',session:1,slot:actorId-1,generation});
const oldRoute=(actorId=1)=>({actorId,assignmentSequence:actorId,routeHandle:handle(actorId,3)});
const stopped=(actorId=1)=>({kind:'native-suspended-body',version:1,nativeRoute:oldRoute(actorId),bodyId:actorId,resumeGeneration:4,suspendedAt:10,worldBoundary:stopBoundary});
const reference=(actorId=1,sourceControlSequence=2)=>({kind:'native-route-resume-reference',version:1,actorId,bodyId:actorId,sourceAssignmentSequence:actorId,sourceControlSequence,suspendedAt:10,endTime:25,sourceResumeHandle:handle(actorId,4),expectedRouteHandle:handle(actorId,6),worldBoundary:{...resumeBoundary}});
function fixture(count=1,{attest=true}={}){
 const control=createNativeRouteControl({authorityEpoch:'native',initialSequence:count,initialTime:10,routes:Array.from({length:count},(_,i)=>({...oldRoute(i+1),startTime:10}))});let sequence=count,clockSequence=0,through=10;
 const clock=()=>control.acceptClock({protocolVersion:2,clockVersion:1,authorityEpoch:'native',nativeSession:1,clockSequence:++clockSequence,intentSequence:sequence,committedThrough:through,rate:1,paused:false,reanchor:clockSequence===1,anchorAbsoluteMs:100,anchorLogicalTime:10},{baseline:clockSequence===1});
 const event=(actorId,type,routeHandle,state)=>{control.accept({protocolVersion:2,authorityEpoch:'native',sequence:++sequence,effectiveTime:through,actorId,type,state,...(type==='RouteAssigned'?{routeHandle}:routeHandle?{revokedRouteHandle:routeHandle}:{})});return sequence;};
 clock();for(let i=1;i<=count;i++)event(i,'RouteInvalidated',handle(i,3),4);clock();if(attest)control.installSuspendedBodies(stopBoundary,Array.from({length:count},(_,i)=>stopped(i+1)));through=20;clock();
 return {control,clock,event,advance(at){through=at;clock();},get sequence(){return sequence;}};
}
test('prepared resume identity gets permission only from the exact issued assignment attestation',()=>{
 const f=fixture(),ref=reference(),pending=f.control.admitResume(ref,{preparingWorldBoundary:resumeBoundary});
 assert.equal(pending.isPrepared(),true);assert.equal(pending.isCurrent(),false);assert.equal(pending.routeRecord,null);assert.throws(()=>f.control.admitResume(ref),/attestation/);assert.throws(()=>f.control.admit({actorId:1,routeHandle:ref.expectedRouteHandle,assignmentSequence:3}),/obsolete/);
 const actualSequence=f.event(1,'RouteAssigned',ref.expectedRouteHandle,1);f.clock();assert.equal(pending.isPrepared(),false);assert.equal(pending.isCurrent(),false);assert.throws(()=>f.control.installResumedRoutes(resumeBoundary,[{reference:ref,assignmentSequence:actualSequence+1}]),/issued assignment/);
 f.control.installResumedRoutes(resumeBoundary,[{reference:ref,assignmentSequence:actualSequence}]);assert.equal(pending.isCurrent(),true);assert.equal(pending.routeRecord,f.control.admit({actorId:1,routeHandle:ref.expectedRouteHandle,assignmentSequence:actualSequence}));assert.equal(f.control.clockLease(10).safeUntil,20);f.advance(24);assert.equal(pending.isCurrent(),true);f.event(1,'RouteInvalidated',ref.expectedRouteHandle,4);assert.equal(pending.isCurrent(),false);f.control.dispose();
});
test('a suspended state without a direct body proof cannot prepare or authorize resume',()=>{
 const f=fixture(1,{attest:false}),ref=reference();assert.throws(()=>f.control.admitResume(ref,{preparingWorldBoundary:resumeBoundary}),/attestation/);const seq=f.event(1,'RouteAssigned',ref.expectedRouteHandle,1);f.clock();assert.throws(()=>f.control.installResumedRoutes(resumeBoundary,[{reference:ref,assignmentSequence:seq}]),/source body/);f.control.dispose();
});
test('data preparation survives clock advancement but never acquires a movement permit',()=>{
 const f=fixture(),ref=reference(),pending=f.control.admitResume(ref,{preparingWorldBoundary:resumeBoundary});f.advance(20.1);assert.equal(pending.isPrepared(),true);assert.equal(pending.isCurrent(),false);assert.equal(pending.routeRecord,null);assert.throws(()=>f.control.admitResume(ref),/attestation/);f.control.dispose();
});
test('actor transitions retire preparation and cannot borrow a reused candidate generation',()=>{
 for(const change of ['intent','assignment']){const f=fixture(),ref=reference(),pending=f.control.admitResume(ref,{preparingWorldBoundary:resumeBoundary});if(change==='intent'){f.event(1,'IntentChanged',null,4);f.clock();}else{f.event(1,'RouteAssigned',ref.expectedRouteHandle,1);f.clock();}assert.equal(pending.isPrepared(),false);assert.equal(pending.isCurrent(),false);assert.throws(()=>f.control.admitResume(ref,{preparingWorldBoundary:resumeBoundary}),/attestation/);f.control.dispose();}
});
test('actual sequence comes from authority and an invalid set installs no prefix',()=>{
 const f=fixture(2),ra=reference(1,4),rb=reference(2,4),a=f.control.admitResume(ra,{preparingWorldBoundary:resumeBoundary});
 // Another actor may be assigned first; no future sequence is guessed.
 const sb=f.event(2,'RouteAssigned',rb.expectedRouteHandle,1),sa=f.event(1,'RouteAssigned',ra.expectedRouteHandle,1);f.clock();assert.equal(sa,6);
 assert.throws(()=>f.control.installResumedRoutes(resumeBoundary,[{reference:ra,assignmentSequence:sa},{reference:{...rb,bodyId:99},assignmentSequence:sb}]),/source body/);assert.equal(a.isCurrent(),false);
 assert.equal(f.control.installResumedRoutes(resumeBoundary,[{reference:ra,assignmentSequence:sa},{reference:rb,assignmentSequence:sb}]),2);assert.equal(a.isCurrent(),true);f.control.dispose();assert.equal(a.isCurrent(),false);
});
test('resume references copy identities, validate generation wrap, and never fabricate route assignment',()=>{
 const input=reference(),copy=copyNativeResumeReference(input);input.expectedRouteHandle.generation=20;assert.equal(copy.expectedRouteHandle.generation,6);assert(Object.isFrozen(copy.worldBoundary));assert.equal(copy.assignmentSequence,undefined);
 const proposal={...reference(),kind:'native-route-resume-proposal',authorizedAutonomy:false,authorizedPassage:false,startTime:20,ticket:{kind:'native-route-resume-proposal-ticket',authorityEpoch:'native',session:1,ticket:2}};assert.deepEqual(nativeResumeReferenceFromProposal(proposal),copyNativeResumeReference(reference()));
 for(const mutate of [v=>v.bodyId=0,v=>v.sourceControlSequence=0,v=>v.expectedRouteHandle.generation=7,v=>v.worldBoundary.nativeSession=2,v=>v.suspendedAt=21,v=>v.endTime=19]){const v=reference();mutate(v);assert.throws(()=>copyNativeResumeReference(v),TypeError);}
 assert.equal(copyNativeResumeReference({...reference(),sourceResumeHandle:handle(1,0xfffffffe),expectedRouteHandle:handle(1,1)}).expectedRouteHandle.generation,1);
});
