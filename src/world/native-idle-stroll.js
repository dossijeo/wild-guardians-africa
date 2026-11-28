import {copyNativeIdleStrollRequestReference,sameNativeIdleStrollRequestReference} from './native-idle-stroll-request-reference.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeRouteReference} from './native-route-reference.js';
import {copyNativeRoutePresentation} from './native-route-presentation.js';
import {copyNativeIdleCycleNextRequest} from './native-idle-cycle.js';
import {copyNativeIdleCycleBodySource,isNativeIdleStrollArrivalSource,nativeIdleCycleBodyState} from './native-idle-cycle-body-source.js';
import {copyNativePresentationSamples} from './native-presentation-samples.js';
import {copyNativeGatePresentation} from './native-gate-presentation.js';
import {nativeMotionPresentationMatches} from './native-motion-presentation-match.js';
import {LOCOMOTION} from '../simulation/locomotion-calibration.js';
import {floorFloat32} from '../float32-time.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const finite=n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n));
const only=(value,keys)=>value&&Object.keys(value).every(k=>keys.includes(k));
const poseKeys=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
const fields=['kind','version','actorId','bodyId','centerId','profile','workerProfile','bodyFlags','pose','anchor','sourceCycleSequence','sourceDecisionSequence','requestedAt','walkRng','approachRetry','idleSeconds','destination','expectedRouteHandle','sourceControlSequence','worldBoundary','endTime','sourceRequest','sourceFarm','sourceSettlement','walkRemaining'];
const anchorId=a=>`${a.kind===1?'farm-plant':'farm-structure'}-${a.id}`;
const sameHandle=(a,b)=>!!a&&!!b&&['authorityEpoch','session','slot','generation'].every(k=>a[k]===b[k]);
// Bounded value metadata and existing generation/session handles. References
// name their causal predecessor; they never retain a recursive permission tree.
export function copyNativeIdleStrollReference(value){
 if(value?.kind!=='native-idle-stroll-reference'||![1,2,3].includes(value.version)||!only(value,fields)||value.version!==2&&Object.hasOwn(value,'walkRemaining'))throw TypeError('Invalid native Idle stroll reference');
 const selected=value.version===2,yielding=value.version===3;
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),p=value.pose,a=value.anchor,d=value.destination,h=value.expectedRouteHandle,c=LOCOMOTION.sources.find(c=>c.profile===value.workerProfile),source=value.sourceRequest===undefined?null:copyNativeIdleStrollRequestReference(value.sourceRequest),farm=value.sourceFarm===undefined?null:copyNativeIdleCycleBodySource(value.sourceFarm),settlement=value.sourceSettlement===undefined?null:copyNativeIdleCycleBodySource(value.sourceSettlement),terminal=farm??settlement;
 if(!worldBoundary||!['actorId','bodyId','centerId','sourceDecisionSequence','sourceControlSequence'].every(k=>id(value[k]))||!(source||terminal?value.sourceCycleSequence===0:id(value.sourceCycleSequence))||value.sourceDecisionSequence<=value.sourceCycleSequence||value.sourceControlSequence<value.sourceDecisionSequence||!finite(value.requestedAt)||value.requestedAt<0||worldBoundary.effectiveTime<value.requestedAt||!finite(value.endTime)||(source?value.endTime<worldBoundary.effectiveTime:value.endTime<=worldBoundary.effectiveTime)||
  !Number.isInteger(value.profile)||value.profile<0||value.profile>31||!c||value.idleSeconds!==c.idleSeconds||!Number.isSafeInteger(value.bodyFlags)||value.bodyFlags<0||value.bodyFlags>0x7fffffff||!(value.bodyFlags&1)||(value.bodyFlags&2)||
  !only(p,poseKeys)||!poseKeys.every(k=>finite(p[k]))||p.radius<=0||p.radius>2||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>p[k]<0)||
  !only(a,['kind','id','x','z','radius'])||![1,2].includes(a.kind)||!id(a.id)||!['x','z','radius'].every(k=>finite(a[k]))||a.radius<=0||a.radius>8||(terminal||selected&&!source?Math.hypot(p.x-a.x,p.z-a.z)<=a.radius:!source?.approach&&Math.hypot(p.x-a.x,p.z-a.z)>a.radius)||
  !only(d,['x','z'])||!finite(d.x)||!finite(d.z)||Math.hypot(d.x-a.x,d.z-a.z)>a.radius+1e-9||!source&&!selected&&Math.hypot(d.x-p.x,d.z-p.z)<.75||!Number.isSafeInteger(value.walkRng)||value.walkRng<0||value.walkRng>0xffffffff||!finite(value.approachRetry)||value.approachRetry<0||
  !only(h,['authorityEpoch','session','slot','generation'])||h.authorityEpoch!==worldBoundary.authorityEpoch||h.session!==worldBoundary.nativeSession||!Number.isSafeInteger(h.slot)||h.slot<0||h.slot>0xffffffff||!id(h.generation)||h.generation>0xffffffff)throw TypeError('Native Idle stroll differs from its bounded source');
 if(selected&&(terminal||source&&source.version!==2||!finite(value.walkRemaining)||value.walkRemaining<0||!source&&value.approachRetry!==1||d.x!==a.x||d.z!==a.z)||source&&(source.version===2)!==selected)throw TypeError('Native selected approach has no bounded WALK state');
 if(source&&(selected&&source.walkRemaining!==value.walkRemaining||source.authorityEpoch!==worldBoundary.authorityEpoch||source.nativeSession!==worldBoundary.nativeSession||source.requestSequence!==value.sourceDecisionSequence||source.requestedAt!==value.requestedAt||['actorId','bodyId','bodyFlags','centerId','profile','workerProfile','idleSeconds','walkRng','approachRetry'].some(k=>source[k]!==value[k])||poseKeys.some(k=>source.pose[k]!==p[k])||['kind','id','x','z','radius'].some(k=>source.anchor[k]!==a[k])||source.destination.x!==d.x||source.destination.z!==d.z))throw TypeError('Native Idle stroll differs from its restored request');
 if(terminal&&(source||farm&&settlement||terminal.kind!==(farm?'native-farm-arrival-idle-source':'native-settled-worker-idle-source')||terminal.authorityEpoch!==worldBoundary.authorityEpoch||terminal.nativeSession!==worldBoundary.nativeSession||terminal.sourceSequence!==value.sourceDecisionSequence||terminal.sourceAt!==value.requestedAt||['actorId','bodyId','bodyFlags','centerId','profile','workerProfile'].some(k=>terminal[k]!==value[k])||poseKeys.some(k=>terminal.pose[k]!==p[k])||terminal.idleState.anchorId!==anchorId(a)||value.walkRng!==terminal.idleState.rng||value.approachRetry!==1||!yielding&&(d.x!==a.x||d.z!==a.z)))throw TypeError('Native Idle approach differs from its actual Farm source');
 if(yielding&&(!farm||a.kind!==1||d.x===a.x&&d.z===a.z))throw TypeError('Native Idle yield has no lateral Farm destination');
 return Object.freeze({...Object.fromEntries(fields.filter(k=>!['sourceRequest','sourceFarm','sourceSettlement'].includes(k)&&(k!=='walkRemaining'||selected)).map(k=>[k,value[k]])),...(source?{sourceRequest:source}:{}),...(farm?{sourceFarm:farm}:{}),...(settlement?{sourceSettlement:settlement}:{}),worldBoundary,pose:Object.freeze(Object.fromEntries(poseKeys.map(k=>[k,p[k]]))),anchor:Object.freeze({kind:a.kind,id:a.id,x:a.x,z:a.z,radius:a.radius}),destination:Object.freeze({x:d.x,z:d.z}),expectedRouteHandle:Object.freeze({authorityEpoch:h.authorityEpoch,session:h.session,slot:h.slot,generation:h.generation})});
}
// Semantic selectors for already decoded references. These grant no permission.
export const nativeIdleStrollWalkRemaining=r=>r.version===2?r.walkRemaining:r.sourceSettlement?r.sourceSettlement.idleState.remaining:r.sourceFarm?r.sourceFarm.idleState.remaining:r.sourceRequest?.approach?r.idleSeconds*2:0;
export const nativeIdleStrollApproachesAnchor=r=>r.version===2||!!r.sourceFarm||!!r.sourceSettlement||r.sourceRequest?.approach===true;
export function sameNativeIdleStrollReference(a,b){try{return JSON.stringify(copyNativeIdleStrollReference(a))===JSON.stringify(copyNativeIdleStrollReference(b));}catch{return false;}}
const program=({worldBoundary,sourceControlSequence,endTime,...value})=>value;
const sameProgram=(a,b)=>JSON.stringify(program(a))===JSON.stringify(program(b));
export function nativeIdleStrollSuccessor(previous,next){
 const a=copyNativeIdleStrollReference(previous),b=copyNativeIdleStrollReference(next);
 return sameProgram(a,b)&&a.worldBoundary.authorityEpoch===b.worldBoundary.authorityEpoch&&a.worldBoundary.nativeSession===b.worldBoundary.nativeSession&&(b.worldBoundary.ticket>a.worldBoundary.ticket||sameNativeIdleStrollReference(a,b))&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime&&b.sourceControlSequence>=a.sourceControlSequence&&floorFloat32(b.endTime-b.worldBoundary.effectiveTime)===floorFloat32(a.endTime-a.worldBoundary.effectiveTime);
}
export function nativeIdleStrollContinuesNext(reference,value){
 try{const r=copyNativeIdleStrollReference(reference),n=copyNativeIdleCycleNextRequest(value),q=nativeIdleCycleBodyState(n.sourceCycle.reference.sourceBody),a=n.sourceCycle.reference.anchor,s=n.idleState;
  return s.mode==='walk'&&(n.approach===true?r.version===2&&r.walkRemaining===s.remaining:r.version===1)&&r.actorId===q.actorId&&r.bodyId===q.bodyId&&r.centerId===q.centerId&&r.profile===q.profile&&r.workerProfile===q.workerProfile&&r.bodyFlags===q.bodyFlags&&r.sourceCycleSequence===n.sourceCycle.cycleSequence&&r.sourceDecisionSequence===n.requestSequence&&r.requestedAt===n.requestedAt&&r.worldBoundary.authorityEpoch===q.authorityEpoch&&r.worldBoundary.nativeSession===q.nativeSession&&poseKeys.every(k=>r.pose[k]===q.pose[k])&&anchorId(r.anchor)===a.id&&['x','z','radius'].every(k=>r.anchor[k]===a[k])&&r.walkRng===s.rng&&r.approachRetry===s.approachRetry&&r.destination.x===s.destination.x&&r.destination.z===s.destination.z;
 }catch{return false;}
}
export function nativeIdleStrollContinuesRestoredRequest(reference,value){try{const r=copyNativeIdleStrollReference(reference);return !!r.sourceRequest&&sameNativeIdleStrollRequestReference(r.sourceRequest,value);}catch{return false;}}
// A body snapshot is metadata until its exact native cycle acquisition. During
// preparation it must continue the currently admitted, actually finished stroll.
export function nativeIdleStrollArrivalSourceMatches(value,proof){
 try{const q=copyNativeIdleCycleBodySource(value),b=copyNativeIdleStrollAttestation(proof),r=b.reference,p=q.pose,s=q.idleState;
  let rng=r.walkRng;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;rng>>>=0;
  const anchorMatches=q.kind==='native-idle-stroll-reanchor-source'?
    r.anchor.kind===1&&s.anchorId!==anchorId(r.anchor)&&(s.anchorId.startsWith('farm-plant-')||s.anchorId===`farm-structure-${r.centerId}`):
    s.anchorId===anchorId(r.anchor)&&s.rng===rng&&s.approachRetry===Math.max(0,r.approachRetry-(r.endTime-r.worldBoundary.effectiveTime));
  return isNativeIdleStrollArrivalSource(q)&&anchorMatches&&q.sourceSequence===b.assignmentSequence&&q.sourceAt===r.endTime&&q.authorityEpoch===r.worldBoundary.authorityEpoch&&q.nativeSession===r.worldBoundary.nativeSession&&q.actorId===r.actorId&&q.bodyId===r.bodyId&&q.bodyFlags===r.bodyFlags&&q.centerId===r.centerId&&q.profile===r.profile&&q.workerProfile===r.workerProfile&&p.x===Math.fround(r.destination.x)&&p.z===Math.fround(r.destination.z)&&['radius','runPhase','carryPhase','runRemaining'].every(k=>p[k]===r.pose[k])&&p.walkPhase>=r.pose.walkPhase;
 }catch{return false;}
}
const proposalFields=['kind','version','ticket','worldBoundary','nativeIdleStroll','actorId','bodyId','expectedRouteHandle','sourceControlSequence','profile','motionFlags','radius','origin','startTime','endTime','distance','speed','runDistance','runSpeed','runBudget','motionMode','rowWidth','rows','points','gates','authorizedAutonomy','authorizedPassage'];
export function copyNativeIdleStrollProposal(value){
 if(value?.kind!=='native-idle-stroll-proposal'||value.version!==1||!only(value,proposalFields)||value.authorizedAutonomy!==false||value.authorizedPassage!==false)throw TypeError('Invalid native Idle stroll proposal');
 const r=copyNativeIdleStrollReference(value.nativeIdleStroll),b=copyNativeWorldBoundary(value.worldBoundary),t=value.ticket,p=r.pose;
 if(!sameNativeWorldBoundary(b,r.worldBoundary)||!only(t,['kind','authorityEpoch','session','ticket'])||t.kind!=='native-idle-stroll-proposal-ticket'||t.authorityEpoch!==b.authorityEpoch||t.session!==b.nativeSession||t.ticket!==b.ticket||value.actorId!==r.actorId||value.bodyId!==r.bodyId||!value.expectedRouteHandle||!sameHandle(value.expectedRouteHandle,r.expectedRouteHandle)||value.sourceControlSequence!==r.sourceControlSequence||value.startTime!==b.effectiveTime||value.endTime!==r.endTime||value.profile!==r.profile||value.motionMode!=='worker'||value.motionFlags!==0||value.radius!==p.radius||!only(value.origin,['x','z'])||value.origin.x!==p.x||value.origin.z!==p.z||!['distance','speed','runDistance','runSpeed','runBudget'].every(k=>finite(value[k])&&value[k]>=0)||(r.sourceRequest?value.distance<0:value.distance<=0)||value.speed<=0||value.runDistance!==0||value.runSpeed!==0||value.runBudget!==p.runRemaining||!(value.points instanceof Float32Array)||value.points.length<2||value.points.length%2||value.points.length>8192||!value.points.every(Number.isFinite)||value.points.at(-2)!==Math.fround(r.destination.x)||value.points.at(-1)!==Math.fround(r.destination.z)||!Array.isArray(value.gates)||value.gates.length>1024)throw TypeError('Native Idle stroll motion differs from its source');
 const rows=copyNativePresentationSamples(value),gates=value.gates.map(g=>copyNativeGatePresentation(g,{worldBoundary:b,startTime:value.startTime,endTime:value.endTime}));
 for(let i=0;r.version!==2&&!r.sourceFarm&&!r.sourceSettlement&&!r.sourceRequest?.approach&&i<value.points.length;i+=2)if(Math.hypot(value.points[i]-r.anchor.x,value.points[i+1]-r.anchor.z)>r.anchor.radius)throw TypeError('Native Idle stroll left its local anchor');
 if(rows[1]!==p.x||rows[2]!==p.z||[8,9,10,13].some((index,i)=>rows[index]!==[p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining][i])||new Set(gates.map(g=>g.gateId)).size!==gates.length)throw TypeError('Native Idle stroll changed its held pose or phases');
 return Object.freeze({...Object.fromEntries(proposalFields.map(k=>[k,value[k]])),ticket:Object.freeze({...t}),worldBoundary:b,nativeIdleStroll:r,expectedRouteHandle:r.expectedRouteHandle,origin:Object.freeze({...value.origin}),rows,points:value.points.slice(),gates:Object.freeze(gates)});
}
export const nativeIdleStrollReferenceFromProposal=value=>copyNativeIdleStrollProposal(value).nativeIdleStroll;
export function copyNativeIdleStrollAttestation(value){
 if(value?.kind!=='native-idle-stroll-attestation'||value.version!==1||value.projectionVersion!==1||!only(value,['kind','version','projectionVersion','assignmentSequence','reference','preparedReference','gateIds']))throw TypeError('Invalid native Idle stroll attestation');
 const reference=copyNativeIdleStrollReference(value.reference),preparedReference=copyNativeIdleStrollReference(value.preparedReference),ids=value.gateIds;
 if(!id(value.assignmentSequence)||value.assignmentSequence<=reference.sourceControlSequence||!nativeIdleStrollSuccessor(preparedReference,reference)||!Array.isArray(ids)||ids.length>1024||ids.some(n=>!id(n))||new Set(ids).size!==ids.length)throw TypeError('Native Idle stroll has no prepared association');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,assignmentSequence:value.assignmentSequence,reference,preparedReference,gateIds:Object.freeze([...ids])});
}
export const nativeIdleStrollAttestationCovers=(proof,reference)=>sameNativeIdleStrollReference(proof?.reference,reference)||sameNativeIdleStrollReference(proof?.preparedReference,reference);
export function nativeIdleStrollReferenceCovered(reference,boundary){const w=reference.worldBoundary;return !!boundary&&w.authorityEpoch===boundary.authorityEpoch&&w.nativeSession===boundary.nativeSession&&boundary.ticket>=w.ticket&&boundary.effectiveTime>=w.effectiveTime;}
export function sameNativeIdleStrollAttestation(a,b){try{return JSON.stringify(copyNativeIdleStrollAttestation(a))===JSON.stringify(copyNativeIdleStrollAttestation(b));}catch{return false;}}
// Current logical provenance retained in the suspended slot, never a permit to
// replay its former executable route. No recursive permission or gate history.
export function copyNativeIdleStrollHeldExecution(value){
 const r=copyNativeIdleStrollReference(value?.sourceReference),p=value.pose,h=value.resumeHandle,w=value.walkState;
 if(value.kind!=='native-idle-stroll-held-execution'||value.version!==1||!only(value,['kind','version','actorId','bodyId','sourceReference','assignmentSequence','resumeHandle','suspendedAt','executedThrough','pose','walkState'])||value.actorId!==r.actorId||value.bodyId!==r.bodyId||!id(value.assignmentSequence)||value.assignmentSequence<=r.sourceControlSequence||!only(h,['authorityEpoch','session','slot','generation'])||!sameHandle({...h,generation:r.expectedRouteHandle.generation},r.expectedRouteHandle)||!id(h.generation)||h.generation===r.expectedRouteHandle.generation||h.generation>0xffffffff||
  !finite(value.suspendedAt)||value.suspendedAt<r.worldBoundary.effectiveTime||value.suspendedAt>=r.endTime||!Number.isFinite(value.executedThrough)||value.executedThrough<value.suspendedAt||!only(p,poseKeys)||!poseKeys.every(k=>finite(p[k]))||p.radius!==r.pose.radius||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>p[k]<0)||!only(w,r.version===2?['mode','rng','approachRetry','age','remaining']:['mode','rng','approachRetry','age'])||r.version===2&&w.remaining!==r.walkRemaining||w.mode!=='walk'||w.rng!==r.walkRng||w.age!==value.suspendedAt-r.worldBoundary.effectiveTime||w.approachRetry!==Math.max(0,r.approachRetry-w.age))throw TypeError('Invalid current held Idle stroll source');
 return Object.freeze({kind:value.kind,version:1,actorId:r.actorId,bodyId:r.bodyId,sourceReference:r,assignmentSequence:value.assignmentSequence,resumeHandle:Object.freeze({...h}),suspendedAt:value.suspendedAt,executedThrough:value.executedThrough,pose:Object.freeze(Object.fromEntries(poseKeys.map(k=>[k,p[k]]))),walkState:Object.freeze({mode:'walk',rng:w.rng,approachRetry:w.approachRetry,age:w.age,...(r.version===2?{remaining:w.remaining}:{})})});
}
export function nativeIdleStrollPresentationMatches(prepared,actual,value){
 const b=copyNativeIdleStrollAttestation(value),r=b.reference,route=actual?.nativeRoute;
 return sameNativeIdleStrollReference(b.preparedReference,prepared.nativeIdleStroll)&&route?.actorId===r.actorId&&route.assignmentSequence===b.assignmentSequence&&sameHandle(route.routeHandle,r.expectedRouteHandle)&&actual.startTime===r.worldBoundary.effectiveTime&&actual.endTime===r.endTime&&nativeMotionPresentationMatches(prepared,actual,b.gateIds);
}

