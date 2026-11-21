import {copyNativeRouteReference} from './native-route-reference.js';
import {copyNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeTaskActionRestoreReference,sameNativeTaskActionRestoreReference} from './native-task-action-restore-reference.js';

export const NATIVE_TASK_ACTION_KINDS=Object.freeze(['harvest','initial','water','crate','repair']);
const id=n=>Number.isSafeInteger(n)&&n>0;
const sameRoute=(a,b)=>a.actorId===b.actorId&&a.assignmentSequence===b.assignmentSequence&&['authorityEpoch','session','slot','generation'].every(k=>a.routeHandle[k]===b.routeHandle[k]);
export const nativeTaskActionActor=request=>request.sourceRequest?.actorId??request.nativeRoute.actorId;
export const nativeTaskActionRemainingDuration=request=>request.duration-(request.initialElapsed??0);
export function copyNativeTaskActionProgress(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||Object.keys(value).some(k=>!['version','kind','duration','elapsed'].includes(k))||!NATIVE_TASK_ACTION_KINDS.includes(value.kind)||!Number.isFinite(value.duration)||value.duration<0||value.duration>3600||(value.kind==='repair'?value.duration!==0:value.duration<=0)||!Number.isFinite(value.elapsed)||value.elapsed<0||value.elapsed>value.duration)throw TypeError('Invalid native task action progress');
 return Object.freeze({version:1,kind:value.kind,duration:value.duration,elapsed:value.elapsed});
}

// Declaration from an executed arrival, never permission to enter an action.
export function copyNativeTaskActionRequest(value){
 if(value?.kind!=='native-task-action-resource-request'||value.version!==1||value.authorizedAutonomy!==false)throw TypeError('Invalid native task action request');
 const restoring=value.sourceRequest!==undefined;
 if(restoring?value.nativeRoute!==undefined:value.initialElapsed!==undefined)throw TypeError('Conflicting native action sources');
 const source=restoring?{sourceRequest:copyNativeTaskActionRestoreReference(value.sourceRequest),initialElapsed:value.initialElapsed}:{nativeRoute:copyNativeRouteReference(value.nativeRoute)};
 if(!['taskId','targetId','bodyId'].every(k=>id(value[k]))||!NATIVE_TASK_ACTION_KINDS.includes(value.actionKind)||
    !Number.isFinite(value.requestedAt)||value.requestedAt<0||!Number.isFinite(value.executedThrough)||value.executedThrough<value.requestedAt||
    !Number.isFinite(value.duration)||value.duration<0||value.duration>3600||(value.actionKind==='repair'?value.duration!==0:value.duration<=0)||!Number.isFinite(value.heading))throw TypeError('Invalid native task action source');
 if(restoring&&(!Number.isFinite(value.initialElapsed)||value.initialElapsed<0||value.initialElapsed>value.duration||source.sourceRequest.taskId!==value.taskId||source.sourceRequest.targetId!==value.targetId||source.sourceRequest.requestedAt!==value.requestedAt))throw TypeError('Invalid native action restored progress');
 return Object.freeze({kind:value.kind,version:1,...source,taskId:value.taskId,targetId:value.targetId,bodyId:value.bodyId,requestedAt:value.requestedAt,actionKind:value.actionKind,duration:value.duration,heading:value.heading,executedThrough:value.executedThrough,authorizedAutonomy:false});
}
export function sameNativeTaskActionRequest(a,b){
 return !!a&&!!b&&(a.sourceRequest||b.sourceRequest?sameNativeTaskActionRestoreReference(a.sourceRequest,b.sourceRequest)&&a.initialElapsed===b.initialElapsed:sameRoute(a.nativeRoute,b.nativeRoute))&&['taskId','targetId','bodyId','requestedAt','actionKind','duration','heading'].every(k=>a[k]===b[k]);
}

