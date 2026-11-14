import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';

const id=value=>Number.isSafeInteger(value)&&value>0;
const sameHandle=(a,b)=>['authorityEpoch','session','slot','generation'].every(key=>a[key]===b[key]);
function handle(value){
 if(typeof value?.authorityEpoch!=='string'||!value.authorityEpoch||!id(value.session)||!Number.isSafeInteger(value.slot)||value.slot<0||value.slot>0xffffffff||!id(value.generation)||value.generation>0xffffffff)throw TypeError('Invalid native resume handle');
 return Object.freeze({authorityEpoch:value.authorityEpoch,session:value.session,slot:value.slot,generation:value.generation});
}

// A reserved candidate identity. Neither a handle nor resource preparation is
// an assignment: direct release must bind it to the actual native control event.
export function copyNativeResumeReference(value){
 if(value?.kind!=='native-route-resume-reference'||value.version!==1)throw TypeError('Invalid native resume reference');
 const sourceResumeHandle=handle(value.sourceResumeHandle),expectedRouteHandle=handle(value.expectedRouteHandle),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),next=((sourceResumeHandle.generation+2)>>>0)||1;
 if(!worldBoundary||!id(value.actorId)||!id(value.bodyId)||!id(value.sourceAssignmentSequence)||!id(value.sourceControlSequence)||value.sourceAssignmentSequence>value.sourceControlSequence||!Number.isFinite(value.suspendedAt)||value.suspendedAt<0||value.suspendedAt>worldBoundary.effectiveTime||!Number.isFinite(value.endTime)||value.endTime<worldBoundary.effectiveTime||sourceResumeHandle.authorityEpoch!==worldBoundary.authorityEpoch||sourceResumeHandle.session!==worldBoundary.nativeSession||expectedRouteHandle.authorityEpoch!==worldBoundary.authorityEpoch||expectedRouteHandle.session!==worldBoundary.nativeSession||sourceResumeHandle.slot!==expectedRouteHandle.slot||expectedRouteHandle.generation!==next)throw TypeError('Invalid native resume proposal identity or boundary');
 return Object.freeze({kind:value.kind,version:1,actorId:value.actorId,bodyId:value.bodyId,sourceAssignmentSequence:value.sourceAssignmentSequence,sourceControlSequence:value.sourceControlSequence,suspendedAt:value.suspendedAt,endTime:value.endTime,sourceResumeHandle,expectedRouteHandle,worldBoundary});
}
export function sameNativeResumeReference(a,b){return !!a&&!!b&&sameNativeWorldBoundary(a.worldBoundary,b.worldBoundary)&&sameHandle(a.sourceResumeHandle,b.sourceResumeHandle)&&sameHandle(a.expectedRouteHandle,b.expectedRouteHandle)&&['actorId','bodyId','sourceAssignmentSequence','sourceControlSequence','suspendedAt','endTime'].every(key=>a[key]===b[key]);}
export function nativeResumeReferenceCovered(reference,boundary){const expected=reference.worldBoundary;return !!boundary&&expected.authorityEpoch===boundary.authorityEpoch&&expected.nativeSession===boundary.nativeSession&&boundary.ticket>=expected.ticket&&boundary.effectiveTime>=expected.effectiveTime;}
export function nativeResumeReferenceFromProposal(value){
 const boundary=copyNativeWorldBoundary(value?.worldBoundary),ticket=value?.ticket;
 if(value?.kind!=='native-route-resume-proposal'||value.version!==1||value.authorizedAutonomy!==false||value.authorizedPassage!==false||!boundary||value.startTime!==boundary.effectiveTime||ticket?.kind!=='native-route-resume-proposal-ticket'||ticket.authorityEpoch!==boundary.authorityEpoch||ticket.session!==boundary.nativeSession||ticket.ticket!==boundary.ticket)throw TypeError('Invalid native resume proposal reference');
 return copyNativeResumeReference({...value,kind:'native-route-resume-reference'});
}