export function copyNativeIdleStrollResources(value){
 if(value?.version!==1||value.kind!==22||value.phase!=='committed'||!only(value,['version','kind','phase','worldBoundary','nativeRoute','nativeIdleStrollBinding','presentation']))throw TypeError('Invalid native Idle stroll resources');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),nativeRoute=copyNativeRouteReference(value.nativeRoute),nativeIdleStrollBinding=copyNativeIdleStrollAttestation(value.nativeIdleStrollBinding),presentation=copyNativeRoutePresentation(value.presentation),r=nativeIdleStrollBinding.reference;
 if(!sameNativeWorldBoundary(worldBoundary,r.worldBoundary)||presentation.worldBoundary&&!sameNativeWorldBoundary(presentation.worldBoundary,worldBoundary)||nativeRoute.actorId!==r.actorId||nativeRoute.assignmentSequence!==nativeIdleStrollBinding.assignmentSequence||!sameHandle(nativeRoute.routeHandle,r.expectedRouteHandle)||JSON.stringify(presentation.nativeRoute)!==JSON.stringify(nativeRoute)||presentation.startTime!==r.worldBoundary.effectiveTime||presentation.endTime!==r.endTime||presentation.profile!==r.profile||presentation.radius!==r.pose.radius||presentation.motionMode!=='worker'||presentation.motionFlags!==0||presentation.rows[1]!==r.pose.x||presentation.rows[2]!==r.pose.z||[8,9,10,13].some((index,i)=>presentation.rows[index]!==[r.pose.runPhase,r.pose.walkPhase,r.pose.carryPhase,r.pose.runRemaining][i])||presentation.gates.length!==nativeIdleStrollBinding.gateIds.length||presentation.gates.some(g=>!nativeIdleStrollBinding.gateIds.includes(g.gateId)))throw TypeError('Native Idle stroll resource association mismatch');
 return Object.freeze({version:1,kind:22,phase:'committed',worldBoundary,nativeRoute,nativeIdleStrollBinding,presentation});
}
