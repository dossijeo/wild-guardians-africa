import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeHomeRouteAttestation,sameNativeHomeRouteReference} from './native-home-route.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const poseKeys=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
const sameHome=(a,b)=>a.assignmentSequence===b.assignmentSequence&&sameNativeHomeRouteReference(a.reference,b.reference)&&sameNativeHomeRouteReference(a.preparedReference,b.preparedReference)&&JSON.stringify(a.gateIds)===JSON.stringify(b.gateIds);
export function copyNativeHomeArrivalReference(value){
 if(value?.kind!=='native-home-arrival-reference'||value.version!==1)throw TypeError('Invalid native Home arrival reference');
 const sourceHome=copyNativeHomeRouteAttestation(value.sourceHome),r=sourceHome.reference,held=r.sourceSettlement.reference,home=held.home,worldBoundary=copyNativeWorldBoundary(value.worldBoundary),pose=value.pose;
 if(!worldBoundary||worldBoundary.authorityEpoch!==r.worldBoundary.authorityEpoch||worldBoundary.nativeSession!==r.worldBoundary.nativeSession||worldBoundary.ticket<=r.worldBoundary.ticket||worldBoundary.effectiveTime<r.endTime||
  value.actorId!==r.actorId||value.bodyId!==r.bodyId||!id(value.sourceControlSequence)||value.sourceControlSequence<sourceHome.assignmentSequence||value.profile!==held.profile||
  !Number.isSafeInteger(value.bodyFlags)||value.bodyFlags<0||value.bodyFlags>0x7fffffff||!(value.bodyFlags&1)||value.bodyFlags&2||
  !pose||Object.keys(pose).some(k=>!poseKeys.includes(k))||poseKeys.some(k=>!Number.isFinite(pose[k]))||pose.x!==Math.fround(home.x)||pose.z!==Math.fround(home.z)||pose.radius!==held.pose.radius||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>pose[k]<0)||
  ['taskId','targetId','nativeRoute','nativeStart','nativeResume','nativeSettlement','expectedRouteHandle'].some(k=>value[k]!==undefined))throw TypeError('Native Home arrival differs from its executed endpoint');
 return Object.freeze({kind:value.kind,version:1,actorId:r.actorId,bodyId:r.bodyId,sourceHome,worldBoundary,sourceControlSequence:value.sourceControlSequence,pose:Object.freeze(Object.fromEntries(poseKeys.map(k=>[k,pose[k]]))),profile:value.profile,bodyFlags:value.bodyFlags});
}
export const sameNativeHomeArrivalReference=(a,b)=>{try{return JSON.stringify(copyNativeHomeArrivalReference(a))===JSON.stringify(copyNativeHomeArrivalReference(b));}catch{return false;}};
export function nativeHomeArrivalSuccessor(a,b){
 a=copyNativeHomeArrivalReference(a);b=copyNativeHomeArrivalReference(b);
 return sameHome(a.sourceHome,b.sourceHome)&&a.profile===b.profile&&a.bodyFlags===b.bodyFlags&&JSON.stringify(a.pose)===JSON.stringify(b.pose)&&a.worldBoundary.authorityEpoch===b.worldBoundary.authorityEpoch&&a.worldBoundary.nativeSession===b.worldBoundary.nativeSession&&b.sourceControlSequence>=a.sourceControlSequence&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime&&(b.worldBoundary.ticket>a.worldBoundary.ticket||sameNativeHomeArrivalReference(a,b));
}
export function copyNativeHomeArrivalProposal(value){
 if(value?.kind!=='native-home-arrival-proposal'||value.version!==1||value.authorizedAutonomy!==false||value.authorizedConsequences!==false)throw TypeError('Invalid native Home arrival proposal');
 const nativeHomeArrival=copyNativeHomeArrivalReference(value.nativeHomeArrival),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),t=value.ticket;
 if(!sameNativeWorldBoundary(worldBoundary,nativeHomeArrival.worldBoundary)||t?.kind!=='native-home-arrival-proposal-ticket'||t.authorityEpoch!==worldBoundary.authorityEpoch||t.session!==worldBoundary.nativeSession||t.ticket!==worldBoundary.ticket)throw TypeError('Native Home arrival ticket differs from its resources');
 return Object.freeze({kind:value.kind,version:1,ticket:Object.freeze({...t}),worldBoundary,nativeHomeArrival,authorizedAutonomy:false,authorizedConsequences:false});
}
export const nativeHomeArrivalReferenceFromProposal=value=>copyNativeHomeArrivalProposal(value).nativeHomeArrival;
export function copyNativeHomeArrivalAttestation(value){
 if(value?.kind!=='native-home-arrival-attestation'||value.version!==1||value.projectionVersion!==1||!id(value.retiredSequence))throw TypeError('Invalid native Home arrival attestation');
 const reference=copyNativeHomeArrivalReference(value.reference),preparedReference=copyNativeHomeArrivalReference(value.preparedReference);
 if(value.retiredSequence<=reference.sourceControlSequence||!nativeHomeArrivalSuccessor(preparedReference,reference))throw TypeError('Native Home arrival differs from its prepared source');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,retiredSequence:value.retiredSequence,reference,preparedReference});
}
export function copyNativeHomeArrivalResources(value){
 if(value?.version!==1||value.kind!==19||value.phase!=='committed'||Object.keys(value).some(k=>!['version','kind','phase','worldBoundary','nativeHomeArrivalBinding'].includes(k)))throw TypeError('Invalid native Home arrival resources');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),nativeHomeArrivalBinding=copyNativeHomeArrivalAttestation(value.nativeHomeArrivalBinding);
 if(!sameNativeWorldBoundary(worldBoundary,nativeHomeArrivalBinding.reference.worldBoundary))throw TypeError('Native Home arrival resource boundary mismatch');
 return Object.freeze({version:1,kind:19,phase:'committed',worldBoundary,nativeHomeArrivalBinding});
}
export function nativeHomeArrivalPresentationMatches(proposal,value,binding){
 try{const prepared=nativeHomeArrivalReferenceFromProposal(proposal),resources=copyNativeHomeArrivalResources(value),proof=copyNativeHomeArrivalAttestation(binding),actual=resources.nativeHomeArrivalBinding;return sameNativeHomeArrivalReference(proof.preparedReference,prepared)&&actual.retiredSequence===proof.retiredSequence&&sameNativeHomeArrivalReference(actual.reference,proof.reference)&&sameNativeHomeArrivalReference(actual.preparedReference,proof.preparedReference);}catch{return false;}
}
