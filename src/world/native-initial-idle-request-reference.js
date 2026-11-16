import {PROFILES} from '../simulation/workforce.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const fields=['kind','version','authorityEpoch','nativeSession','actorId','bodyId','bodyFlags','requestSequence','requestedAt','centerId','profile','workerProfile','pose','idleState'];
const poseFields=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
const declarationFields=fields.filter(k=>!['bodyId','bodyFlags'].includes(k)),declarationPoseFields=poseFields.filter(k=>k!=='radius');
const stateFields=['anchorId','mode','elapsed','remaining','rng','approachRetry'];
export function copyNativeInitialIdleState(idle){
 if(idle===null)return null;
 const anchor=typeof idle?.anchorId==='string'&&/^(farm-plant|farm-structure|village)-([1-9]\d*)$/.exec(idle.anchorId);
 if(!idle||Object.keys(idle).some(k=>!stateFields.includes(k))||!anchor||!id(Number(anchor[2]))||!['rest','watch'].includes(idle.mode)||
  !['elapsed','remaining','approachRetry'].every(k=>Number.isFinite(idle[k])&&Number.isFinite(Math.fround(idle[k]))&&idle[k]>=0)||!Number.isSafeInteger(idle.rng)||idle.rng<0||idle.rng>0xffffffff)throw TypeError('Invalid initial native Idle semantic state');
 return Object.freeze(Object.fromEntries(stateFields.map(k=>[k,idle[k]])));
}
// A fresh semantic source on the existing body. No historical delivery, route,
// stationary attestation or graphical execution permission is represented.
function copyInitialIdleReference(value,bound){
 const pose=value?.pose,idle=value?.idleState;
 const allowed=bound?fields:declarationFields,poseKeys=bound?poseFields:declarationPoseFields;
 if(value?.kind!==(bound?'native-initial-idle-request-reference':'native-initial-idle-declaration-reference')||value.version!==1||Object.keys(value).some(k=>!allowed.includes(k))||
  typeof value.authorityEpoch!=='string'||!value.authorityEpoch||value.authorityEpoch.length>256||!['nativeSession','actorId','requestSequence','centerId'].every(k=>id(value[k]))||
  !Number.isFinite(value.requestedAt)||value.requestedAt<0||!Number.isInteger(value.profile)||value.profile<0||value.profile>31||!PROFILES.some(p=>p.id===value.workerProfile)||
  bound&&(!id(value.bodyId)||!Number.isSafeInteger(value.bodyFlags)||value.bodyFlags<0||value.bodyFlags>0x7fffffff||!(value.bodyFlags&1)||(value.bodyFlags&2))||
  !pose||Object.keys(pose).some(k=>!poseKeys.includes(k))||!poseKeys.every(k=>Number.isFinite(pose[k])&&Number.isFinite(Math.fround(pose[k])))||bound&&(pose.radius<=0||pose.radius>2)||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>pose[k]<0))throw TypeError('Invalid initial native Idle request');
 const copiedIdle=copyNativeInitialIdleState(idle);
 return Object.freeze({kind:value.kind,version:1,authorityEpoch:value.authorityEpoch,nativeSession:value.nativeSession,actorId:value.actorId,...(bound?{bodyId:value.bodyId,bodyFlags:value.bodyFlags}:{}),requestSequence:value.requestSequence,requestedAt:value.requestedAt,centerId:value.centerId,profile:value.profile,workerProfile:value.workerProfile,
  pose:Object.freeze(Object.fromEntries(poseKeys.map(k=>[k,pose[k]]))),idleState:copiedIdle});
}
export function copyNativeInitialIdleRequestReference(value){return copyInitialIdleReference(value,true);}
// This declaration can precede physical binding. Its type contains no body,
// radius or flags and can never stand in for a prepared execution source.
export function copyNativeInitialIdleDeclarationReference(value){return copyInitialIdleReference(value,false);}
export function sameNativeInitialIdleRequestReference(a,b){try{return JSON.stringify(copyNativeInitialIdleRequestReference(a))===JSON.stringify(copyNativeInitialIdleRequestReference(b));}catch{return false;}}
