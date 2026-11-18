import {copyNativeInitialIdleBodyAttestation} from './native-initial-idle-body.js';
import {copyNativeInitialIdleState} from './native-initial-idle-request-reference.js';
import {LOCOMOTION} from '../simulation/locomotion-calibration.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const finite=n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n));
const fields=['kind','version','authorityEpoch','nativeSession','actorId','bodyId','bodyFlags','sourceSequence','sourceAt','centerId','profile','workerProfile','pose','idleState'];
const poseFields=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
// Actual stationary origins of a finite Idle cycle. An arrived stroll or Farm
// names its native assignment and copies its executed pose; it never embeds a
// previous route/cycle permission or masquerades as an initial-body request.
export function copyNativeIdleCycleBodySource(value){
 if(value?.kind==='native-initial-idle-body-attestation')return copyNativeInitialIdleBodyAttestation(value);
 const p=value?.pose,c=LOCOMOTION.sources.find(c=>c.profile===value?.workerProfile),farm=value?.kind==='native-farm-arrival-idle-source';
 if(!farm&&value?.kind!=='native-idle-stroll-arrival-source'||value.version!==1||Object.keys(value).some(k=>!fields.includes(k))||typeof value.authorityEpoch!=='string'||!value.authorityEpoch||value.authorityEpoch.length>256||!['nativeSession','actorId','bodyId','sourceSequence','centerId'].every(k=>id(value[k]))||!finite(value.sourceAt)||value.sourceAt<0||!Number.isInteger(value.profile)||value.profile<0||value.profile>31||!c||!Number.isSafeInteger(value.bodyFlags)||value.bodyFlags<0||value.bodyFlags>0x7fffffff||!(value.bodyFlags&1)||(value.bodyFlags&2)||!p||Object.keys(p).some(k=>!poseFields.includes(k))||!poseFields.every(k=>finite(p[k]))||p.radius<=0||p.radius>2||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>p[k]<0))throw TypeError('Invalid native Idle current-body source');
 const idleState=copyNativeInitialIdleState(value.idleState);
 if(!idleState||idleState.mode!=='rest'||idleState.elapsed!==0||idleState.remaining!==c.idleSeconds*(farm?2:2+Math.floor(idleState.rng/4294967296*3))||farm&&(idleState.approachRetry!==0||idleState.rng===0))throw TypeError('Native Idle arrival source differs from original REST semantics');
 return Object.freeze({...Object.fromEntries(fields.map(k=>[k,value[k]])),pose:Object.freeze(Object.fromEntries(poseFields.map(k=>[k,p[k]]))),idleState});
}
// Common read view, not a new semantic request. Keep the original20 DTO intact
// while actual22/23 counterparts remain bounded value descriptors.
export function nativeIdleCycleBodyState(value){
 const source=copyNativeIdleCycleBodySource(value);
 return source.kind==='native-initial-idle-body-attestation'?Object.freeze({...source.reference.sourceRequest,sourceSequence:source.bodySequence,sourceAt:source.reference.worldBoundary.effectiveTime}):source;
}
