import {copyNativeHomeRequestReference,nativeHomeRequestContinuesHeldWorker} from './native-home-request-reference.js';
import {sameNativeRouteReference} from './native-route-reference.js';
import {copyNativeSuspendedBodyReference} from './native-suspended-body-reference.js';
import {copyNativeTaskStartAttestation} from './native-task-start-attestation.js';
import {copyNativeTaskStartProposal} from './native-task-start-presentation.js';
import {sameNativeTaskStartReference} from './native-task-start-reference.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {nativeTaskRouteStopCodec as codec} from './native-worker-route-stop-codec.js';
import {copySettledStopGates,stoppedGateSourcesMatch,stoppedRecoveryProjectionMatches} from './native-stop24-task-recovery.js';

export function copyTask25HomeSource(input){
 const proof=codec.copyAttestation(input?.proof),task=copyNativeTaskStartAttestation(input.task),
  request=copyNativeHomeRequestReference(input.request),revokedSequence=input.revokedSequence;
 const r=proof.reference,worldBoundary=r.worldBoundary,source=task.reference,[owner]=r.routes;
 if(!proof.projection||r.routes.length!==1||owner.state!==4||
    !sameNativeRouteReference(r.sourceRoute,{actorId:source.actorId,assignmentSequence:task.assignmentSequence,routeHandle:source.expectedRouteHandle})||
    owner.bodyId!==source.bodyId||request.version!==1||request.authorityEpoch!==worldBoundary.authorityEpoch||
    request.nativeSession!==worldBoundary.nativeSession||!Number.isSafeInteger(revokedSequence)||
    revokedSequence<=task.assignmentSequence||request.requestSequence<=revokedSequence||request.requestedAt!==worldBoundary.effectiveTime||
    source.worldBoundary.ticket>=worldBoundary.ticket||source.worldBoundary.effectiveTime>=worldBoundary.effectiveTime||worldBoundary.effectiveTime>=source.endTime)
   throw Error('Invalid stopped Task Home recovery source');
 const p=proof.projection.routeEffects.rows.slice(8,26),pose=Object.freeze({x:p[0],z:p[1],yaw:p[4],radius:request.pose.radius,
   runPhase:p[9],walkPhase:p[10],carryPhase:p[11],runRemaining:p[14]});
 const held=Object.freeze({kind:'native-task-route-held-execution',nativeRoute:owner.nativeRoute,bodyId:owner.bodyId,
   profile:request.profile,suspendedAt:worldBoundary.effectiveTime,pose});
 if(!nativeHomeRequestContinuesHeldWorker(request,held))throw Error('Recovered Task25 differs from the pending Home pose');
 const selector=codec.copyStoppedBody({kind:codec.stoppedBodyKind,version:1,actorId:source.actorId,stop:r});
 const bodyReference=copyNativeSuspendedBodyReference({kind:'native-suspended-body',version:1,nativeRoute:owner.nativeRoute,
   worldBoundary,bodyId:owner.bodyId,resumeGeneration:owner.resumeGeneration,suspendedAt:worldBoundary.effectiveTime});
 const reference=Object.freeze({actorId:source.actorId,bodyId:owner.bodyId,worldBoundary,selector,epoch:task.preparedReference.worldBoundary.effectiveTime});
 const settledGates=copySettledStopGates(input.settledGates,proof,task);
 return Object.freeze({kind:'native-task25-home-recovery',version:1,proof,task,request,revokedSequence,reference,bodyReference,held,
   ...(settledGates.length?{settledGates}:{})});
}

export const sameTask25HomeSource=(a,b)=>{try{return JSON.stringify(copyTask25HomeSource(a))===JSON.stringify(copyTask25HomeSource(b));}catch{return false;}};
export const sameTask25HomeClock=(selector,ref)=>codec.sameStoppedBody(selector?.selector??selector,ref?.selector??ref);
export const task25ProjectionMatches=(row,proof)=>stoppedRecoveryProjectionMatches(row,proof,proof.task.reference.worldBoundary.effectiveTime);

export function copyTask25HomeResources(value){
 if(value?.kind!==25||value.version!==1||value.phase!=='committed'||
    Object.keys(value).some(key=>!['version','kind','phase','worldBoundary','stoppedHomeBinding','taskTemplate'].includes(key)))
   throw Error('Invalid Task25 recovery resources');
 const stoppedHomeBinding=copyTask25HomeSource(value.stoppedHomeBinding),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),
   taskTemplate=copyNativeTaskStartProposal(value.taskTemplate);
 if(!sameNativeWorldBoundary(worldBoundary,stoppedHomeBinding.reference.worldBoundary)||
    !stoppedGateSourcesMatch(taskTemplate.gates,stoppedHomeBinding.proof,stoppedHomeBinding.task,stoppedHomeBinding.settledGates)||
    !sameNativeTaskStartReference(taskTemplate.nativeStart,stoppedHomeBinding.task.preparedReference)||
    taskTemplate.profile!==stoppedHomeBinding.held.profile||taskTemplate.radius!==stoppedHomeBinding.held.pose.radius||taskTemplate.motionFlags&8)
   throw Error('Task25 recovery lost its admitted Task table');
 return Object.freeze({kind:25,version:1,phase:'committed',worldBoundary,stoppedHomeBinding,taskTemplate});
}
