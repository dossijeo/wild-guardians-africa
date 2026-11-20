import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeTaskActionAttestation} from './native-task-action-attestation.js';
import {nativeTaskActionActor,sameNativeTaskActionReference} from './native-task-action-presentation.js';
import {copyNativePresentationSamples} from './native-presentation-samples.js';
import {copyNativeGatePresentation} from './native-gate-presentation.js';
import {nativeMotionPresentationMatches} from './native-motion-presentation-match.js';
import {floorFloat32} from '../float32-time.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const sameHandle=(a,b)=>!!a&&!!b&&['authorityEpoch','session','slot','generation'].every(k=>a[k]===b[k]);
const sameAction=(a,b)=>!!a&&!!b&&a.actionSequence===b.actionSequence&&sameNativeTaskActionReference(a.reference,b.reference)&&sameNativeTaskActionReference(a.preparedReference,b.preparedReference);
const sourceKeys=['actorId','bodyId','crateId','centerId'];
const canonicalReferences=new WeakSet(); // Validated immutable values, never execution permissions.
export function copyNativeTaskConsequenceReference(value){
 if(canonicalReferences.has(value))return value;
 if(value?.kind!=='native-task-consequence-reference'||value.version!==1)throw TypeError('Invalid native task consequence reference');
 const sourceAction=copyNativeTaskActionAttestation(value.sourceAction),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),h=value.expectedRouteHandle,q=sourceAction.reference.request;
 if(!worldBoundary||sourceKeys.some(k=>!id(value[k]))||value.actorId!==nativeTaskActionActor(q)||value.bodyId!==q.bodyId||q.actionKind!=='harvest'||
    worldBoundary.authorityEpoch!==sourceAction.reference.worldBoundary.authorityEpoch||worldBoundary.nativeSession!==sourceAction.reference.worldBoundary.nativeSession||worldBoundary.effectiveTime<sourceAction.reference.endTime||
    !id(value.sourceControlSequence)||value.sourceControlSequence<sourceAction.actionSequence||!Number.isFinite(value.endTime)||value.endTime<worldBoundary.effectiveTime||
    ![value.destination?.x,value.destination?.z].every(n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n)))||
    h?.authorityEpoch!==worldBoundary.authorityEpoch||h.session!==worldBoundary.nativeSession||!Number.isSafeInteger(h.slot)||h.slot<0||h.slot>0xffffffff||!id(h.generation)||h.generation>0xffffffff)throw TypeError('Invalid native consequence source, destination or boundary');
 const reference=Object.freeze({kind:value.kind,version:1,...Object.fromEntries(sourceKeys.map(k=>[k,value[k]])),sourceAction,destination:Object.freeze({x:value.destination.x,z:value.destination.z}),sourceControlSequence:value.sourceControlSequence,endTime:value.endTime,
  expectedRouteHandle:Object.freeze({authorityEpoch:h.authorityEpoch,session:h.session,slot:h.slot,generation:h.generation}),worldBoundary});
 canonicalReferences.add(reference);return reference;
}
const sameSource=(a,b)=>!!a&&!!b&&sourceKeys.every(k=>a[k]===b[k])&&sameAction(a.sourceAction,b.sourceAction)&&a.destination.x===b.destination.x&&a.destination.z===b.destination.z&&sameHandle(a.expectedRouteHandle,b.expectedRouteHandle);
export const sameNativeTaskConsequenceReference=(a,b)=>sameSource(a,b)&&a.sourceControlSequence===b.sourceControlSequence&&a.endTime===b.endTime&&sameNativeWorldBoundary(a.worldBoundary,b.worldBoundary);
export const nativeTaskConsequenceSuccessor=(a,b)=>sameSource(a,b)&&b.worldBoundary.ticket>a.worldBoundary.ticket&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime&&b.sourceControlSequence>=a.sourceControlSequence;
export function nativeTaskConsequenceReferenceCovered(reference,boundary){const w=reference.worldBoundary;return !!boundary&&w.authorityEpoch===boundary.authorityEpoch&&w.nativeSession===boundary.nativeSession&&boundary.ticket>=w.ticket&&boundary.effectiveTime>=w.effectiveTime;}
export function nativeTaskConsequenceReferenceFromProposal(value){
 const b=copyNativeWorldBoundary(value?.worldBoundary),t=value?.ticket;
 if(value?.kind!=='native-task-consequence-proposal'||value.version!==1||value.authorizedAutonomy!==false||value.authorizedConsequences!==false||!b||value.startTime!==b.effectiveTime||t?.kind!=='native-task-consequence-proposal-ticket'||t.authorityEpoch!==b.authorityEpoch||t.session!==b.nativeSession||t.ticket!==b.ticket||['nativeRoute','nativeStart','nativeResume','sourceResumeHandle','sourceRequestHandle','assignmentSequence'].some(k=>value[k]!==undefined))throw TypeError('Invalid native consequence proposal identity');
 return copyNativeTaskConsequenceReference({...value,kind:'native-task-consequence-reference'});
}
export function copyNativeTaskConsequenceProposal(value){
 const nativeConsequence=nativeTaskConsequenceReferenceFromProposal(value),{worldBoundary}=nativeConsequence;
 if(value.nativeConsequence!==undefined&&!sameNativeTaskConsequenceReference(value.nativeConsequence,nativeConsequence)||value.motionMode!=='worker'||!Number.isSafeInteger(value.profile)||value.profile<0||value.motionFlags!==8||!Number.isFinite(value.radius)||value.radius<=0||
    ![value.origin?.x,value.origin?.z].every(Number.isFinite)||!['distance','speed','runDistance','runSpeed','runBudget'].every(k=>Number.isFinite(value[k])&&value[k]>=0)||!(value.points instanceof Float32Array)||value.points.length<2||value.points.length%2||value.points.length>8192||!value.points.every(Number.isFinite)||!Array.isArray(value.gates)||value.gates.length>1024)throw TypeError('Invalid native consequence motion');
 const rows=copyNativePresentationSamples(value),gates=value.gates.map(g=>copyNativeGatePresentation(g,{worldBoundary,startTime:value.startTime,endTime:value.endTime}));
 if(rows[1]!==value.origin.x||rows[2]!==value.origin.z||new Set(gates.map(g=>g.gateId)).size!==gates.length)throw TypeError('Invalid native consequence origin or gates');
 return Object.freeze({kind:value.kind,version:1,ticket:Object.freeze({...value.ticket}),worldBoundary,nativeConsequence,...Object.fromEntries(sourceKeys.map(k=>[k,nativeConsequence[k]])),sourceAction:nativeConsequence.sourceAction,destination:nativeConsequence.destination,expectedRouteHandle:nativeConsequence.expectedRouteHandle,sourceControlSequence:nativeConsequence.sourceControlSequence,
  profile:value.profile,motionFlags:8,radius:value.radius,origin:Object.freeze({x:value.origin.x,z:value.origin.z}),startTime:value.startTime,endTime:value.endTime,distance:value.distance,speed:value.speed,runDistance:value.runDistance,runSpeed:value.runSpeed,runBudget:value.runBudget,motionMode:'worker',rowWidth:16,rows,points:value.points.slice(),gates:Object.freeze(gates),authorizedAutonomy:false,authorizedConsequences:false});
}
export function copyNativeTaskConsequenceAttestation(value){
 if(value?.kind!=='native-task-consequence-attestation'||value.version!==1||value.projectionVersion!==1)throw TypeError('Invalid native consequence attestation');
 const reference=copyNativeTaskConsequenceReference(value.reference),preparedReference=copyNativeTaskConsequenceReference(value.preparedReference),assignmentSequence=value.assignmentSequence,gateIds=value.gateIds;
 if(!id(assignmentSequence)||assignmentSequence<=reference.sourceControlSequence||!sameSource(reference,preparedReference)||reference.worldBoundary.ticket<preparedReference.worldBoundary.ticket||reference.worldBoundary.effectiveTime<preparedReference.worldBoundary.effectiveTime||reference.sourceControlSequence<preparedReference.sourceControlSequence||
    floorFloat32(reference.endTime-reference.worldBoundary.effectiveTime)!==floorFloat32(preparedReference.endTime-preparedReference.worldBoundary.effectiveTime)||!Array.isArray(gateIds)||gateIds.length>1024||gateIds.some(n=>!id(n))||new Set(gateIds).size!==gateIds.length)throw TypeError('Native consequence differs from its prepared source');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,reference,preparedReference,assignmentSequence,gateIds:Object.freeze([...gateIds])});
}
export const nativeTaskConsequenceAttestationCovers=(proof,reference)=>sameNativeTaskConsequenceReference(proof?.reference,reference)||sameNativeTaskConsequenceReference(proof?.preparedReference,reference);
export function nativeTaskConsequencePresentationMatches(prepared,actual,value){
 const b=copyNativeTaskConsequenceAttestation(value),r=b.reference,route=actual?.nativeRoute;
 return sameNativeTaskConsequenceReference(b.preparedReference,prepared.nativeConsequence)&&route?.actorId===r.actorId&&route.assignmentSequence===b.assignmentSequence&&sameHandle(route.routeHandle,r.expectedRouteHandle)&&actual.startTime===r.worldBoundary.effectiveTime&&actual.endTime===r.endTime&&nativeMotionPresentationMatches(prepared,actual,b.gateIds);
}
