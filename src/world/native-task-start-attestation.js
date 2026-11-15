import {floorFloat32} from '../float32-time.js';
import {copyNativeTaskStartReference,sameNativeTaskStartReference} from './native-task-start-reference.js';

// Copied ONLY as a direct native-source fact. A preparer cannot install it.
export function copyNativeTaskStartAttestation(value){
 const reference=copyNativeTaskStartReference(value?.reference),preparedReference=copyNativeTaskStartReference(value?.preparedReference),assignmentSequence=value?.assignmentSequence,gateIds=value?.gateIds;
 if(!Number.isSafeInteger(assignmentSequence)||assignmentSequence<=reference.sourceControlSequence||value.projectionVersion!==1||!['actorId','bodyId','taskId','targetId','requestSequence','requestedAt'].every(key=>reference[key]===preparedReference[key])||!['sourceRequestHandle','expectedRouteHandle'].every(field=>['authorityEpoch','session','slot','generation'].every(key=>reference[field][key]===preparedReference[field][key]))||reference.worldBoundary.ticket<preparedReference.worldBoundary.ticket||reference.worldBoundary.effectiveTime<preparedReference.worldBoundary.effectiveTime||reference.sourceControlSequence<preparedReference.sourceControlSequence||floorFloat32(reference.endTime-reference.worldBoundary.effectiveTime)!==floorFloat32(preparedReference.endTime-preparedReference.worldBoundary.effectiveTime)||!Array.isArray(gateIds)||gateIds.length>1024||gateIds.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(gateIds).size!==gateIds.length)throw TypeError('Invalid native task start assignment attestation');
 return Object.freeze({reference,preparedReference,assignmentSequence,projectionVersion:1,gateIds:Object.freeze([...gateIds])});
}
export function nativeTaskStartAttestationCovers(value,reference){return sameNativeTaskStartReference(value?.reference,reference)||sameNativeTaskStartReference(value?.preparedReference,reference);}
