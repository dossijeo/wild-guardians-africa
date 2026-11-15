import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';

const id=value=>Number.isSafeInteger(value)&&value>0;
const sameHandle=(a,b)=>!!a&&!!b&&['authorityEpoch','session','slot','generation'].every(key=>a[key]===b[key]);
function handle(value,request=false){
 if(request&&value?.kind!=='native-task-route-request-handle'||typeof value?.authorityEpoch!=='string'||!value.authorityEpoch||!id(value.session)||!Number.isSafeInteger(value.slot)||value.slot<0||value.slot>0xffffffff||!id(value.generation)||value.generation>0xffffffff)throw TypeError('Invalid native task start handle');
 return Object.freeze({... (request?{kind:'native-task-route-request-handle'}:{}),authorityEpoch:value.authorityEpoch,session:value.session,slot:value.slot,generation:value.generation});
}
// A resource identity for an unpublished first assignment, never a suspended
// route or a predicted control sequence. Only the native commit can issue it.
export function copyNativeTaskStartReference(value){
 if(value?.kind!=='native-task-start-reference'||value.version!==1)throw TypeError('Invalid native task start reference');
 const sourceRequestHandle=handle(value.sourceRequestHandle,true),expectedRouteHandle=handle(value.expectedRouteHandle),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),next=((sourceRequestHandle.generation+2)>>>0)||1;
 if(!worldBoundary||!['actorId','bodyId','taskId','targetId','requestSequence','sourceControlSequence'].every(key=>id(value[key]))||value.requestSequence>value.sourceControlSequence||!Number.isFinite(value.requestedAt)||value.requestedAt<0||value.requestedAt>worldBoundary.effectiveTime||!Number.isFinite(value.endTime)||value.endTime<worldBoundary.effectiveTime||sourceRequestHandle.authorityEpoch!==worldBoundary.authorityEpoch||sourceRequestHandle.session!==worldBoundary.nativeSession||expectedRouteHandle.authorityEpoch!==worldBoundary.authorityEpoch||expectedRouteHandle.session!==worldBoundary.nativeSession||sourceRequestHandle.slot!==expectedRouteHandle.slot||expectedRouteHandle.generation!==next)throw TypeError('Invalid native task start identity or boundary');
 return Object.freeze({kind:value.kind,version:1,actorId:value.actorId,bodyId:value.bodyId,taskId:value.taskId,targetId:value.targetId,requestSequence:value.requestSequence,requestedAt:value.requestedAt,sourceControlSequence:value.sourceControlSequence,endTime:value.endTime,sourceRequestHandle,expectedRouteHandle,worldBoundary});
}
export function sameNativeTaskStartReference(a,b){return !!a&&!!b&&sameNativeWorldBoundary(a.worldBoundary,b.worldBoundary)&&sameHandle(a.sourceRequestHandle,b.sourceRequestHandle)&&sameHandle(a.expectedRouteHandle,b.expectedRouteHandle)&&['actorId','bodyId','taskId','targetId','requestSequence','requestedAt','sourceControlSequence','endTime'].every(key=>a[key]===b[key]);}
export function nativeTaskStartReferenceFromProposal(value){
 const boundary=copyNativeWorldBoundary(value?.worldBoundary),ticket=value?.ticket;
 if(value?.kind!=='native-task-start-proposal'||value.version!==1||value.authorizedAutonomy!==false||value.authorizedPassage!==false||!boundary||value.startTime!==boundary.effectiveTime||ticket?.kind!=='native-task-start-proposal-ticket'||ticket.authorityEpoch!==boundary.authorityEpoch||ticket.session!==boundary.nativeSession||ticket.ticket!==boundary.ticket||['nativeRoute','assignmentSequence','sourceAssignmentSequence','nativeResume','sourceResumeHandle','suspendedAt'].some(key=>value[key]!==undefined))throw TypeError('Invalid native task start proposal reference');
 return copyNativeTaskStartReference({...value,kind:'native-task-start-reference'});
}
