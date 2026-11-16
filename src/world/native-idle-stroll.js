import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeIdleCycleNextRequest} from './native-idle-cycle.js';
import {copyNativePresentationSamples} from './native-presentation-samples.js';
import {copyNativeGatePresentation} from './native-gate-presentation.js';
import {nativeMotionPresentationMatches} from './native-motion-presentation-match.js';
import {LOCOMOTION} from '../simulation/locomotion-calibration.js';
import {floorFloat32} from '../float32-time.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const finite=n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n));
const only=(value,keys)=>value&&Object.keys(value).every(k=>keys.includes(k));
const poseKeys=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
const fields=['kind','version','actorId','bodyId','centerId','profile','workerProfile','bodyFlags','pose','anchor','sourceCycleSequence','sourceDecisionSequence','requestedAt','walkRng','approachRetry','idleSeconds','destination','expectedRouteHandle','sourceControlSequence','worldBoundary','endTime'];
const anchorId=a=>`${a.kind===1?'farm-plant':'farm-structure'}-${a.id}`;
const sameHandle=(a,b)=>!!a&&!!b&&['authorityEpoch','session','slot','generation'].every(k=>a[k]===b[k]);
// Bounded value metadata and existing generation/session handles. References
// name their causal predecessor; they never retain a recursive permission tree.
export function copyNativeIdleStrollReference(value){
 if(value?.kind!=='native-idle-stroll-reference'||value.version!==1||!only(value,fields))throw TypeError('Invalid native Idle stroll reference');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),p=value.pose,a=value.anchor,d=value.destination,h=value.expectedRouteHandle,c=LOCOMOTION.sources.find(c=>c.profile===value.workerProfile);
 if(!worldBoundary||!['actorId','bodyId','centerId','sourceCycleSequence','sourceDecisionSequence','sourceControlSequence'].every(k=>id(value[k]))||value.sourceDecisionSequence<=value.sourceCycleSequence||value.sourceControlSequence<value.sourceDecisionSequence||!finite(value.requestedAt)||value.requestedAt<0||worldBoundary.effectiveTime<value.requestedAt||!finite(value.endTime)||value.endTime<=worldBoundary.effectiveTime||
  !Number.isInteger(value.profile)||value.profile<0||value.profile>31||!c||value.idleSeconds!==c.idleSeconds||!Number.isSafeInteger(value.bodyFlags)||value.bodyFlags<0||value.bodyFlags>0x7fffffff||!(value.bodyFlags&1)||(value.bodyFlags&2)||
  !only(p,poseKeys)||!poseKeys.every(k=>finite(p[k]))||p.radius<=0||p.radius>2||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>p[k]<0)||
  !only(a,['kind','id','x','z','radius'])||![1,2].includes(a.kind)||!id(a.id)||!['x','z','radius'].every(k=>finite(a[k]))||a.radius<=0||a.radius>8||Math.hypot(p.x-a.x,p.z-a.z)>a.radius||
  !only(d,['x','z'])||!finite(d.x)||!finite(d.z)||Math.hypot(d.x-a.x,d.z-a.z)>a.radius+1e-9||Math.hypot(d.x-p.x,d.z-p.z)<.75||!Number.isSafeInteger(value.walkRng)||value.walkRng<0||value.walkRng>0xffffffff||!finite(value.approachRetry)||value.approachRetry<0||
  !only(h,['authorityEpoch','session','slot','generation'])||h.authorityEpoch!==worldBoundary.authorityEpoch||h.session!==worldBoundary.nativeSession||!Number.isSafeInteger(h.slot)||h.slot<0||h.slot>0xffffffff||!id(h.generation)||h.generation>0xffffffff)throw TypeError('Native Idle stroll differs from its bounded source');
 return Object.freeze({...Object.fromEntries(fields.map(k=>[k,value[k]])),worldBoundary,pose:Object.freeze(Object.fromEntries(poseKeys.map(k=>[k,p[k]]))),anchor:Object.freeze({kind:a.kind,id:a.id,x:a.x,z:a.z,radius:a.radius}),destination:Object.freeze({x:d.x,z:d.z}),expectedRouteHandle:Object.freeze({authorityEpoch:h.authorityEpoch,session:h.session,slot:h.slot,generation:h.generation})});
}
export function sameNativeIdleStrollReference(a,b){try{return JSON.stringify(copyNativeIdleStrollReference(a))===JSON.stringify(copyNativeIdleStrollReference(b));}catch{return false;}}
const program=({worldBoundary,sourceControlSequence,endTime,...value})=>value;
const sameProgram=(a,b)=>JSON.stringify(program(a))===JSON.stringify(program(b));
export function nativeIdleStrollSuccessor(previous,next){
 const a=copyNativeIdleStrollReference(previous),b=copyNativeIdleStrollReference(next);
 return sameProgram(a,b)&&a.worldBoundary.authorityEpoch===b.worldBoundary.authorityEpoch&&a.worldBoundary.nativeSession===b.worldBoundary.nativeSession&&(b.worldBoundary.ticket>a.worldBoundary.ticket||sameNativeIdleStrollReference(a,b))&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime&&b.sourceControlSequence>=a.sourceControlSequence&&floorFloat32(b.endTime-b.worldBoundary.effectiveTime)===floorFloat32(a.endTime-a.worldBoundary.effectiveTime);
}
export function nativeIdleStrollContinuesNext(reference,value){
 try{const r=copyNativeIdleStrollReference(reference),n=copyNativeIdleCycleNextRequest(value),q=n.sourceCycle.reference.sourceBody.reference.sourceRequest,a=n.sourceCycle.reference.anchor,s=n.idleState;
  return s.mode==='walk'&&r.actorId===q.actorId&&r.bodyId===q.bodyId&&r.centerId===q.centerId&&r.profile===q.profile&&r.workerProfile===q.workerProfile&&r.bodyFlags===q.bodyFlags&&r.sourceCycleSequence===n.sourceCycle.cycleSequence&&r.sourceDecisionSequence===n.requestSequence&&r.requestedAt===n.requestedAt&&r.worldBoundary.authorityEpoch===q.authorityEpoch&&r.worldBoundary.nativeSession===q.nativeSession&&poseKeys.every(k=>r.pose[k]===q.pose[k])&&anchorId(r.anchor)===a.id&&['x','z','radius'].every(k=>r.anchor[k]===a[k])&&r.walkRng===s.rng&&r.approachRetry===s.approachRetry&&r.destination.x===s.destination.x&&r.destination.z===s.destination.z;
 }catch{return false;}
}
const proposalFields=['kind','version','ticket','worldBoundary','nativeIdleStroll','actorId','bodyId','expectedRouteHandle','sourceControlSequence','profile','motionFlags','radius','origin','startTime','endTime','distance','speed','runDistance','runSpeed','runBudget','motionMode','rowWidth','rows','points','gates','authorizedAutonomy','authorizedPassage'];
export function copyNativeIdleStrollProposal(value){
 if(value?.kind!=='native-idle-stroll-proposal'||value.version!==1||!only(value,proposalFields)||value.authorizedAutonomy!==false||value.authorizedPassage!==false)throw TypeError('Invalid native Idle stroll proposal');
 const r=copyNativeIdleStrollReference(value.nativeIdleStroll),b=copyNativeWorldBoundary(value.worldBoundary),t=value.ticket,p=r.pose;
 if(!sameNativeWorldBoundary(b,r.worldBoundary)||!only(t,['kind','authorityEpoch','session','ticket'])||t.kind!=='native-idle-stroll-proposal-ticket'||t.authorityEpoch!==b.authorityEpoch||t.session!==b.nativeSession||t.ticket!==b.ticket||value.actorId!==r.actorId||value.bodyId!==r.bodyId||!value.expectedRouteHandle||!sameHandle(value.expectedRouteHandle,r.expectedRouteHandle)||value.sourceControlSequence!==r.sourceControlSequence||value.startTime!==b.effectiveTime||value.endTime!==r.endTime||value.profile!==r.profile||value.motionMode!=='worker'||value.motionFlags!==0||value.radius!==p.radius||!only(value.origin,['x','z'])||value.origin.x!==p.x||value.origin.z!==p.z||!['distance','speed','runDistance','runSpeed','runBudget'].every(k=>finite(value[k])&&value[k]>=0)||value.distance<=0||value.speed<=0||value.runDistance!==0||value.runSpeed!==0||value.runBudget!==p.runRemaining||!(value.points instanceof Float32Array)||value.points.length<2||value.points.length%2||value.points.length>8192||!value.points.every(Number.isFinite)||value.points.at(-2)!==Math.fround(r.destination.x)||value.points.at(-1)!==Math.fround(r.destination.z)||!Array.isArray(value.gates)||value.gates.length>1024)throw TypeError('Native Idle stroll motion differs from its source');
 const rows=copyNativePresentationSamples(value),gates=value.gates.map(g=>copyNativeGatePresentation(g,{worldBoundary:b,startTime:value.startTime,endTime:value.endTime}));
 for(let i=0;i<value.points.length;i+=2)if(Math.hypot(value.points[i]-r.anchor.x,value.points[i+1]-r.anchor.z)>r.anchor.radius)throw TypeError('Native Idle stroll left its local anchor');
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
export function nativeIdleStrollPresentationMatches(prepared,actual,value){
 const b=copyNativeIdleStrollAttestation(value),r=b.reference,route=actual?.nativeRoute;
 return sameNativeIdleStrollReference(b.preparedReference,prepared.nativeIdleStroll)&&route?.actorId===r.actorId&&route.assignmentSequence===b.assignmentSequence&&sameHandle(route.routeHandle,r.expectedRouteHandle)&&actual.startTime===r.worldBoundary.effectiveTime&&actual.endTime===r.endTime&&nativeMotionPresentationMatches(prepared,actual,b.gateIds);
}
