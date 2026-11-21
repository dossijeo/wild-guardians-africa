import {nativeMotionPresentationMatches} from './native-motion-presentation-match.js';
import {floorFloat32} from '../float32-time.js';
import {copyNativeTaskStartReference,sameNativeTaskStartReference} from './native-task-start-reference.js';

// Copied ONLY as a direct native-source fact. A preparer cannot install it.
export function copyNativeTaskStartAttestation(value){
 const reference=copyNativeTaskStartReference(value?.reference),preparedReference=copyNativeTaskStartReference(value?.preparedReference),assignmentSequence=value?.assignmentSequence,gateIds=value?.gateIds;
 if(!Number.isSafeInteger(assignmentSequence)||assignmentSequence<=reference.sourceControlSequence||value.projectionVersion!==1||!['actorId','bodyId','taskId','targetId','requestSequence','requestedAt'].every(key=>reference[key]===preparedReference[key])||!['sourceRequestHandle','expectedRouteHandle'].every(field=>['authorityEpoch','session','slot','generation'].every(key=>reference[field][key]===preparedReference[field][key]))||reference.worldBoundary.ticket<preparedReference.worldBoundary.ticket||reference.worldBoundary.effectiveTime<preparedReference.worldBoundary.effectiveTime||reference.sourceControlSequence<preparedReference.sourceControlSequence||floorFloat32(reference.endTime-reference.worldBoundary.effectiveTime)!==floorFloat32(preparedReference.endTime-preparedReference.worldBoundary.effectiveTime)||!Array.isArray(gateIds)||gateIds.length>1024||gateIds.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(gateIds).size!==gateIds.length)throw TypeError('Invalid native task start assignment attestation');
 return Object.freeze({reference,preparedReference,assignmentSequence,projectionVersion:1,gateIds:Object.freeze([...gateIds])});
}
export function nativeTaskStartAttestationCovers(value,reference){return sameNativeTaskStartReference(value?.reference,reference)||sameNativeTaskStartReference(value?.preparedReference,reference);}

export function nativeTaskStartPresentationMatches(prepared,actual,value){
 const binding=copyNativeTaskStartAttestation(value),route=actual?.nativeRoute,reference=binding.reference;
 if(!sameNativeTaskStartReference(binding.preparedReference,prepared.nativeStart)||route?.actorId!==reference.actorId||route.assignmentSequence!==binding.assignmentSequence||JSON.stringify(route.routeHandle)!==JSON.stringify(reference.expectedRouteHandle)||actual.startTime!==reference.worldBoundary.effectiveTime||actual.endTime!==reference.endTime)return false;
 return nativeMotionPresentationMatches(prepared,actual,binding.gateIds);
}
