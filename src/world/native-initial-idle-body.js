import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeInitialIdleRequestReference,sameNativeInitialIdleRequestReference} from './native-initial-idle-request-reference.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const fields=['kind','version','actorId','bodyId','profile','sourceControlSequence','worldBoundary','sourceRequest'];
// Residency of the held, initialized Idle/Alert pose. There is no task, route,
// action duration or authorization to run the remaining Idle policy here.
export function copyNativeInitialIdleBodyReference(value){
 if(value?.kind!=='native-initial-idle-body-reference'||value.version!==1||Object.keys(value).some(k=>!fields.includes(k)))throw TypeError('Invalid native initial Idle body reference');
 const sourceRequest=copyNativeInitialIdleRequestReference(value.sourceRequest),worldBoundary=copyNativeWorldBoundary(value.worldBoundary);
 if(!sourceRequest.idleState||value.actorId!==sourceRequest.actorId||value.bodyId!==sourceRequest.bodyId||value.profile!==sourceRequest.profile||!id(value.sourceControlSequence)||value.sourceControlSequence<sourceRequest.requestSequence||
  worldBoundary.authorityEpoch!==sourceRequest.authorityEpoch||worldBoundary.nativeSession!==sourceRequest.nativeSession||worldBoundary.effectiveTime<sourceRequest.requestedAt)throw TypeError('Native initial Idle body differs from its held source');
 return Object.freeze({kind:value.kind,version:1,actorId:value.actorId,bodyId:value.bodyId,profile:value.profile,sourceControlSequence:value.sourceControlSequence,worldBoundary,sourceRequest});
}
export function sameNativeInitialIdleBodyReference(a,b){try{return JSON.stringify(copyNativeInitialIdleBodyReference(a))===JSON.stringify(copyNativeInitialIdleBodyReference(b));}catch{return false;}}
export function nativeInitialIdleBodySuccessor(previous,next){
 const a=copyNativeInitialIdleBodyReference(previous),b=copyNativeInitialIdleBodyReference(next);
 return sameNativeInitialIdleRequestReference(a.sourceRequest,b.sourceRequest)&&b.sourceControlSequence>=a.sourceControlSequence&&
  a.worldBoundary.authorityEpoch===b.worldBoundary.authorityEpoch&&a.worldBoundary.nativeSession===b.worldBoundary.nativeSession&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime&&
  (b.worldBoundary.ticket>a.worldBoundary.ticket||sameNativeInitialIdleBodyReference(a,b));
}
export function copyNativeInitialIdleBodyProposal(value){
 if(value?.kind!=='native-initial-idle-body-proposal'||value.version!==1||Object.keys(value).some(k=>!['kind','version','ticket','worldBoundary','nativeInitialIdleBody','authorizedAutonomy','authorizedPassage'].includes(k))||value.authorizedAutonomy!==undefined&&value.authorizedAutonomy!==false||value.authorizedPassage!==undefined&&value.authorizedPassage!==false)throw TypeError('Invalid native initial Idle body proposal');
 const nativeInitialIdleBody=copyNativeInitialIdleBodyReference(value.nativeInitialIdleBody),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),t=value.ticket;
 if(!sameNativeWorldBoundary(worldBoundary,nativeInitialIdleBody.worldBoundary)||t?.kind!=='native-initial-idle-body-proposal-ticket'||Object.keys(t).some(k=>!['kind','authorityEpoch','session','ticket'].includes(k))||t.authorityEpoch!==worldBoundary.authorityEpoch||t.session!==worldBoundary.nativeSession||t.ticket!==worldBoundary.ticket)throw TypeError('Native initial Idle body ticket differs from its resources');
 return Object.freeze({kind:value.kind,version:1,ticket:Object.freeze({...t}),worldBoundary,nativeInitialIdleBody,authorizedAutonomy:false,authorizedPassage:false});
}
export function copyNativeInitialIdleBodyAttestation(value){
 if(value?.kind!=='native-initial-idle-body-attestation'||value.version!==1||value.projectionVersion!==1||!id(value.bodySequence)||Object.keys(value).some(k=>!['kind','version','projectionVersion','bodySequence','reference','preparedReference'].includes(k)))throw TypeError('Invalid native initial Idle body attestation');
 const reference=copyNativeInitialIdleBodyReference(value.reference),preparedReference=copyNativeInitialIdleBodyReference(value.preparedReference);
 if(value.bodySequence<=reference.sourceControlSequence||!nativeInitialIdleBodySuccessor(preparedReference,reference))throw TypeError('Native initial Idle body differs from its prepared source');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,bodySequence:value.bodySequence,reference,preparedReference});
}
export const nativeInitialIdleBodyAttestationCovers=(proof,reference)=>sameNativeInitialIdleBodyReference(proof?.reference,reference)||sameNativeInitialIdleBodyReference(proof?.preparedReference,reference);
export function copyNativeInitialIdleBodyResources(value){
 if(value?.version!==1||value.kind!==20||value.phase!=='committed'||Object.keys(value).some(k=>!['version','kind','phase','worldBoundary','nativeInitialIdleBodyBinding'].includes(k)))throw TypeError('Invalid native initial Idle body resources');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),nativeInitialIdleBodyBinding=copyNativeInitialIdleBodyAttestation(value.nativeInitialIdleBodyBinding);
 if(!sameNativeWorldBoundary(worldBoundary,nativeInitialIdleBodyBinding.reference.worldBoundary))throw TypeError('Native initial Idle body resource boundary mismatch');
 return Object.freeze({version:1,kind:20,phase:'committed',worldBoundary,nativeInitialIdleBodyBinding});
}
