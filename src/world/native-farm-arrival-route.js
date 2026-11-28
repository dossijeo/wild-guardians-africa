import {copyNativeFarmArrivalRequestReference,sameNativeFarmArrivalRequestReference} from './native-farm-arrival-request-reference.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativePresentationSamples} from './native-presentation-samples.js';
import {copyNativeGatePresentation} from './native-gate-presentation.js';
import {copyNativeRouteReference} from './native-route-reference.js';
import {copyNativeRoutePresentation} from './native-route-presentation.js';
import {nativeMotionPresentationMatches} from './native-motion-presentation-match.js';
import {LOCOMOTION} from '../simulation/locomotion-calibration.js';
import {WORKER_SPEED_MULTIPLIER} from '../simulation/locomotion.js';
import {floorFloat32} from '../float32-time.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const finite=n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n));
const only=(v,keys)=>!!v&&Object.keys(v).every(k=>keys.includes(k));
const sameHandle=(a,b)=>!!a&&!!b&&['authorityEpoch','session','slot','generation'].every(k=>a[k]===b[k]);
const fields=['kind','version','actorId','bodyId','sourceRequest','sourceHeld','sourceProgram','destination','motionFlags','distance','expectedRouteHandle','sourceControlSequence','worldBoundary','endTime'];
const programFields=['startTime','distance','runDistance','passedDistance','passedRunDistance','runPhase','walkPhase','runRemaining'];
const runPhaseSpeed=LOCOMOTION.runMetresPerSecond*WORKER_SPEED_MULTIPLIER;
const proposalFields=[...fields,'ticket','nativeFarmArrival','profile','radius','origin','startTime','speed','runDistance','runSpeed','runBudget','motionMode','rowWidth','rows','points','gates','authorizedAutonomy','authorizedPassage'];

// A flat stopped source avoids retaining a chain of former route references.
const heldSourcePoseKeys=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
function copyHeldSource(value,request,boundary,handle,sequence){
 if(value===undefined)return undefined;
 const h=value?.resumeHandle,p=value?.pose,q=request;
 if(value?.kind!=='native-farm-arrival-held-source'||value.version!==1||!only(value,['kind','version','sourceSequence','resumeHandle','suspendedAt','pose'])||!id(value.sourceSequence)||value.sourceSequence<=q.requestSequence||sequence<value.sourceSequence||!finite(value.suspendedAt)||value.suspendedAt<q.requestedAt||value.suspendedAt>boundary.effectiveTime||!only(h,['authorityEpoch','session','slot','generation'])||!id(h.generation)||h.generation>0xffffffff||h.authorityEpoch!==q.authorityEpoch||h.session!==q.nativeSession||h.slot!==handle.slot||handle.generation!==((h.generation+2)>>>0||1)||!only(p,heldSourcePoseKeys)||!heldSourcePoseKeys.every(k=>finite(p[k]))||p.radius!==q.pose.radius||['x','z'].some(k=>Math.abs(p[k])>=2147483000)||heldSourcePoseKeys.slice(4).some(k=>p[k]<0))throw TypeError('Invalid stopped Farm continuation source');
 return Object.freeze({kind:value.kind,version:1,sourceSequence:value.sourceSequence,resumeHandle:Object.freeze({...h}),suspendedAt:value.suspendedAt,pose:Object.freeze(Object.fromEntries(heldSourcePoseKeys.map(k=>[k,p[k]])))});
}
export const nativeFarmArrivalSourcePose=reference=>reference.sourceHeld?.pose??reference.sourceRequest.pose;

function copySourceProgram(value,reference,request,boundary){
 if(value===undefined)return undefined;
 if(!only(value,programFields)||programFields.some(key=>!finite(value[key])||value[key]<0)||
    reference.sourceHeld!==undefined||boundary?.effectiveTime!==request.requestedAt||value.startTime>=request.requestedAt||
    value.passedDistance>=value.distance||value.distance-value.passedDistance!==reference.distance||
    value.runDistance!==(reference.motionFlags?Math.min(value.distance,value.runRemaining):0)||
    value.passedRunDistance!==Math.min(value.passedDistance,value.runDistance)||
    request.pose.runPhase!==value.runPhase+value.passedRunDistance/runPhaseSpeed||
    request.pose.walkPhase!==value.walkPhase+(value.passedDistance-value.passedRunDistance)/LOCOMOTION.walkMetresPerSecond||
    request.pose.runRemaining!==Math.max(0,value.runRemaining-value.passedRunDistance))
  throw TypeError('Invalid native Farm program at the saved cut');
 return Object.freeze(Object.fromEntries(programFields.map(key=>[key,value[key]])));
}

