import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';

// Transport identities for additions prepared by the existing world owner.
// These values issue neither route nor clock permissions.
const dimensions=['x','z','halfX','halfZ','yaw'];
const geometryKeys=[...dimensions,'passMask'];
const shapeKeys=['entityId',...geometryKeys];
const gateKeys=['entityId','modelId','x','z','yaw','sx','sz','mechanismId','opening','rootMatrix','leafMatrix','proxies'];
const only=(value,keys)=>value&&Object.keys(value).every(key=>keys.includes(key));
const validGeometry=shape=>dimensions.every(key=>Number.isFinite(shape[key])&&Math.fround(shape[key])===shape[key])&&
 shape.halfX>0&&shape.halfZ>0&&shape.halfX<=100&&shape.halfZ<=100;
export function copyNativeBarrierAdditions(value){
 if(!Array.isArray(value)||!value.length||value.length>256)throw TypeError('Invalid native solid additions');
 const ids=new Set();return Object.freeze(value.map(item=>{
  if(!only(item,shapeKeys)||typeof item.entityId!=='string'||!item.entityId||item.entityId.length>256||ids.has(item.entityId)||item.passMask!==0||!validGeometry(item))throw TypeError('Invalid native solid addition identity or shape');
  ids.add(item.entityId);return Object.freeze(Object.fromEntries(shapeKeys.map(key=>[key,item[key]])));
 }));
}
function copyPreparedGate(value){
 const matrix=items=>Array.isArray(items)&&items.length===16&&items.every(Number.isFinite);
 const id=typeof value?.entityId==='string'&&/^structure-([1-9][0-9]*)$/.exec(value.entityId);
 if(!only(value,gateKeys)||!id||!Number.isSafeInteger(Number(id[1]))||![1,2,3].includes(value.modelId)||
    ![value.x,value.z,value.yaw,value.sx,value.sz].every(Number.isFinite)||value.sx<=0||value.sz<=0||
    !Number.isSafeInteger(value.mechanismId)||value.mechanismId<1||!Number.isFinite(value.opening)||value.opening<0||value.opening>1||
    !matrix(value.rootMatrix)||!matrix(value.leafMatrix)||value.rootMatrix[12]!==value.x||value.rootMatrix[14]!==value.z||
    !Array.isArray(value.proxies)||value.proxies.length!==3)
  throw TypeError('Invalid prepared native gate');
 const proxies=value.proxies.map((shape,index)=>{
  if(!only(shape,geometryKeys)||!validGeometry(shape)||shape.passMask!==(index===2?1:0))throw TypeError('Invalid native gate proxy');
  return Object.freeze(Object.fromEntries(geometryKeys.map(key=>[key,shape[key]])));
 });
 return Object.freeze({
  entityId:value.entityId,modelId:value.modelId,x:value.x,z:value.z,yaw:value.yaw,sx:value.sx,sz:value.sz,
  mechanismId:value.mechanismId,opening:value.opening,
  rootMatrix:Object.freeze([...value.rootMatrix]),leafMatrix:Object.freeze([...value.leafMatrix]),proxies:Object.freeze(proxies)
 });
}
function copyPreparedRemoval(value){
 const id=typeof value?.entityId==='string'&&/^structure-([1-9][0-9]*)$/.exec(value.entityId);
 if(!only(value,['entityId','mechanismId','nativeIds'])||!id||!Number.isSafeInteger(Number(id[1]))||!Number.isSafeInteger(value.mechanismId)||value.mechanismId<1||!Array.isArray(value.nativeIds)||value.nativeIds.length!==3||value.nativeIds.some(id=>!Number.isSafeInteger(id)||id<1||id>2147483647)||new Set(value.nativeIds).size!==3)throw TypeError('Invalid native gate removal identity');
 return Object.freeze({entityId:value.entityId,mechanismId:value.mechanismId,nativeIds:Object.freeze([...value.nativeIds])});
}
export function copyNativeBarrierAdditionReference(value){
 const variant=value?.version===3?'removal':value?.version===2?'gate':'additions';
 if(!only(value,['kind','version','worldBoundary','sourceControlSequence',variant])||value.kind!=='native-barrier-addition-reference'||![1,2,3].includes(value.version)||!Number.isSafeInteger(value.sourceControlSequence)||value.sourceControlSequence<0)throw TypeError('Invalid native solid addition reference');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary);if(!worldBoundary)throw TypeError('Missing native solid addition boundary');
 return Object.freeze({kind:value.kind,version:value.version,worldBoundary,sourceControlSequence:value.sourceControlSequence,
  [variant]:variant==='removal'?copyPreparedRemoval(value.removal):variant==='gate'?copyPreparedGate(value.gate):copyNativeBarrierAdditions(value.additions)});
}
export const sameNativeBarrierAdditionReference=(a,b)=>{try{return JSON.stringify(copyNativeBarrierAdditionReference(a))===JSON.stringify(copyNativeBarrierAdditionReference(b));}catch{return false;}};
export function nativeBarrierAdditionSuccessor(a,b){
 a=copyNativeBarrierAdditionReference(a);b=copyNativeBarrierAdditionReference(b);const x=a.worldBoundary,y=b.worldBoundary;
 return a.version===b.version&&a.sourceControlSequence===b.sourceControlSequence&&JSON.stringify(a.removal??a.gate??a.additions)===JSON.stringify(b.removal??b.gate??b.additions)&&x.authorityEpoch===y.authorityEpoch&&x.nativeSession===y.nativeSession&&y.effectiveTime>=x.effectiveTime&&(y.ticket>x.ticket||sameNativeBarrierAdditionReference(a,b));
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
 const count=reference.removal?.nativeIds.length??reference.gate?.proxies.length??reference.additions.length;
 if(reference.removal&&JSON.stringify(ids)!==JSON.stringify(reference.removal.nativeIds))throw TypeError('Native gate removal changed its triplet');
 if(!nativeBarrierAdditionSuccessor(preparedReference,reference)||!Array.isArray(ids)||ids.length!==count||ids.some(id=>!Number.isSafeInteger(id)||id<1||id>2147483647)||new Set(ids).size!==ids.length)throw TypeError('Native solid addition differs from its preparation');
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
