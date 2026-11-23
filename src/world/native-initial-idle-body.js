import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeInitialIdleRequestReference,sameNativeInitialIdleRequestReference} from './native-initial-idle-request-reference.js';
import {copyNativeTaskActionAttestation} from './native-task-action-attestation.js';
import {nativeTaskActionActor} from './native-task-action-presentation.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const actionSourceFields=['wateringSource','centerRepairSource','wallRepairSource'];
const fields=['kind','version','actorId','bodyId','profile','sourceControlSequence','worldBoundary','sourceRequest','cancellationSource',...actionSourceFields];
const actionSourceField=value=>actionSourceFields.find(field=>value[field]!==undefined);
export const nativeInitialIdleActionSource=value=>value?.wateringSource??value?.centerRepairSource??value?.wallRepairSource??null;
const cancellationPoseFields=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
const cancellationFields=['kind','version','phase','actorId','taskId','targetId','nativeSession','sourceSequence','routeSlot','routeGeneration','bodyId','sourceAt','pose','bodyFlags'];

export function copyNativeTaskCancellationSource(value){
 if(value?.kind!=='native-task-cancellation-source'||value.version!==1||Object.keys(value).some(key=>!cancellationFields.includes(key)))throw TypeError('Invalid native Task cancellation source');
 const {phase,actorId,taskId,targetId,nativeSession,sourceSequence,routeSlot,routeGeneration,bodyId,sourceAt,bodyFlags}=value;
 const pose=value.pose;
 if(![6,14,15,25].includes(phase)||![actorId,taskId,targetId,nativeSession,sourceSequence,bodyId].every(id)||
  !Number.isSafeInteger(routeSlot)||routeSlot<0||!Number.isSafeInteger(routeGeneration)||routeGeneration<0||
  ([6,15].includes(phase)?(routeSlot!==0||routeGeneration!==0):!id(routeGeneration))||!Number.isFinite(sourceAt)||sourceAt<0||
  !Number.isSafeInteger(bodyFlags)||bodyFlags<0||!pose||Object.keys(pose).length!==cancellationPoseFields.length||
  cancellationPoseFields.some(key=>!Number.isFinite(pose[key]))||pose.radius<=0||pose.runRemaining<0)throw TypeError('Invalid native Task cancellation identity or pose');
 return Object.freeze({kind:value.kind,version:1,phase,actorId,taskId,targetId,nativeSession,sourceSequence,routeSlot,routeGeneration,bodyId,sourceAt,
  pose:Object.freeze(Object.fromEntries(cancellationPoseFields.map(key=>[key,pose[key]]))),bodyFlags});
}

export function sameNativeTaskCancellationSource(a,b){
 try{return JSON.stringify(copyNativeTaskCancellationSource(a))===JSON.stringify(copyNativeTaskCancellationSource(b));}catch{return false;}
}

// The direct pending declaration is not an acquired action proof. Body/pose
// come from the same native prepared Idle20 proposal and its terrain owner.
export function nativeTaskCancellationMatchesPendingAction(source,request){
 return source?.phase===6&&request?.kind==='native-task-action-restore-reference'&&
  source.actorId===request.actorId&&source.taskId===request.taskId&&source.targetId===request.targetId&&
  source.nativeSession===request.nativeSession&&source.sourceSequence===request.requestSequence&&source.sourceAt===request.requestedAt;
}

export function nativeTaskCancellationMatchesAction(source,binding){
 const r=binding?.reference,q=r?.request,p=source?.pose;
 return source?.phase===15&&!!q&&nativeTaskActionActor(q)===source.actorId&&q.taskId===source.taskId&&q.targetId===source.targetId&&
  q.bodyId===source.bodyId&&r.worldBoundary.nativeSession===source.nativeSession&&binding.actionSequence===source.sourceSequence&&r.startTime===source.sourceAt&&
  r.origin.x===p.x&&r.origin.z===p.z&&q.heading===p.yaw&&['radius','runPhase','walkPhase','carryPhase','runRemaining'].every(key=>r[key]===p[key]);
}

export function nativeTaskCancellationMatchesTerminalRoute(source,binding){
 const r=binding?.reference,h=r?.expectedRouteHandle;
 return source?.phase===14&&!!h&&source.actorId===r.actorId&&source.taskId===r.taskId&&source.targetId===r.targetId&&source.bodyId===r.bodyId&&
  source.sourceSequence===binding.assignmentSequence&&source.nativeSession===h.session&&source.routeSlot===h.slot&&source.routeGeneration===h.generation&&source.sourceAt===r.endTime;
}