// Owned value metadata over existing generation/session handles. It grants no
// execution, arrival consequence or permission from a previous authority.
export function copyNativeFarmArrivalRouteReference(value){
 if(value?.kind!=='native-farm-arrival-route-reference'||value.version!==1||!only(value,fields))throw TypeError('Invalid native farm arrival route reference');
 const sourceRequest=copyNativeFarmArrivalRequestReference(value.sourceRequest),s=sourceRequest,worldBoundary=copyNativeWorldBoundary(value.worldBoundary),h=value.expectedRouteHandle,d=value.destination;
 const sourceHeld=copyHeldSource(value.sourceHeld,s,worldBoundary,h,value.sourceControlSequence),p=sourceHeld?.pose??s.pose;
 const sourceProgram=copySourceProgram(value.sourceProgram,value,s,worldBoundary);
 if(value.actorId!==s.actorId||value.bodyId!==s.bodyId||!worldBoundary||worldBoundary.authorityEpoch!==s.authorityEpoch||worldBoundary.nativeSession!==s.nativeSession||worldBoundary.effectiveTime<s.requestedAt||!id(value.sourceControlSequence)||value.sourceControlSequence<s.requestSequence||!finite(value.endTime)||value.endTime<worldBoundary.effectiveTime||![0,1].includes(value.motionFlags)||!finite(value.distance)||value.distance<0||
  !only(d,['x','z'])||!finite(d.x)||!finite(d.z)||Math.hypot(d.x-s.goal.x,d.z-s.goal.z)>s.goal.arrivalRadius||Math.hypot(d.x-p.x,d.z-p.z)>value.distance+1e-7||
  (value.distance===0?(value.endTime!==worldBoundary.effectiveTime||d.x!==p.x||d.z!==p.z):value.endTime<=worldBoundary.effectiveTime)||
  !only(h,['authorityEpoch','session','slot','generation'])||h.authorityEpoch!==s.authorityEpoch||h.session!==s.nativeSession||!Number.isSafeInteger(h.slot)||h.slot<0||h.slot>0xffffffff||!id(h.generation)||h.generation>0xffffffff)throw TypeError('Native farm arrival route differs from its physical source');
 return Object.freeze({kind:value.kind,version:1,actorId:s.actorId,bodyId:s.bodyId,sourceRequest,...(sourceHeld?{sourceHeld}:{}),...(sourceProgram?{sourceProgram}:{}),destination:Object.freeze({x:d.x,z:d.z}),motionFlags:value.motionFlags,distance:value.distance,expectedRouteHandle:Object.freeze({authorityEpoch:h.authorityEpoch,session:h.session,slot:h.slot,generation:h.generation}),sourceControlSequence:value.sourceControlSequence,worldBoundary,endTime:value.endTime});
}
export function sameNativeFarmArrivalRouteReference(a,b){try{return JSON.stringify(copyNativeFarmArrivalRouteReference(a))===JSON.stringify(copyNativeFarmArrivalRouteReference(b));}catch{return false;}}
const sameProgram=(a,b)=>sameNativeFarmArrivalRequestReference(a.sourceRequest,b.sourceRequest)&&a.actorId===b.actorId&&a.bodyId===b.bodyId&&sameHandle(a.expectedRouteHandle,b.expectedRouteHandle)&&JSON.stringify(a.sourceHeld)===JSON.stringify(b.sourceHeld)&&JSON.stringify(a.sourceProgram)===JSON.stringify(b.sourceProgram)&&a.motionFlags===b.motionFlags&&a.distance===b.distance&&a.destination.x===b.destination.x&&a.destination.z===b.destination.z;
export function nativeFarmArrivalRouteSuccessor(previous,next){
 const a=copyNativeFarmArrivalRouteReference(previous),b=copyNativeFarmArrivalRouteReference(next);
 return sameProgram(a,b)&&b.worldBoundary.ticket>=a.worldBoundary.ticket&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime&&b.sourceControlSequence>=a.sourceControlSequence&&floorFloat32(b.endTime-b.worldBoundary.effectiveTime)===floorFloat32(a.endTime-a.worldBoundary.effectiveTime)&&(b.worldBoundary.ticket>a.worldBoundary.ticket||sameNativeFarmArrivalRouteReference(a,b));
}
export function nativeFarmArrivalRouteReferenceCovered(reference,boundary){const w=reference.worldBoundary;return !!boundary&&w.authorityEpoch===boundary.authorityEpoch&&w.nativeSession===boundary.nativeSession&&boundary.ticket>=w.ticket&&boundary.effectiveTime>=w.effectiveTime;}
export function nativeFarmArrivalRouteReferenceFromProposal(value){
 const b=copyNativeWorldBoundary(value?.worldBoundary),t=value?.ticket;
 if(value?.kind!=='native-farm-arrival-route-proposal'||value.version!==1||!only(value,proposalFields)||value.authorizedAutonomy!==false||value.authorizedPassage!==false||!b||value.startTime!==b.effectiveTime||!only(t,['kind','authorityEpoch','session','ticket'])||t.kind!=='native-farm-arrival-route-proposal-ticket'||t.authorityEpoch!==b.authorityEpoch||t.session!==b.nativeSession||t.ticket!==b.ticket)throw TypeError('Invalid native farm arrival proposal identity');
 return copyNativeFarmArrivalRouteReference({...Object.fromEntries(fields.map(k=>[k,value[k]])),kind:'native-farm-arrival-route-reference'});
}
function farmRunDistance(r,p){
 const program=r.sourceProgram;
 return program?program.runDistance-program.passedRunDistance:r.motionFlags?Math.min(r.distance,p.runRemaining):0;
}
function sourceSamplesMatch(rows,r){
 const p=nativeFarmArrivalSourcePose(r),last=rows.length-16,run=farmRunDistance(r,p),program=r.sourceProgram;
 // The saved pose is a sample of the original program. Reassociating these
 // sums at the cut could change a phase in the last bit after movement.
 const totalRun=program?.runDistance??run,totalWalk=program?program.distance-totalRun:r.distance-run;
 const walk=program?totalWalk-(program.passedDistance-program.passedRunDistance):totalWalk;
 const runPhase=(program?.runPhase??p.runPhase)+totalRun/runPhaseSpeed;
 const walkPhase=(program?.walkPhase??p.walkPhase)+totalWalk/LOCOMOTION.walkMetresPerSecond;
 const runRemaining=Math.max(0,(program?.runRemaining??p.runRemaining)-totalRun);
 return rows[1]===p.x&&rows[2]===p.z&&rows[3]===0&&[8,9,10,13].every((column,i)=>rows[column]===[p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining][i])&&rows[last+1]===r.destination.x&&rows[last+2]===r.destination.z&&rows[last+3]===r.distance&&rows[last+7]===1&&rows[last+8]===runPhase&&rows[last+9]===walkPhase&&rows[last+10]===p.carryPhase&&rows[last+11]===run&&rows[last+12]===walk&&rows[last+13]===runRemaining&&rows[last+14]===0&&rows[last+15]===0&&(r.distance!==0||rows.length===16&&rows[5]===p.yaw);
}
export function copyNativeFarmArrivalRouteProposal(value){
 const nativeFarmArrival=nativeFarmArrivalRouteReferenceFromProposal(value),r=nativeFarmArrival,p=nativeFarmArrivalSourcePose(r),{worldBoundary}=r,run=farmRunDistance(r,p);
 if(value.nativeFarmArrival!==undefined&&!sameNativeFarmArrivalRouteReference(value.nativeFarmArrival,r)||value.motionMode!=='worker'||value.profile!==r.sourceRequest.profile||value.radius!==p.radius||!only(value.origin,['x','z'])||value.origin.x!==p.x||value.origin.z!==p.z||value.speed!==LOCOMOTION.walkMetresPerSecond*WORKER_SPEED_MULTIPLIER||value.runDistance!==run||value.runSpeed!==(r.motionFlags&&p.runRemaining>0?LOCOMOTION.runMetresPerSecond*WORKER_SPEED_MULTIPLIER:0)||value.runBudget!==p.runRemaining||!(value.points instanceof Float32Array)||value.points.length%2||value.points.length>8192||!value.points.every(Number.isFinite)||(r.distance===0?value.points.length!==0:value.points.length===0||value.points.at(-2)!==r.destination.x||value.points.at(-1)!==r.destination.z)||!Array.isArray(value.gates)||value.gates.length>1024)throw TypeError('Native farm arrival motion differs from its source');
 const rows=copyNativePresentationSamples(value),gates=value.gates.map(g=>copyNativeGatePresentation(g,{worldBoundary,startTime:value.startTime,endTime:value.endTime}));
 if(!sourceSamplesMatch(rows,r)||new Set(gates.map(g=>g.gateId)).size!==gates.length)throw TypeError('Native farm arrival changed its held phases or endpoint');
 return Object.freeze({...Object.fromEntries(proposalFields.filter(k=>k!=='nativeFarmArrival'&&(!['sourceHeld','sourceProgram'].includes(k)||value[k]!==undefined)).map(k=>[k,value[k]])),kind:value.kind,version:1,ticket:Object.freeze({...value.ticket}),worldBoundary,nativeFarmArrival,sourceRequest:r.sourceRequest,...(r.sourceHeld?{sourceHeld:r.sourceHeld}:{}),...(r.sourceProgram?{sourceProgram:r.sourceProgram}:{}),destination:r.destination,expectedRouteHandle:r.expectedRouteHandle,origin:Object.freeze({x:p.x,z:p.z}),rows,points:value.points.slice(),gates:Object.freeze(gates)});
}
export function copyNativeFarmArrivalRouteAttestation(value){
 if(value?.kind!=='native-farm-arrival-route-attestation'||value.version!==1||value.projectionVersion!==1||!only(value,['kind','version','projectionVersion','assignmentSequence','reference','preparedReference','gateIds']))throw TypeError('Invalid native farm arrival attestation');
 const reference=copyNativeFarmArrivalRouteReference(value.reference),preparedReference=copyNativeFarmArrivalRouteReference(value.preparedReference),ids=value.gateIds;
 if(!id(value.assignmentSequence)||value.assignmentSequence<=reference.sourceControlSequence||!nativeFarmArrivalRouteSuccessor(preparedReference,reference)||!Array.isArray(ids)||ids.length>1024||ids.some(n=>!id(n))||new Set(ids).size!==ids.length)throw TypeError('Native farm arrival has no prepared association');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,assignmentSequence:value.assignmentSequence,reference,preparedReference,gateIds:Object.freeze([...ids])});
}
export function sameNativeFarmArrivalRouteAttestation(a,b){try{return JSON.stringify(copyNativeFarmArrivalRouteAttestation(a))===JSON.stringify(copyNativeFarmArrivalRouteAttestation(b));}catch{return false;}}
export const nativeFarmArrivalRouteAttestationCovers=(proof,reference)=>sameNativeFarmArrivalRouteReference(proof?.reference,reference)||sameNativeFarmArrivalRouteReference(proof?.preparedReference,reference);
export function nativeFarmArrivalRoutePresentationMatches(prepared,actual,value){
 const b=copyNativeFarmArrivalRouteAttestation(value),r=b.reference,route=actual?.nativeRoute;
 return sameNativeFarmArrivalRouteReference(b.preparedReference,prepared.nativeFarmArrival)&&route?.actorId===r.actorId&&route.assignmentSequence===b.assignmentSequence&&sameHandle(route.routeHandle,r.expectedRouteHandle)&&actual.startTime===r.worldBoundary.effectiveTime&&actual.endTime===r.endTime&&sourceSamplesMatch(actual.rows,r)&&nativeMotionPresentationMatches(prepared,actual,b.gateIds);
}
export function copyNativeFarmArrivalRouteResources(value){
 if(value?.version!==1||value.kind!==23||value.phase!=='committed'||!only(value,['version','kind','phase','worldBoundary','nativeRoute','nativeFarmArrivalBinding','presentation']))throw TypeError('Invalid native farm arrival resources');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),nativeRoute=copyNativeRouteReference(value.nativeRoute),nativeFarmArrivalBinding=copyNativeFarmArrivalRouteAttestation(value.nativeFarmArrivalBinding),presentation=copyNativeRoutePresentation(value.presentation),r=nativeFarmArrivalBinding.reference;
 if(!sameNativeWorldBoundary(worldBoundary,r.worldBoundary)||!sameNativeWorldBoundary(presentation.worldBoundary,worldBoundary)||nativeRoute.actorId!==r.actorId||nativeRoute.assignmentSequence!==nativeFarmArrivalBinding.assignmentSequence||!sameHandle(nativeRoute.routeHandle,r.expectedRouteHandle)||JSON.stringify(presentation.nativeRoute)!==JSON.stringify(nativeRoute)||presentation.startTime!==r.worldBoundary.effectiveTime||presentation.endTime!==r.endTime||presentation.profile!==r.sourceRequest.profile||presentation.radius!==r.sourceRequest.pose.radius||presentation.motionMode!=='worker'||presentation.motionFlags!==r.motionFlags||!sourceSamplesMatch(presentation.rows,r)||presentation.gates.length!==nativeFarmArrivalBinding.gateIds.length||presentation.gates.some(g=>!nativeFarmArrivalBinding.gateIds.includes(g.gateId)))throw TypeError('Native farm arrival resource association mismatch');
 return Object.freeze({version:1,kind:23,phase:'committed',worldBoundary,nativeRoute,nativeFarmArrivalBinding,presentation});
}

