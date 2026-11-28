import {copyNativeInitialIdleBodyAttestation} from './native-initial-idle-body.js';
import {copyNativeInitialIdleState} from './native-initial-idle-request-reference.js';
import {copyNativeIdleStrollRequestReference} from './native-idle-stroll-request-reference.js';
import {LOCOMOTION} from '../simulation/locomotion-calibration.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const finite=n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n));
const fields=['kind','version','authorityEpoch','nativeSession','actorId','bodyId','bodyFlags','sourceSequence','sourceAt','centerId','profile','workerProfile','pose','idleState'];
const poseFields=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
export const isNativeIdleStrollArrivalSource=source=>source?.kind==='native-idle-stroll-arrival-source'||source?.kind==='native-idle-stroll-reanchor-source';
// Actual stationary origins of a finite Idle cycle. An arrived stroll or Farm
// names its native assignment and copies its executed pose; it never embeds a
// previous route/cycle permission or masquerades as an initial-body request.
export function copyNativeIdleCycleBodySource(value){
 if(value?.kind==='native-initial-idle-body-attestation')return copyNativeInitialIdleBodyAttestation(value);
 const p=value?.pose,c=LOCOMOTION.sources.find(c=>c.profile===value?.workerProfile),farm=value?.kind==='native-farm-arrival-idle-source',settled=value?.kind==='native-settled-worker-idle-source',failed=value?.kind==='native-idle-stroll-failed-source';
 if(!farm&&!settled&&!failed&&!isNativeIdleStrollArrivalSource(value)||value.version!==1||Object.keys(value).some(k=>!fields.includes(k)&&(!failed||k!=='sourceRequest'))||typeof value.authorityEpoch!=='string'||!value.authorityEpoch||value.authorityEpoch.length>256||!['nativeSession','actorId','bodyId','sourceSequence','centerId'].every(k=>id(value[k]))||!finite(value.sourceAt)||value.sourceAt<0||!Number.isInteger(value.profile)||value.profile<0||value.profile>31||!c||!Number.isSafeInteger(value.bodyFlags)||value.bodyFlags<0||value.bodyFlags>0x7fffffff||!(value.bodyFlags&1)||(value.bodyFlags&2)||!p||Object.keys(p).some(k=>!poseFields.includes(k))||!poseFields.every(k=>finite(p[k]))||p.radius<=0||p.radius>2||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>p[k]<0))throw TypeError('Invalid native Idle current-body source');
 const idleState=copyNativeInitialIdleState(value.idleState);
 const birth=farm||settled||value.kind==='native-idle-stroll-reanchor-source';
 if(!idleState||idleState.mode!=='rest'||idleState.elapsed!==0||idleState.remaining!==c.idleSeconds*(birth?2:2+Math.floor(idleState.rng/4294967296*3))||birth&&(idleState.approachRetry!==0||idleState.rng===0))throw TypeError('Native Idle arrival source differs from original REST semantics');
 let sourceRequest;
 if(failed){
  sourceRequest=copyNativeIdleStrollRequestReference(value.sourceRequest);const r=sourceRequest;let rng=r.walkRng;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;rng>>>=0;
  if(['authorityEpoch','nativeSession','actorId','bodyId','bodyFlags','centerId','profile','workerProfile'].some(k=>value[k]!==r[k])||value.sourceSequence!==r.requestSequence||value.sourceAt!==r.requestedAt||JSON.stringify(poseFields.map(k=>p[k]))!==JSON.stringify(poseFields.map(k=>r.pose[k]))||idleState.anchorId!==`${r.anchor.kind===1?'farm-plant':'farm-structure'}-${r.anchor.id}`||idleState.rng!==rng||idleState.approachRetry!==r.approachRetry)throw TypeError('Native failed Idle source differs from its original WALK request');
 }
 return Object.freeze({...Object.fromEntries(fields.map(k=>[k,value[k]])),...(failed?{sourceRequest}:{}),pose:Object.freeze(Object.fromEntries(poseFields.map(k=>[k,p[k]]))),idleState});
}
// Correlate bounded native17 metadata with an already validated acquired
// settlement. This structural relation is not an execution or GPU permission.
// Worker animation profile/bodyFlags are absent from the old public17 proof;
// never infer them. Native issued associations and the live actor still check
// the full new reference before installation/drawing.
export function nativeSettledIdleSourceMatches(value,proof){
 try{const q=copyNativeIdleCycleBodySource(value),r=proof?.reference,w=r?.worldBoundary;
  return q.kind==='native-settled-worker-idle-source'&&proof?.kind==='native-task-settlement-attestation'&&proof.version===1&&!r.home&&q.sourceSequence===proof.settlementSequence&&q.sourceAt===w.effectiveTime&&q.authorityEpoch===w.authorityEpoch&&q.nativeSession===w.nativeSession&&['actorId','bodyId','centerId','profile'].every(k=>q[k]===r[k])&&poseFields.every(k=>q.pose[k]===r.pose[k]);
 }catch{return false;}
}
// Common read view, not a new semantic request. Keep the original20 DTO intact
// while actual22/23 counterparts remain bounded value descriptors.
export function nativeIdleCycleBodyState(value){
 const source=copyNativeIdleCycleBodySource(value);
 return source.kind==='native-initial-idle-body-attestation'?Object.freeze({...source.reference.sourceRequest,sourceSequence:source.bodySequence,sourceAt:source.reference.worldBoundary.effectiveTime}):source;
}
