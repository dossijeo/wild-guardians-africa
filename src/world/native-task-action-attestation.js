import {copyNativeTaskActionReference,sameNativeTaskActionReference,nativeTaskActionSuccessor,nativeTaskActionReferenceFromProposal,nativeTaskActionActor} from './native-task-action-presentation.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {nativeEntityNumericId} from './native-entity-id.js';

// Metadata read back from the current native action. A prepared candidate or
// a caller's guessed event sequence cannot install it in the control mirror.
export function copyNativeTaskActionAttestation(value){
 if(value?.kind!=='native-task-action-attestation'||value.version!==1||value.projectionVersion!==1||!Number.isSafeInteger(value.actionSequence)||value.actionSequence<=0||Object.keys(value).some(k=>!['kind','version','projectionVersion','actionSequence','reference','preparedReference'].includes(k)))throw TypeError('Invalid native task action attestation');
 const reference=copyNativeTaskActionReference(value.reference),preparedReference=copyNativeTaskActionReference(value.preparedReference);
 if(value.actionSequence<=reference.sourceControlSequence||!sameNativeTaskActionReference(reference,preparedReference)&&!nativeTaskActionSuccessor(preparedReference,reference))throw TypeError('Native action differs from its prepared source');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,actionSequence:value.actionSequence,reference,preparedReference});
}
export function nativeTaskActionAttestationCovers(proof,reference){return !!proof&&(sameNativeTaskActionReference(proof.reference,reference)||sameNativeTaskActionReference(proof.preparedReference,reference));}
export function sameNativeTaskActionAttestation(a,b){
 return !!a&&!!b&&a.actionSequence===b.actionSequence&&
   sameNativeTaskActionReference(a.reference,b.reference)&&sameNativeTaskActionReference(a.preparedReference,b.preparedReference);
}

export function nativeTaskActionProjectionMatches(execution,worker,task,at){
 const ref=execution?.binding?.reference,q=ref?.request,action=worker?.nativeTaskAction;
 return !!q&&!!worker&&!!task&&execution.kind==='native-task-action-execution'&&execution.completed===false&&
   execution.executedThrough===at&&at>=ref.startTime&&at<ref.endTime&&
   worker.id===`worker-${nativeTaskActionActor(q)}`&&worker.status==='acting'&&worker.nativeRouteAdmission==='native-action'&&
   worker.taskId===task.id&&task.workerId===worker.id&&nativeEntityNumericId(task.id)===q.taskId&&
   task.kind===q.actionKind&&nativeEntityNumericId(task.targetId)===q.targetId&&
   action?.version===1&&action.kind===q.actionKind&&action.duration===q.duration&&action.elapsed===execution.elapsed&&
   worker.actionRemaining===q.duration-execution.elapsed&&worker.x===ref.origin.x&&worker.z===ref.origin.z&&worker.heading===q.heading&&
   Array.isArray(worker.path)&&worker.path.length===0&&worker.running===false&&worker.gateWaiting===false&&
   !worker.crateId&&!worker.incapacitated&&!worker.recovery&&!worker.recoveryExitRemaining&&!worker.fallRemaining&&!worker.raidReturn&&
   ['runPhase','walkPhase','carryPhase','runRemaining'].every(key=>worker[key]===ref[key]);
}
export function copyNativeTaskActionResources(value){
 if(value?.version!==1||value.kind!==15||value.phase!=='committed'||Object.keys(value).some(k=>!['version','kind','phase','worldBoundary','nativeTaskActionBinding'].includes(k)))throw TypeError('Invalid native task action resources');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),nativeTaskActionBinding=copyNativeTaskActionAttestation(value.nativeTaskActionBinding);
 if(!sameNativeWorldBoundary(worldBoundary,nativeTaskActionBinding.reference.worldBoundary))throw TypeError('Native action resource boundary mismatch');
 return Object.freeze({version:1,kind:15,phase:'committed',worldBoundary,nativeTaskActionBinding});
}
export function nativeTaskActionPresentationMatches(proposal,value,binding){
 try{const prepared=nativeTaskActionReferenceFromProposal(proposal),resources=copyNativeTaskActionResources(value),proof=copyNativeTaskActionAttestation(binding);return nativeTaskActionAttestationCovers(proof,prepared)&&resources.nativeTaskActionBinding.actionSequence===proof.actionSequence&&sameNativeTaskActionReference(resources.nativeTaskActionBinding.reference,proof.reference)&&sameNativeTaskActionReference(resources.nativeTaskActionBinding.preparedReference,proof.preparedReference);}catch{return false;}
}
