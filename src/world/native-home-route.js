import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeTaskSettlementAttestation,sameNativeTaskSettlementReference} from './native-task-settlement.js';
import {copyNativePresentationSamples} from './native-presentation-samples.js';
import {copyNativeGatePresentation} from './native-gate-presentation.js';
import {nativeMotionPresentationMatches} from './native-motion-presentation-match.js';
import {floorFloat32} from '../float32-time.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const sameHandle=(a,b)=>!!a&&!!b&&['authorityEpoch','session','slot','generation'].every(k=>a[k]===b[k]);
const sameSource=(a,b)=>a.settlementSequence===b.settlementSequence&&sameNativeTaskSettlementReference(a.reference,b.reference)&&sameNativeTaskSettlementReference(a.preparedReference,b.preparedReference);
export function copyNativeHomeRouteReference(value){
 if(value?.kind!=='native-home-route-reference'||value.version!==1)throw TypeError('Invalid native Home route reference');
 const sourceSettlement=copyNativeTaskSettlementAttestation(value.sourceSettlement),r=sourceSettlement.reference,worldBoundary=copyNativeWorldBoundary(value.worldBoundary),h=value.expectedRouteHandle;
 if(!r.home||!worldBoundary||value.actorId!==r.actorId||value.bodyId!==r.bodyId||!id(value.sourceControlSequence)||value.sourceControlSequence<sourceSettlement.settlementSequence||
  worldBoundary.authorityEpoch!==r.worldBoundary.authorityEpoch||worldBoundary.nativeSession!==r.worldBoundary.nativeSession||worldBoundary.ticket<=r.worldBoundary.ticket||worldBoundary.effectiveTime<r.worldBoundary.effectiveTime||!Number.isFinite(value.endTime)||value.endTime<worldBoundary.effectiveTime||
  h?.authorityEpoch!==worldBoundary.authorityEpoch||h.session!==worldBoundary.nativeSession||!Number.isSafeInteger(h.slot)||h.slot<0||h.slot>0xffffffff||!id(h.generation)||h.generation>0xffffffff)throw TypeError('Native Home route differs from its stationary source');
 return Object.freeze({kind:value.kind,version:1,actorId:r.actorId,bodyId:r.bodyId,sourceSettlement,expectedRouteHandle:Object.freeze({authorityEpoch:h.authorityEpoch,session:h.session,slot:h.slot,generation:h.generation}),worldBoundary,sourceControlSequence:value.sourceControlSequence,endTime:value.endTime});
}
const sameIdentity=(a,b)=>a.actorId===b.actorId&&a.bodyId===b.bodyId&&sameSource(a.sourceSettlement,b.sourceSettlement)&&sameHandle(a.expectedRouteHandle,b.expectedRouteHandle);
export const sameNativeHomeRouteReference=(a,b)=>!!a&&!!b&&sameIdentity(a,b)&&sameNativeWorldBoundary(a.worldBoundary,b.worldBoundary)&&a.sourceControlSequence===b.sourceControlSequence&&a.endTime===b.endTime;
export const nativeHomeRouteSuccessor=(a,b)=>sameIdentity(a,b)&&b.worldBoundary.ticket>a.worldBoundary.ticket&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime&&b.sourceControlSequence>=a.sourceControlSequence;
export function nativeHomeRouteReferenceCovered(reference,boundary){const w=reference.worldBoundary;return !!boundary&&w.authorityEpoch===boundary.authorityEpoch&&w.nativeSession===boundary.nativeSession&&boundary.ticket>=w.ticket&&boundary.effectiveTime>=w.effectiveTime;}
export function nativeHomeRouteReferenceFromProposal(value){
 const b=copyNativeWorldBoundary(value?.worldBoundary),t=value?.ticket;
 if(value?.kind!=='native-home-route-proposal'||value.version!==1||value.authorizedAutonomy!==false||value.authorizedPassage!==false||!b||value.startTime!==b.effectiveTime||t?.kind!=='native-home-route-proposal-ticket'||t.authorityEpoch!==b.authorityEpoch||t.session!==b.nativeSession||t.ticket!==b.ticket||['taskId','targetId','nativeRoute','nativeStart','nativeResume','sourceRequestHandle','sourceResumeHandle','assignmentSequence'].some(k=>value[k]!==undefined))throw TypeError('Invalid native Home route proposal identity');
 return copyNativeHomeRouteReference({...value,kind:'native-home-route-reference'});
}
export function copyNativeHomeRouteProposal(value){
 const nativeHome=nativeHomeRouteReferenceFromProposal(value),r=nativeHome.sourceSettlement.reference,p=r.pose,{worldBoundary}=nativeHome;
 if(value.nativeHome!==undefined&&!sameNativeHomeRouteReference(value.nativeHome,nativeHome)||value.motionMode!=='worker'||value.motionFlags!==0||value.profile!==r.profile||value.radius!==p.radius||value.origin?.x!==p.x||value.origin?.z!==p.z||!['distance','speed','runDistance','runSpeed','runBudget'].every(k=>Number.isFinite(value[k])&&value[k]>=0)||!(value.points instanceof Float32Array)||value.points.length<2||value.points.length%2||value.points.length>8192||!value.points.every(Number.isFinite)||!Array.isArray(value.gates)||value.gates.length>1024)throw TypeError('Invalid native Home route motion');
 const rows=copyNativePresentationSamples(value),gates=value.gates.map(g=>copyNativeGatePresentation(g,{worldBoundary,startTime:value.startTime,endTime:value.endTime}));
 if(rows[1]!==p.x||rows[2]!==p.z||value.points.at(-2)!==Math.fround(r.home.x)||value.points.at(-1)!==Math.fround(r.home.z)||[8,9,10,13].some((index,i)=>rows[index]!==[p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining][i])||new Set(gates.map(g=>g.gateId)).size!==gates.length)throw TypeError('Native Home route changed its source pose, phases or destination');
 return Object.freeze({kind:value.kind,version:1,ticket:Object.freeze({...value.ticket}),worldBoundary,nativeHome,actorId:nativeHome.actorId,bodyId:nativeHome.bodyId,sourceSettlement:nativeHome.sourceSettlement,expectedRouteHandle:nativeHome.expectedRouteHandle,sourceControlSequence:nativeHome.sourceControlSequence,
  profile:value.profile,motionFlags:0,radius:value.radius,origin:Object.freeze({x:p.x,z:p.z}),startTime:value.startTime,endTime:value.endTime,distance:value.distance,speed:value.speed,runDistance:value.runDistance,runSpeed:value.runSpeed,runBudget:value.runBudget,motionMode:'worker',rowWidth:16,rows,points:value.points.slice(),gates:Object.freeze(gates),authorizedAutonomy:false,authorizedPassage:false});
}
export function copyNativeHomeRouteAttestation(value){
 if(value?.kind!=='native-home-route-attestation'||value.version!==1||value.projectionVersion!==1)throw TypeError('Invalid native Home route attestation');
 const reference=copyNativeHomeRouteReference(value.reference),preparedReference=copyNativeHomeRouteReference(value.preparedReference),assignmentSequence=value.assignmentSequence,gateIds=value.gateIds;
 if(!id(assignmentSequence)||assignmentSequence<=reference.sourceControlSequence||!sameIdentity(reference,preparedReference)||reference.worldBoundary.ticket<preparedReference.worldBoundary.ticket||reference.worldBoundary.effectiveTime<preparedReference.worldBoundary.effectiveTime||reference.sourceControlSequence<preparedReference.sourceControlSequence||floorFloat32(reference.endTime-reference.worldBoundary.effectiveTime)!==floorFloat32(preparedReference.endTime-preparedReference.worldBoundary.effectiveTime)||!Array.isArray(gateIds)||gateIds.length>1024||gateIds.some(n=>!id(n))||new Set(gateIds).size!==gateIds.length)throw TypeError('Native Home route differs from its prepared source');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,reference,preparedReference,assignmentSequence,gateIds:Object.freeze([...gateIds])});
}
export const nativeHomeRouteAttestationCovers=(proof,reference)=>sameNativeHomeRouteReference(proof?.reference,reference)||sameNativeHomeRouteReference(proof?.preparedReference,reference);
export function nativeHomeRoutePresentationMatches(prepared,actual,value){
 const b=copyNativeHomeRouteAttestation(value),r=b.reference,route=actual?.nativeRoute;
 return sameNativeHomeRouteReference(b.preparedReference,prepared.nativeHome)&&route?.actorId===r.actorId&&route.assignmentSequence===b.assignmentSequence&&sameHandle(route.routeHandle,r.expectedRouteHandle)&&actual.startTime===r.worldBoundary.effectiveTime&&actual.endTime===r.endTime&&nativeMotionPresentationMatches(prepared,actual,b.gateIds);
}