// Retains the completed route's exact identity while the one native proposal
// prepares a stationary action. No predicted action/control event is issued.
export function copyNativeTaskActionProposal(value){
 const allowed=['kind','version','ticket','worldBoundary','request','sourceControlSequence','origin','radius','profile','motionFlags','startTime','endTime','runPhase','walkPhase','carryPhase','runRemaining','authorizedAutonomy','authorizedConsequences'];
 if(value?.kind!=='native-task-action-proposal'||value.version!==1||value.authorizedAutonomy!==false||value.authorizedConsequences!==false||Object.keys(value).some(k=>!allowed.includes(k)))throw TypeError('Invalid native task action proposal');
 const request=copyNativeTaskActionRequest(value.request),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),ticket=value.ticket,route=request.nativeRoute,source=request.sourceRequest,sourceEpoch=source?.authorityEpoch??route.routeHandle.authorityEpoch,sourceSession=source?.nativeSession??route.routeHandle.session,sourceSequence=source?.requestSequence??route.assignmentSequence,span=nativeTaskActionRemainingDuration(request);
 if(!worldBoundary||ticket?.kind!=='native-task-action-proposal-ticket'||ticket.authorityEpoch!==worldBoundary.authorityEpoch||ticket.session!==worldBoundary.nativeSession||ticket.ticket!==worldBoundary.ticket||
    sourceEpoch!==worldBoundary.authorityEpoch||sourceSession!==worldBoundary.nativeSession||
    !id(value.sourceControlSequence)||value.sourceControlSequence<sourceSequence||
    value.startTime!==worldBoundary.effectiveTime||value.startTime!==request.executedThrough||value.endTime!==value.startTime+span||!Number.isFinite(value.endTime)||value.endTime<value.startTime||span>0&&value.endTime===value.startTime||
    ![value.origin?.x,value.origin?.z].every(Number.isFinite)||!Number.isFinite(value.radius)||value.radius<=0||value.radius>2||!Number.isSafeInteger(value.profile)||value.profile<0||
    !Number.isInteger(value.motionFlags)||value.motionFlags<0||value.motionFlags>63||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>!Number.isFinite(value[k])||value[k]<0))throw TypeError('Invalid native task action boundary or pose');
 return Object.freeze({kind:value.kind,version:1,ticket:Object.freeze({kind:ticket.kind,authorityEpoch:ticket.authorityEpoch,session:ticket.session,ticket:ticket.ticket}),worldBoundary,request,sourceControlSequence:value.sourceControlSequence,origin:Object.freeze({x:value.origin.x,z:value.origin.z}),radius:value.radius,profile:value.profile,motionFlags:value.motionFlags,startTime:value.startTime,endTime:value.endTime,runPhase:value.runPhase,walkPhase:value.walkPhase,carryPhase:value.carryPhase,runRemaining:value.runRemaining,authorizedAutonomy:false,authorizedConsequences:false});
}

const referenceFields=['request','worldBoundary','sourceControlSequence','origin','radius','profile','motionFlags','startTime','endTime','runPhase','walkPhase','carryPhase','runRemaining'];
const parameters=['radius','profile','motionFlags','runPhase','walkPhase','carryPhase','runRemaining'];
// Only this validator's deeply immutable outputs carry local provenance.
// A frozen input or a structured clone must still pass every validation.
const canonicalReferences=new WeakSet();
function actionReference(proposal){
 return Object.freeze({kind:'native-task-action-reference',version:1,...Object.fromEntries(referenceFields.map(k=>[k,proposal[k]]))});
}
export function nativeTaskActionReferenceFromProposal(value){return copyNativeTaskActionReference(actionReference(copyNativeTaskActionProposal(value)));}
export function copyNativeTaskActionReference(value){
 if(canonicalReferences.has(value))return value;
 if(value?.kind!=='native-task-action-reference'||value.version!==1||Object.keys(value).some(k=>!['kind','version',...referenceFields].includes(k)))throw TypeError('Invalid native task action reference');
 const b=value.worldBoundary,p=copyNativeTaskActionProposal({...Object.fromEntries(referenceFields.map(k=>[k,value[k]])),kind:'native-task-action-proposal',version:1,ticket:{kind:'native-task-action-proposal-ticket',authorityEpoch:b?.authorityEpoch,session:b?.nativeSession,ticket:b?.ticket},authorizedAutonomy:false,authorizedConsequences:false});
 if([p.request.duration,p.request.heading,p.origin.x,p.origin.z,p.radius,p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining].some(n=>!Number.isFinite(Math.fround(n))))throw TypeError('Native action parameters are not representable');
 const reference=actionReference(p);canonicalReferences.add(reference);return reference;
}
export function sameNativeTaskActionReference(a,b){
 return !!a&&!!b&&sameNativeTaskActionRequest(a.request,b.request)&&['version','authorityEpoch','nativeSession','ticket','effectiveTime'].every(k=>a.worldBoundary[k]===b.worldBoundary[k])&&['startTime','endTime','sourceControlSequence',...parameters].every(k=>a[k]===b[k])&&a.origin.x===b.origin.x&&a.origin.z===b.origin.z;
}
// Projection v1 uses fixed body parameters and request.duration, never a
// duration obtained by subtracting absolute times. A new epoch can reuse them.
export function sameNativeTaskActionSource(a,b){return !!a&&!!b&&sameNativeTaskActionRequest(a.request,b.request)&&parameters.every(k=>a[k]===b[k])&&a.origin.x===b.origin.x&&a.origin.z===b.origin.z;}
export function nativeTaskActionSuccessor(a,b){return sameNativeTaskActionSource(a,b)&&b.worldBoundary.ticket>a.worldBoundary.ticket&&b.startTime>=a.startTime&&b.sourceControlSequence>=a.sourceControlSequence;}
export function nativeTaskActionReferenceCovered(reference,boundary){const expected=reference.worldBoundary;return !!boundary&&expected.authorityEpoch===boundary.authorityEpoch&&expected.nativeSession===boundary.nativeSession&&boundary.ticket>=expected.ticket&&boundary.effectiveTime>=expected.effectiveTime;}
