const id=n=>Number.isSafeInteger(n)&&n>0;
const fields=['kind','version','authorityEpoch','nativeSession','actorId','bodyId','bodyFlags','requestSequence','requestedAt','profile','home','pose'];
const poseFields=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
// A current semantic request in the native intent owner, not an executable
// route, old settlement receipt, graphical permission or saved authority token.
export function copyNativeHomeRequestReference(value){
 const home=value?.home,pose=value?.pose;
 if(value?.kind!=='native-home-request-reference'||value.version!==1||Object.keys(value).some(k=>!fields.includes(k))||
  typeof value.authorityEpoch!=='string'||!value.authorityEpoch||value.authorityEpoch.length>256||!['nativeSession','actorId','bodyId','requestSequence'].every(k=>id(value[k]))||
  !Number.isFinite(value.requestedAt)||value.requestedAt<0||!Number.isInteger(value.profile)||value.profile<0||value.profile>31||!Number.isSafeInteger(value.bodyFlags)||value.bodyFlags<0||value.bodyFlags>0x7fffffff||!(value.bodyFlags&1)||(value.bodyFlags&2)||
  !home||Object.keys(home).some(k=>!['villageId','x','z'].includes(k))||!id(home.villageId)||!['x','z'].every(k=>Number.isFinite(home[k])&&Math.abs(home[k])<2147483000)||
  !pose||Object.keys(pose).some(k=>!poseFields.includes(k))||!poseFields.every(k=>Number.isFinite(pose[k])&&Number.isFinite(Math.fround(pose[k])))||
  pose.radius<=0||pose.radius>2||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>pose[k]<0))throw TypeError('Invalid fresh native Home request');
 return Object.freeze({kind:value.kind,version:1,authorityEpoch:value.authorityEpoch,nativeSession:value.nativeSession,actorId:value.actorId,bodyId:value.bodyId,bodyFlags:value.bodyFlags,requestSequence:value.requestSequence,requestedAt:value.requestedAt,profile:value.profile,
  home:Object.freeze({villageId:home.villageId,x:home.x,z:home.z}),pose:Object.freeze(Object.fromEntries(poseFields.map(k=>[k,pose[k]])))});
}
export function sameNativeHomeRequestReference(a,b){try{return JSON.stringify(copyNativeHomeRequestReference(a))===JSON.stringify(copyNativeHomeRequestReference(b));}catch{return false;}}
// Both inputs have already passed their typed boundary validation. This links
// a new request to the actual held Idle; it grants no execution by itself.
export function nativeHomeRequestContinuesIdle(request,settlement){
 const r=settlement?.reference,w=r?.worldBoundary;
 return !!request&&!!r&&!r.home&&request.actorId===r.actorId&&request.bodyId===r.bodyId&&request.profile===r.profile&&
  request.authorityEpoch===w.authorityEpoch&&request.nativeSession===w.nativeSession&&request.requestSequence>settlement.settlementSequence&&request.requestedAt>=w.effectiveTime&&poseFields.every(k=>request.pose[k]===r.pose[k]);
}
// Pending initial Idle has no settlement history. Both inputs have already
// crossed their typed boundaries; this checks their immutable held body once.
export function nativeHomeRequestContinuesInitialIdle(request,initial){
 return !!request&&!!initial&&['authorityEpoch','nativeSession','actorId','bodyId','bodyFlags','profile'].every(k=>request[k]===initial[k])&&
  request.requestSequence>initial.requestSequence&&request.requestedAt>=initial.requestedAt&&poseFields.every(k=>request.pose[k]===initial.pose[k]);
}
