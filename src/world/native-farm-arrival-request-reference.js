import {PROFILES} from '../simulation/workforce.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const finite=n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n));
const fields=['kind','version','authorityEpoch','nativeSession','actorId','bodyId','bodyFlags','requestSequence','requestedAt','centerId','profile','workerProfile','pose','goal'];
const poseFields=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
const goalFields=['x','z','centerX','centerZ','arrivalRadius'];
function copyReference(value,bound){
 const allowed=bound?fields:fields.filter(k=>!['bodyId','bodyFlags'].includes(k)),poseKeys=bound?poseFields:poseFields.filter(k=>k!=='radius'),p=value?.pose,g=value?.goal;
 if(value?.kind!==(bound?'native-farm-arrival-request-reference':'native-farm-arrival-declaration-reference')||value.version!==1||Object.keys(value).some(k=>!allowed.includes(k))||
  typeof value.authorityEpoch!=='string'||!value.authorityEpoch||value.authorityEpoch.length>256||!['nativeSession','actorId','requestSequence','centerId'].every(k=>id(value[k]))||!Number.isFinite(value.requestedAt)||value.requestedAt<0||!Number.isInteger(value.profile)||value.profile<0||value.profile>31||!PROFILES.some(p=>p.id===value.workerProfile)||
  bound&&(!id(value.bodyId)||!Number.isSafeInteger(value.bodyFlags)||value.bodyFlags<0||value.bodyFlags>0x7fffffff||!(value.bodyFlags&1)||(value.bodyFlags&2))||
  !p||Object.keys(p).some(k=>!poseKeys.includes(k))||!poseKeys.every(k=>finite(p[k]))||['x','z'].some(k=>Math.abs(p[k])>=2147483000)||bound&&(p.radius<=0||p.radius>2)||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>p[k]<0)||
  !g||Object.keys(g).some(k=>!goalFields.includes(k))||!goalFields.every(k=>finite(g[k]))||['x','z','centerX','centerZ'].some(k=>Math.abs(g[k])>=2147483000)||g.arrivalRadius!==2)throw TypeError('Invalid native farm arrival source');
 return Object.freeze({kind:value.kind,version:1,authorityEpoch:value.authorityEpoch,nativeSession:value.nativeSession,actorId:value.actorId,...(bound?{bodyId:value.bodyId,bodyFlags:value.bodyFlags}:{}),requestSequence:value.requestSequence,requestedAt:value.requestedAt,centerId:value.centerId,profile:value.profile,workerProfile:value.workerProfile,pose:Object.freeze(Object.fromEntries(poseKeys.map(k=>[k,p[k]]))),goal:Object.freeze(Object.fromEntries(goalFields.map(k=>[k,g[k]])))});
}
// A semantic goal/body source grants neither a route nor an arrival fact.
export const copyNativeFarmArrivalRequestReference=value=>copyReference(value,true);
export const copyNativeFarmArrivalDeclarationReference=value=>copyReference(value,false);
export function sameNativeFarmArrivalRequestReference(a,b){try{return JSON.stringify(copyNativeFarmArrivalRequestReference(a))===JSON.stringify(copyNativeFarmArrivalRequestReference(b));}catch{return false;}}
