import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';

// Transport identities for a solid addition prepared by the existing world
// owner. These values issue neither route nor clock permissions.
const shapeKeys=['entityId','x','z','halfX','halfZ','yaw','passMask'];
const only=(value,keys)=>value&&Object.keys(value).every(key=>keys.includes(key));
export function copyNativeBarrierAdditions(value){
 if(!Array.isArray(value)||!value.length||value.length>256)throw TypeError('Invalid native solid additions');
 const ids=new Set();return Object.freeze(value.map(item=>{
  if(!only(item,shapeKeys)||typeof item.entityId!=='string'||!item.entityId||item.entityId.length>256||ids.has(item.entityId)||item.passMask!==0||
   ['x','z','halfX','halfZ','yaw'].some(key=>!Number.isFinite(item[key])||Math.fround(item[key])!==item[key])||item.halfX<=0||item.halfZ<=0||item.halfX>100||item.halfZ>100)throw TypeError('Invalid native solid addition identity or shape');
  ids.add(item.entityId);return Object.freeze(Object.fromEntries(shapeKeys.map(key=>[key,item[key]])));
 }));
}
export function copyNativeBarrierAdditionReference(value){
 if(!only(value,['kind','version','worldBoundary','sourceControlSequence','additions'])||value.kind!=='native-barrier-addition-reference'||value.version!==1||!Number.isSafeInteger(value.sourceControlSequence)||value.sourceControlSequence<0)throw TypeError('Invalid native solid addition reference');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary);if(!worldBoundary)throw TypeError('Missing native solid addition boundary');
 return Object.freeze({kind:value.kind,version:1,worldBoundary,sourceControlSequence:value.sourceControlSequence,additions:copyNativeBarrierAdditions(value.additions)});
}
export const sameNativeBarrierAdditionReference=(a,b)=>{try{return JSON.stringify(copyNativeBarrierAdditionReference(a))===JSON.stringify(copyNativeBarrierAdditionReference(b));}catch{return false;}};
export function nativeBarrierAdditionSuccessor(a,b){
 a=copyNativeBarrierAdditionReference(a);b=copyNativeBarrierAdditionReference(b);const x=a.worldBoundary,y=b.worldBoundary;
 return a.sourceControlSequence===b.sourceControlSequence&&JSON.stringify(a.additions)===JSON.stringify(b.additions)&&x.authorityEpoch===y.authorityEpoch&&x.nativeSession===y.nativeSession&&y.effectiveTime>=x.effectiveTime&&(y.ticket>x.ticket||sameNativeBarrierAdditionReference(a,b));
}
export function copyNativeBarrierAdditionProposal(value){
 if(!only(value,['kind','version','worldBoundary','nativeBarrierAddition','authorizedAutonomy','authorizedConsequences'])||value.kind!=='native-barrier-addition-proposal'||value.version!==1||value.authorizedAutonomy!==false||value.authorizedConsequences!==false)throw TypeError('Invalid native solid addition proposal');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),nativeBarrierAddition=copyNativeBarrierAdditionReference(value.nativeBarrierAddition);
 if(!sameNativeWorldBoundary(worldBoundary,nativeBarrierAddition.worldBoundary))throw TypeError('Native solid addition proposal boundary mismatch');
 return Object.freeze({kind:value.kind,version:1,worldBoundary,nativeBarrierAddition,authorizedAutonomy:false,authorizedConsequences:false});
}
export const nativeBarrierAdditionReferenceFromProposal=value=>copyNativeBarrierAdditionProposal(value).nativeBarrierAddition;
export function copyNativeBarrierAdditionAttestation(value){
 if(!only(value,['kind','version','reference','preparedReference','nativeIds'])||value.kind!=='native-barrier-addition-attestation'||value.version!==1)throw TypeError('Invalid native solid addition attestation');
 const reference=copyNativeBarrierAdditionReference(value.reference),preparedReference=copyNativeBarrierAdditionReference(value.preparedReference),ids=value.nativeIds;
 if(!nativeBarrierAdditionSuccessor(preparedReference,reference)||!Array.isArray(ids)||ids.length!==reference.additions.length||ids.some(id=>!Number.isSafeInteger(id)||id<1||id>2147483647)||new Set(ids).size!==ids.length)throw TypeError('Native solid addition differs from its preparation');
 return Object.freeze({kind:value.kind,version:1,reference,preparedReference,nativeIds:Object.freeze([...ids])});
}
export function copyNativeBarrierAdditionResources(value){
 if(!only(value,['version','kind','phase','worldBoundary','nativeSession','ticket','effectiveTime','chunks','removed','nativeBarrierAdditionBinding'])||value.version!==1||value.kind!==2||value.phase!=='committed'||!Array.isArray(value.chunks)||value.chunks.length||!Array.isArray(value.removed)||value.removed.length)throw TypeError('Invalid native solid addition resources');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),nativeBarrierAdditionBinding=copyNativeBarrierAdditionAttestation(value.nativeBarrierAdditionBinding);
 if(!sameNativeWorldBoundary(worldBoundary,nativeBarrierAdditionBinding.reference.worldBoundary)||value.nativeSession!==worldBoundary.nativeSession||value.ticket!==worldBoundary.ticket||value.effectiveTime!==worldBoundary.effectiveTime)throw TypeError('Native solid addition resource boundary mismatch');
 return Object.freeze({version:1,kind:2,phase:'committed',worldBoundary,nativeSession:value.nativeSession,ticket:value.ticket,effectiveTime:value.effectiveTime,chunks:Object.freeze([]),removed:Object.freeze([]),nativeBarrierAdditionBinding});
}
export function nativeBarrierAdditionPresentationMatches(proposal,resources,binding){
 try{const prepared=nativeBarrierAdditionReferenceFromProposal(proposal),actual=copyNativeBarrierAdditionResources(resources).nativeBarrierAdditionBinding,proof=copyNativeBarrierAdditionAttestation(binding);return sameNativeBarrierAdditionReference(prepared,proof.preparedReference)&&JSON.stringify(actual)===JSON.stringify(proof);}catch{return false;}
}
