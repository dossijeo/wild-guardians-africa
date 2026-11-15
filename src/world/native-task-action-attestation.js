import {copyNativeTaskActionReference,sameNativeTaskActionReference,nativeTaskActionSuccessor} from './native-task-action-presentation.js';

// Metadata read back from the current native action. A prepared candidate or
// a caller's guessed event sequence cannot install it in the control mirror.
export function copyNativeTaskActionAttestation(value){
 if(value?.kind!=='native-task-action-attestation'||value.version!==1||value.projectionVersion!==1||!Number.isSafeInteger(value.actionSequence)||value.actionSequence<=0||Object.keys(value).some(k=>!['kind','version','projectionVersion','actionSequence','reference','preparedReference'].includes(k)))throw TypeError('Invalid native task action attestation');
 const reference=copyNativeTaskActionReference(value.reference),preparedReference=copyNativeTaskActionReference(value.preparedReference);
 if(value.actionSequence<=reference.sourceControlSequence||!sameNativeTaskActionReference(reference,preparedReference)&&!nativeTaskActionSuccessor(preparedReference,reference))throw TypeError('Native action differs from its prepared source');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,actionSequence:value.actionSequence,reference,preparedReference});
}
export function nativeTaskActionAttestationCovers(proof,reference){return !!proof&&(sameNativeTaskActionReference(proof.reference,reference)||sameNativeTaskActionReference(proof.preparedReference,reference));}