// Actual logical source retained by the one suspended slot. The resume handle
// identifies that held allocation; it is not an executable route permission.
const heldFarmPoseKeys=Object.freeze(['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining']);
export function copyNativeFarmArrivalHeldExecution(value){
 const r=copyNativeFarmArrivalRouteReference(value?.sourceReference),q=r.sourceRequest,p=value.pose,h=value.resumeHandle,g=r.expectedRouteHandle;
 if(value.kind!=='native-farm-arrival-held-execution'||value.version!==1||!only(value,['kind','version','actorId','bodyId','sourceReference','assignmentSequence','resumeHandle','suspendedAt','executedThrough','pose'])||value.actorId!==r.actorId||value.bodyId!==r.bodyId||!id(value.assignmentSequence)||value.assignmentSequence<=r.sourceControlSequence||
  !only(h,['authorityEpoch','session','slot','generation'])||!sameHandle({...h,generation:g.generation},g)||h.generation!==(g.generation===0xffffffff?1:g.generation+1)||
  !finite(value.suspendedAt)||value.suspendedAt<r.worldBoundary.effectiveTime||value.suspendedAt>=r.endTime||!Number.isFinite(value.executedThrough)||value.executedThrough<value.suspendedAt||!only(p,heldFarmPoseKeys)||!heldFarmPoseKeys.every(k=>finite(p[k]))||p.radius!==q.pose.radius||['x','z'].some(k=>Math.abs(p[k])>=2147483000)||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>p[k]<0))throw TypeError('Invalid current held native farm arrival source');
 return Object.freeze({kind:value.kind,version:1,actorId:r.actorId,bodyId:r.bodyId,sourceReference:r,assignmentSequence:value.assignmentSequence,resumeHandle:Object.freeze({...h}),suspendedAt:value.suspendedAt,executedThrough:value.executedThrough,pose:Object.freeze(Object.fromEntries(heldFarmPoseKeys.map(k=>[k,p[k]])))});
}

// Compare the new flat source with the actual installed/native stopped owner.
export function nativeFarmArrivalContinuesHeld(reference,held){try{
 const r=copyNativeFarmArrivalRouteReference(reference),h=r.sourceHeld;
 return !!h&&!!held&&r.actorId===held.actorId&&r.bodyId===held.bodyId&&sameNativeFarmArrivalRequestReference(r.sourceRequest,held.sourceReference.sourceRequest)&&h.sourceSequence===held.assignmentSequence&&sameHandle(h.resumeHandle,held.resumeHandle)&&h.suspendedAt===held.suspendedAt&&heldSourcePoseKeys.every(k=>h.pose[k]===held.pose[k]);
}catch{return false;}}
