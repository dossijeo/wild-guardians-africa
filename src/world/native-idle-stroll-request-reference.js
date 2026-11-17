import {LOCOMOTION} from '../simulation/locomotion-calibration.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const finite=n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n));
const only=(v,keys)=>v&&Object.keys(v).every(k=>keys.includes(k));
const poseKeys=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
const fields=['kind','version','authorityEpoch','nativeSession','actorId','bodyId','bodyFlags','requestSequence','requestedAt','centerId','profile','workerProfile','pose','anchor','idleSeconds','walkRng','approachRetry','destination'];

const declarationFields=fields.filter(k=>k!=='bodyId'&&k!=='bodyFlags'),declarationPoseKeys=poseKeys.filter(k=>k!=='radius');

// A fresh semantic source on a newly bound body. No route handle, old native
// association, recursive cycle history or graphical execution grant is saved.
function copyStrollReference(value,bound){
 const p=value?.pose,a=value?.anchor,d=value?.destination,c=LOCOMOTION.sources.find(c=>c.profile===value?.workerProfile),allowed=bound?fields:declarationFields,keys=bound?poseKeys:declarationPoseKeys;
 if(value?.kind!==(bound?'native-idle-stroll-request-reference':'native-idle-stroll-declaration-reference')||value.version!==1||!only(value,allowed)||typeof value.authorityEpoch!=='string'||!value.authorityEpoch||value.authorityEpoch.length>256||!['nativeSession','actorId','requestSequence','centerId'].every(k=>id(value[k]))||bound&&!id(value.bodyId)||
  !finite(value.requestedAt)||value.requestedAt<0||!Number.isInteger(value.profile)||value.profile<0||value.profile>31||!c||value.idleSeconds!==c.idleSeconds||bound&&(!Number.isSafeInteger(value.bodyFlags)||value.bodyFlags<0||value.bodyFlags>0x7fffffff||!(value.bodyFlags&1)||(value.bodyFlags&2))||
  !only(p,keys)||!keys.every(k=>finite(p[k]))||bound&&(p.radius<=0||p.radius>2)||['x','z'].some(k=>Math.abs(p[k])>=2147483000)||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>p[k]<0)||
  !only(a,['kind','id','x','z','radius'])||![1,2].includes(a.kind)||!id(a.id)||!['x','z','radius'].every(k=>finite(a[k]))||a.radius<=0||a.radius>8||Math.hypot(p.x-a.x,p.z-a.z)>a.radius||
  !only(d,['x','z'])||!finite(d.x)||!finite(d.z)||['x','z'].some(k=>Math.abs(d[k])>=2147483000)||Math.hypot(d.x-a.x,d.z-a.z)>a.radius+1e-9||!Number.isSafeInteger(value.walkRng)||value.walkRng<0||value.walkRng>0xffffffff||!finite(value.approachRetry)||value.approachRetry<0)throw TypeError('Invalid restored native Idle stroll request');
 return Object.freeze({...Object.fromEntries(allowed.map(k=>[k,value[k]])),pose:Object.freeze(Object.fromEntries(keys.map(k=>[k,p[k]]))),anchor:Object.freeze({kind:a.kind,id:a.id,x:a.x,z:a.z,radius:a.radius}),destination:Object.freeze({x:d.x,z:d.z})});
}
export function copyNativeIdleStrollRequestReference(value){return copyStrollReference(value,true);}
export function copyNativeIdleStrollDeclarationReference(value){return copyStrollReference(value,false);}
export function sameNativeIdleStrollRequestReference(a,b){try{return JSON.stringify(copyNativeIdleStrollRequestReference(a))===JSON.stringify(copyNativeIdleStrollRequestReference(b));}catch{return false;}}
