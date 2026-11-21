import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeTaskConsequenceAttestation,sameNativeTaskConsequenceReference} from './native-task-consequence.js';

const id=value=>Number.isSafeInteger(value)&&value>0;
const poseKeys=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
// Same provenance rule as Idle cycle: only our immutable validated outputs,
// weakly held. No caller-owned objects, leases or authority decisions cached.
const canonicalReferences=new WeakMap();
const sameCarry=(a,b)=>a.assignmentSequence===b.assignmentSequence&&sameNativeTaskConsequenceReference(a.reference,b.reference)&&sameNativeTaskConsequenceReference(a.preparedReference,b.preparedReference)&&JSON.stringify(a.gateIds)===JSON.stringify(b.gateIds);
export function copyNativeTaskSettlementReference(value){
 if(canonicalReferences.has(value))return value;
 if(value?.kind!=='native-task-settlement-reference'||value.version!==1)throw TypeError('Invalid native task settlement reference');
 const home=value.home;if(home!==undefined&&(!home||!id(home.villageId)||!Number.isFinite(home.x)||!Number.isFinite(home.z)||Math.abs(home.x)>=2147483000||Math.abs(home.z)>=2147483000||Object.keys(home).some(k=>!['villageId','x','z'].includes(k))))throw TypeError('Invalid native settlement Home destination');
 const sourceCarry=copyNativeTaskConsequenceAttestation(value.sourceCarry),r=sourceCarry.reference,worldBoundary=copyNativeWorldBoundary(value.worldBoundary),pose=value.pose;
 if(!worldBoundary||worldBoundary.authorityEpoch!==r.worldBoundary.authorityEpoch||worldBoundary.nativeSession!==r.worldBoundary.nativeSession||worldBoundary.ticket<=r.worldBoundary.ticket||worldBoundary.effectiveTime<r.endTime||
    ['actorId','bodyId','crateId','centerId'].some(key=>!id(value[key])||value[key]!==r[key])||!id(value.sourceControlSequence)||value.sourceControlSequence<sourceCarry.assignmentSequence||
    !Number.isInteger(value.profile)||value.profile<0||value.profile>31||!pose||poseKeys.some(key=>!Number.isFinite(pose[key]))||Object.keys(pose).some(key=>!poseKeys.includes(key))||
    pose.radius<=0||pose.radius>2||['runPhase','walkPhase','carryPhase','runRemaining'].some(key=>pose[key]<0)||pose.x!==Math.fround(r.destination.x)||pose.z!==Math.fround(r.destination.z)||pose.radius!==r.sourceAction.reference.radius)
  throw TypeError('Native task settlement differs from its arrived Carry body');
 const reference=Object.freeze({kind:value.kind,version:1,actorId:value.actorId,bodyId:value.bodyId,crateId:value.crateId,centerId:value.centerId,sourceControlSequence:value.sourceControlSequence,
  sourceCarry,worldBoundary,pose:Object.freeze(Object.fromEntries(poseKeys.map(key=>[key,pose[key]]))),profile:value.profile,...(home?{home:Object.freeze({villageId:home.villageId,x:home.x,z:home.z})}:{})});
 canonicalReferences.set(reference,null);return reference;
}
function referenceKey(value){const reference=copyNativeTaskSettlementReference(value);let key=canonicalReferences.get(reference);if(key===null){key=JSON.stringify(reference);canonicalReferences.set(reference,key);}return key;}
export const sameNativeTaskSettlementReference=(a,b)=>{try{return referenceKey(a)===referenceKey(b);}catch{return false;}};
export function nativeTaskSettlementSuccessor(previous,next){
 const a=copyNativeTaskSettlementReference(previous),b=copyNativeTaskSettlementReference(next);
 return ['actorId','bodyId','crateId','centerId','profile'].every(key=>a[key]===b[key])&&JSON.stringify(a.home)===JSON.stringify(b.home)&&sameCarry(a.sourceCarry,b.sourceCarry)&&JSON.stringify(a.pose)===JSON.stringify(b.pose)&&
  b.sourceControlSequence>=a.sourceControlSequence&&a.worldBoundary.authorityEpoch===b.worldBoundary.authorityEpoch&&a.worldBoundary.nativeSession===b.worldBoundary.nativeSession&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime&&(b.worldBoundary.ticket>a.worldBoundary.ticket||sameNativeTaskSettlementReference(a,b));
}
export function copyNativeTaskSettlementProposal(value){
 if(value?.kind!=='native-task-settlement-proposal'||value.version!==1)throw TypeError('Invalid native task settlement proposal');
 const nativeSettlement=copyNativeTaskSettlementReference(value.nativeSettlement),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),t=value.ticket;
 if(!sameNativeWorldBoundary(worldBoundary,nativeSettlement.worldBoundary)||t?.kind!=='native-task-settlement-proposal-ticket'||t.authorityEpoch!==worldBoundary.authorityEpoch||t.session!==worldBoundary.nativeSession||t.ticket!==worldBoundary.ticket)throw TypeError('Native settlement ticket differs from its resources');
 return Object.freeze({kind:value.kind,version:1,ticket:Object.freeze({...t}),worldBoundary,nativeSettlement,authorizedAutonomy:false,authorizedConsequences:false});
}
export const nativeTaskSettlementReferenceFromProposal=value=>copyNativeTaskSettlementProposal(value).nativeSettlement;
export function copyNativeTaskSettlementAttestation(value){
 if(value?.kind!=='native-task-settlement-attestation'||value.version!==1||value.projectionVersion!==1||!id(value.settlementSequence))throw TypeError('Invalid native task settlement attestation');
 const reference=copyNativeTaskSettlementReference(value.reference),preparedReference=copyNativeTaskSettlementReference(value.preparedReference);
 if(value.settlementSequence<=reference.sourceControlSequence||!nativeTaskSettlementSuccessor(preparedReference,reference))throw TypeError('Native settlement differs from its prepared source');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,settlementSequence:value.settlementSequence,reference,preparedReference});
}
export const nativeTaskSettlementAttestationCovers=(proof,reference)=>sameNativeTaskSettlementReference(proof?.reference,reference)||sameNativeTaskSettlementReference(proof?.preparedReference,reference);
export function nativeTaskSettlementReferenceCovered(reference,boundary){const w=reference.worldBoundary;return !!boundary&&w.authorityEpoch===boundary.authorityEpoch&&w.nativeSession===boundary.nativeSession&&boundary.ticket>=w.ticket&&boundary.effectiveTime>=w.effectiveTime;}
export function copyNativeTaskSettlementResources(value){
 if(value?.version!==1||value.kind!==17||value.phase!=='committed'||Object.keys(value).some(k=>!['version','kind','phase','worldBoundary','nativeTaskSettlementBinding'].includes(k)))throw TypeError('Invalid native task settlement resources');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),nativeTaskSettlementBinding=copyNativeTaskSettlementAttestation(value.nativeTaskSettlementBinding);
 if(!sameNativeWorldBoundary(worldBoundary,nativeTaskSettlementBinding.reference.worldBoundary))throw TypeError('Native settlement resource boundary mismatch');
 return Object.freeze({version:1,kind:17,phase:'committed',worldBoundary,nativeTaskSettlementBinding});
}
export function nativeTaskSettlementPresentationMatches(proposal,value,binding){
 try{const prepared=nativeTaskSettlementReferenceFromProposal(proposal),resources=copyNativeTaskSettlementResources(value),proof=copyNativeTaskSettlementAttestation(binding),actual=resources.nativeTaskSettlementBinding;return nativeTaskSettlementAttestationCovers(proof,prepared)&&actual.settlementSequence===proof.settlementSequence&&sameNativeTaskSettlementReference(actual.reference,proof.reference)&&sameNativeTaskSettlementReference(actual.preparedReference,proof.preparedReference);}catch{return false;}
}
