import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeTaskConsequenceAttestation,sameNativeTaskConsequenceReference} from './native-task-consequence.js';

const id=value=>Number.isSafeInteger(value)&&value>0;
const poseKeys=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
const sameCarry=(a,b)=>a.assignmentSequence===b.assignmentSequence&&sameNativeTaskConsequenceReference(a.reference,b.reference)&&sameNativeTaskConsequenceReference(a.preparedReference,b.preparedReference)&&JSON.stringify(a.gateIds)===JSON.stringify(b.gateIds);
export function copyNativeTaskSettlementReference(value){
 if(value?.kind!=='native-task-settlement-reference'||value.version!==1)throw TypeError('Invalid native task settlement reference');
 const sourceCarry=copyNativeTaskConsequenceAttestation(value.sourceCarry),r=sourceCarry.reference,worldBoundary=copyNativeWorldBoundary(value.worldBoundary),pose=value.pose;
 if(!worldBoundary||worldBoundary.authorityEpoch!==r.worldBoundary.authorityEpoch||worldBoundary.nativeSession!==r.worldBoundary.nativeSession||worldBoundary.effectiveTime<r.endTime||
    ['actorId','bodyId','crateId','centerId'].some(key=>!id(value[key])||value[key]!==r[key])||!id(value.sourceControlSequence)||value.sourceControlSequence<sourceCarry.assignmentSequence||
    !Number.isInteger(value.profile)||value.profile<0||value.profile>31||!pose||poseKeys.some(key=>!Number.isFinite(pose[key]))||Object.keys(pose).some(key=>!poseKeys.includes(key))||
    pose.radius<=0||pose.radius>2||['runPhase','walkPhase','carryPhase','runRemaining'].some(key=>pose[key]<0)||pose.x!==Math.fround(r.destination.x)||pose.z!==Math.fround(r.destination.z)||pose.radius!==r.sourceAction.reference.radius)
  throw TypeError('Native task settlement differs from its arrived Carry body');
 return Object.freeze({kind:value.kind,version:1,actorId:value.actorId,bodyId:value.bodyId,crateId:value.crateId,centerId:value.centerId,sourceControlSequence:value.sourceControlSequence,
  sourceCarry,worldBoundary,pose:Object.freeze(Object.fromEntries(poseKeys.map(key=>[key,pose[key]]))),profile:value.profile});
}
export const sameNativeTaskSettlementReference=(a,b)=>{try{return JSON.stringify(copyNativeTaskSettlementReference(a))===JSON.stringify(copyNativeTaskSettlementReference(b));}catch{return false;}};
export function nativeTaskSettlementSuccessor(previous,next){
 const a=copyNativeTaskSettlementReference(previous),b=copyNativeTaskSettlementReference(next);
 return ['actorId','bodyId','crateId','centerId','profile'].every(key=>a[key]===b[key])&&sameCarry(a.sourceCarry,b.sourceCarry)&&JSON.stringify(a.pose)===JSON.stringify(b.pose)&&
  b.sourceControlSequence>=a.sourceControlSequence&&a.worldBoundary.authorityEpoch===b.worldBoundary.authorityEpoch&&a.worldBoundary.nativeSession===b.worldBoundary.nativeSession&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime;
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