export function nativeTaskCancellationMatchesHeldRoute(source,held,generation){
 const r=held?.nativeRoute,h=r?.routeHandle;
 return source?.phase===25&&!!h&&source.actorId===r.actorId&&source.bodyId===held.bodyId&&source.sourceSequence===r.assignmentSequence&&
  source.nativeSession===h.session&&source.routeSlot===h.slot&&source.routeGeneration===generation&&source.sourceAt===held.suspendedAt&&
  cancellationPoseFields.every(key=>source.pose[key]===held.pose[key]);
}

// Residency of the held, initialized Idle/Alert pose. There is no task, route,
// action duration or authorization to run the remaining Idle policy here.
export function copyNativeInitialIdleBodyReference(value){
 if(value?.kind!=='native-initial-idle-body-reference'||value.version!==1||Object.keys(value).some(k=>!fields.includes(k)))throw TypeError('Invalid native initial Idle body reference');
 const sourceRequest=copyNativeInitialIdleRequestReference(value.sourceRequest),worldBoundary=copyNativeWorldBoundary(value.worldBoundary);
 if(!sourceRequest.idleState||value.actorId!==sourceRequest.actorId||value.bodyId!==sourceRequest.bodyId||value.profile!==sourceRequest.profile||!id(value.sourceControlSequence)||value.sourceControlSequence<sourceRequest.requestSequence||
  worldBoundary.authorityEpoch!==sourceRequest.authorityEpoch||worldBoundary.nativeSession!==sourceRequest.nativeSession||worldBoundary.effectiveTime<sourceRequest.requestedAt)throw TypeError('Native initial Idle body differs from its held source');
 const sourceField=actionSourceField(value);
 if(sourceField&&actionSourceFields.some(field=>field!==sourceField&&value[field]!==undefined))throw TypeError('Multiple native initial Idle action sources');
 const cancellationSource=value.cancellationSource===undefined?null:copyNativeTaskCancellationSource(value.cancellationSource);
 if(cancellationSource&&(sourceField||cancellationSource.actorId!==sourceRequest.actorId||cancellationSource.bodyId!==sourceRequest.bodyId||
  cancellationSource.nativeSession!==sourceRequest.nativeSession||cancellationSource.sourceSequence!==sourceRequest.requestSequence||
  cancellationSource.sourceAt>sourceRequest.requestedAt||cancellationSource.bodyFlags!==sourceRequest.bodyFlags||
  cancellationPoseFields.some(key=>cancellationSource.pose[key]!==sourceRequest.pose[key])))throw TypeError('Native Idle body differs from its cancelled Task');
 const actionSource=sourceField?copyNativeTaskActionAttestation(value[sourceField]):null;
 if(actionSource){
  const action=actionSource.reference,request=action.request,pose=sourceRequest.pose;
  const supported=sourceField==='wateringSource'?['initial','water'].includes(request.actionKind):request.actionKind==='repair';
  if(!supported||nativeTaskActionActor(request)!==sourceRequest.actorId||request.bodyId!==sourceRequest.bodyId||
     action.worldBoundary.authorityEpoch!==sourceRequest.authorityEpoch||action.worldBoundary.nativeSession!==sourceRequest.nativeSession||action.worldBoundary.ticket>=worldBoundary.ticket||
     actionSource.actionSequence!==sourceRequest.requestSequence||action.endTime!==sourceRequest.requestedAt||action.profile!==sourceRequest.profile||
     pose.x!==action.origin.x||pose.z!==action.origin.z||pose.yaw!==request.heading||['radius','runPhase','walkPhase','carryPhase','runRemaining'].some(key=>pose[key]!==action[key]))throw TypeError('Native Idle body differs from its completed action');
 }
 return Object.freeze({kind:value.kind,version:1,actorId:value.actorId,bodyId:value.bodyId,profile:value.profile,sourceControlSequence:value.sourceControlSequence,worldBoundary,sourceRequest,...(actionSource?{[sourceField]:actionSource}:{}),...(cancellationSource?{cancellationSource}:{})});
}
export function sameNativeInitialIdleBodyReference(a,b){try{return JSON.stringify(copyNativeInitialIdleBodyReference(a))===JSON.stringify(copyNativeInitialIdleBodyReference(b));}catch{return false;}}
export function nativeInitialIdleBodySuccessor(previous,next){
 const a=copyNativeInitialIdleBodyReference(previous),b=copyNativeInitialIdleBodyReference(next);
 return sameNativeInitialIdleRequestReference(a.sourceRequest,b.sourceRequest)&&actionSourceField(a)===actionSourceField(b)&&
  JSON.stringify(nativeInitialIdleActionSource(a))===JSON.stringify(nativeInitialIdleActionSource(b))&&b.sourceControlSequence>=a.sourceControlSequence&&
  (!a.cancellationSource&&!b.cancellationSource||sameNativeTaskCancellationSource(a.cancellationSource,b.cancellationSource))&&
  a.worldBoundary.authorityEpoch===b.worldBoundary.authorityEpoch&&a.worldBoundary.nativeSession===b.worldBoundary.nativeSession&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime&&
  (b.worldBoundary.ticket>a.worldBoundary.ticket||sameNativeInitialIdleBodyReference(a,b));
}
export function copyNativeInitialIdleBodyProposal(value){
 if(value?.kind!=='native-initial-idle-body-proposal'||value.version!==1||Object.keys(value).some(k=>!['kind','version','ticket','worldBoundary','nativeInitialIdleBody','authorizedAutonomy','authorizedPassage'].includes(k))||value.authorizedAutonomy!==undefined&&value.authorizedAutonomy!==false||value.authorizedPassage!==undefined&&value.authorizedPassage!==false)throw TypeError('Invalid native initial Idle body proposal');
 const nativeInitialIdleBody=copyNativeInitialIdleBodyReference(value.nativeInitialIdleBody),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),t=value.ticket;
 if(!sameNativeWorldBoundary(worldBoundary,nativeInitialIdleBody.worldBoundary)||t?.kind!=='native-initial-idle-body-proposal-ticket'||Object.keys(t).some(k=>!['kind','authorityEpoch','session','ticket'].includes(k))||t.authorityEpoch!==worldBoundary.authorityEpoch||t.session!==worldBoundary.nativeSession||t.ticket!==worldBoundary.ticket)throw TypeError('Native initial Idle body ticket differs from its resources');
 return Object.freeze({kind:value.kind,version:1,ticket:Object.freeze({...t}),worldBoundary,nativeInitialIdleBody,authorizedAutonomy:false,authorizedPassage:false});
}
export const nativeInitialIdleBodyReferenceFromProposal=value=>copyNativeInitialIdleBodyProposal(value).nativeInitialIdleBody;
export function copyNativeInitialIdleBodyAttestation(value){
 if(value?.kind!=='native-initial-idle-body-attestation'||value.version!==1||value.projectionVersion!==1||!id(value.bodySequence)||Object.keys(value).some(k=>!['kind','version','projectionVersion','bodySequence','reference','preparedReference'].includes(k)))throw TypeError('Invalid native initial Idle body attestation');
 const reference=copyNativeInitialIdleBodyReference(value.reference),preparedReference=copyNativeInitialIdleBodyReference(value.preparedReference);
 if(value.bodySequence<=reference.sourceControlSequence||!nativeInitialIdleBodySuccessor(preparedReference,reference))throw TypeError('Native initial Idle body differs from its prepared source');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,bodySequence:value.bodySequence,reference,preparedReference});
}
export const nativeInitialIdleBodyAttestationCovers=(proof,reference)=>sameNativeInitialIdleBodyReference(proof?.reference,reference)||sameNativeInitialIdleBodyReference(proof?.preparedReference,reference);
export function nativeInitialIdleBodyReferenceCovered(reference,boundary){const w=reference.worldBoundary;return !!boundary&&w.authorityEpoch===boundary.authorityEpoch&&w.nativeSession===boundary.nativeSession&&boundary.ticket>=w.ticket&&boundary.effectiveTime>=w.effectiveTime;}
export function copyNativeInitialIdleBodyResources(value){
 if(value?.version!==1||value.kind!==20||value.phase!=='committed'||Object.keys(value).some(k=>!['version','kind','phase','worldBoundary','nativeInitialIdleBodyBinding'].includes(k)))throw TypeError('Invalid native initial Idle body resources');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),nativeInitialIdleBodyBinding=copyNativeInitialIdleBodyAttestation(value.nativeInitialIdleBodyBinding);
 if(!sameNativeWorldBoundary(worldBoundary,nativeInitialIdleBodyBinding.reference.worldBoundary))throw TypeError('Native initial Idle body resource boundary mismatch');
 return Object.freeze({version:1,kind:20,phase:'committed',worldBoundary,nativeInitialIdleBodyBinding});
}
export function nativeInitialIdleBodyPresentationMatches(proposal,value,binding){
 try{const prepared=nativeInitialIdleBodyReferenceFromProposal(proposal),resources=copyNativeInitialIdleBodyResources(value),proof=copyNativeInitialIdleBodyAttestation(binding),actual=resources.nativeInitialIdleBodyBinding;return nativeInitialIdleBodyAttestationCovers(proof,prepared)&&actual.bodySequence===proof.bodySequence&&sameNativeInitialIdleBodyReference(actual.reference,proof.reference)&&sameNativeInitialIdleBodyReference(actual.preparedReference,proof.preparedReference);}catch{return false;}
}
