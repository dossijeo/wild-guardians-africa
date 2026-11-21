import {copyNativeTaskActionReference,sameNativeTaskActionReference,nativeTaskActionSuccessor,nativeTaskActionReferenceFromProposal} from './native-task-action-presentation.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';

// Metadata read back from the current native action. A prepared candidate or
// a caller's guessed event sequence cannot install it in the control mirror.
export function copyNativeTaskActionAttestation(value){
 if(value?.kind!=='native-task-action-attestation'||value.version!==1||value.projectionVersion!==1||!Number.isSafeInteger(value.actionSequence)||value.actionSequence<=0||Object.keys(value).some(k=>!['kind','version','projectionVersion','actionSequence','reference','preparedReference'].includes(k)))throw TypeError('Invalid native task action attestation');
 const reference=copyNativeTaskActionReference(value.reference),preparedReference=copyNativeTaskActionReference(value.preparedReference);
 if(value.actionSequence<=reference.sourceControlSequence||!sameNativeTaskActionReference(reference,preparedReference)&&!nativeTaskActionSuccessor(preparedReference,reference))throw TypeError('Native action differs from its prepared source');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,actionSequence:value.actionSequence,reference,preparedReference});
}
export function nativeTaskActionAttestationCovers(proof,reference){return !!proof&&(sameNativeTaskActionReference(proof.reference,reference)||sameNativeTaskActionReference(proof.preparedReference,reference));}
export function copyNativeTaskActionResources(value){
 if(value?.version!==1||value.kind!==15||value.phase!=='committed'||Object.keys(value).some(k=>!['version','kind','phase','worldBoundary','nativeTaskActionBinding'].includes(k)))throw TypeError('Invalid native task action resources');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),nativeTaskActionBinding=copyNativeTaskActionAttestation(value.nativeTaskActionBinding);
 if(!sameNativeWorldBoundary(worldBoundary,nativeTaskActionBinding.reference.worldBoundary))throw TypeError('Native action resource boundary mismatch');
 return Object.freeze({version:1,kind:15,phase:'committed',worldBoundary,nativeTaskActionBinding});
}
export function nativeTaskActionPresentationMatches(proposal,value,binding){
 try{const prepared=nativeTaskActionReferenceFromProposal(proposal),resources=copyNativeTaskActionResources(value),proof=copyNativeTaskActionAttestation(binding);return nativeTaskActionAttestationCovers(proof,prepared)&&resources.nativeTaskActionBinding.actionSequence===proof.actionSequence&&sameNativeTaskActionReference(resources.nativeTaskActionBinding.reference,proof.reference)&&sameNativeTaskActionReference(resources.nativeTaskActionBinding.preparedReference,proof.preparedReference);}catch{return false;}
}
