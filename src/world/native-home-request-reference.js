import {nativeIdleCycleBodyState} from './native-idle-cycle-body-source.js';
const id=n=>Number.isSafeInteger(n)&&n>0;
const fields=['kind','version','authorityEpoch','nativeSession','actorId','bodyId','bodyFlags','requestSequence','requestedAt','profile','home','pose'];
const poseFields=['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'];
// A current semantic request in the native intent owner, not an executable
// route, old settlement receipt, graphical permission or saved authority token.
function copyReference(value,bound){
 const flight=value?.version===2,permitted=flight?[...fields,'raidSpawnSequence']:fields;
 const home=value?.home,pose=value?.pose,allowed=bound?permitted:permitted.filter(k=>!['bodyId','bodyFlags'].includes(k)),poseKeys=bound?poseFields:poseFields.filter(k=>k!=='radius');
 if(value?.kind!==(bound?'native-home-request-reference':'native-home-declaration-reference')||!(value.version===1||flight&&id(value.raidSpawnSequence))||Object.keys(value).some(k=>!allowed.includes(k))||
  typeof value.authorityEpoch!=='string'||!value.authorityEpoch||value.authorityEpoch.length>256||!['nativeSession','actorId','requestSequence'].every(k=>id(value[k]))||
  !Number.isFinite(value.requestedAt)||value.requestedAt<0||!Number.isInteger(value.profile)||value.profile<0||value.profile>31||bound&&(!id(value.bodyId)||!Number.isSafeInteger(value.bodyFlags)||value.bodyFlags<0||value.bodyFlags>0x7fffffff||!(value.bodyFlags&1)||(value.bodyFlags&2))||
  !home||Object.keys(home).some(k=>!['villageId','x','z'].includes(k))||!id(home.villageId)||!['x','z'].every(k=>Number.isFinite(home[k])&&Math.abs(home[k])<2147483000)||
  !pose||Object.keys(pose).some(k=>!poseKeys.includes(k))||!poseKeys.every(k=>Number.isFinite(pose[k])&&Number.isFinite(Math.fround(pose[k])))||
  bound&&(pose.radius<=0||pose.radius>2)||!bound&&['x','z'].some(k=>Math.abs(pose[k])>=2147483000)||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>pose[k]<0))throw TypeError('Invalid fresh native Home request');
 return Object.freeze({kind:value.kind,version:value.version,...(flight?{raidSpawnSequence:value.raidSpawnSequence}:{}),authorityEpoch:value.authorityEpoch,nativeSession:value.nativeSession,actorId:value.actorId,...(bound?{bodyId:value.bodyId,bodyFlags:value.bodyFlags}:{}),requestSequence:value.requestSequence,requestedAt:value.requestedAt,profile:value.profile,
  home:Object.freeze({villageId:home.villageId,x:home.x,z:home.z}),pose:Object.freeze(Object.fromEntries(poseKeys.map(k=>[k,pose[k]])))});
}
export const copyNativeHomeRequestReference=value=>copyReference(value,true);
export const copyNativeHomeDeclarationReference=value=>copyReference(value,false);
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
// A genuine pending Farm13 can change its goal before ever acquiring23.
// Its typed source, body and pose remain exact; there is no Idle ancestry.
export function nativeHomeRequestContinuesFarmRequest(request,source){
 return source?.kind==='native-farm-arrival-request-reference'&&source.version===1&&nativeHomeRequestContinuesInitialIdle(request,source);
}

// Link a new Home request to the actual acquired cycle, not its older body
// declaration or the stroll which originally reached this stationary pose.
// Typed inputs cross their own boundaries before this continuation check.
export function nativeHomeRequestContinuesIdleCycle(request,cycle){
 const r=cycle?.reference,w=r?.worldBoundary;if(!request||!r||!w)return false;
 const q=nativeIdleCycleBodyState(r.sourceBody);
 return request.actorId===r.actorId&&request.bodyId===r.bodyId&&request.bodyFlags===q.bodyFlags&&request.profile===q.profile&&
  request.authorityEpoch===w.authorityEpoch&&request.nativeSession===w.nativeSession&&request.requestSequence>cycle.cycleSequence&&request.requestedAt>=w.effectiveTime&&poseFields.every(k=>request.pose[k]===q.pose[k]);
}
// Both values crossed their typed native/direct boundaries. The old stroll
// describes provenance only; Home must start at the actually suspended pose.
export function nativeHomeRequestContinuesHeldIdleStroll(request,source){
 const r=source?.sourceReference,h=source?.resumeHandle;
 return !!request&&source?.kind==='native-idle-stroll-held-execution'&&!!r&&!!h&&request.actorId===r.actorId&&request.bodyId===r.bodyId&&request.bodyFlags===r.bodyFlags&&request.profile===r.profile&&
  request.authorityEpoch===r.worldBoundary.authorityEpoch&&request.nativeSession===r.worldBoundary.nativeSession&&request.requestSequence>source.assignmentSequence&&request.requestedAt>=source.suspendedAt&&poseFields.every(k=>request.pose[k]===source.pose[k]);
}
// Farm keeps its own typed ancestry; the new Home goal uses only the final
// physical pose. It cannot borrow an Idle decision or a moving Farm corridor.
export function nativeHomeRequestContinuesHeldFarmArrival(request,source){
 const r=source?.sourceReference,q=r?.sourceRequest,h=source?.resumeHandle;
 return !!request&&source?.kind==='native-farm-arrival-held-execution'&&!!q&&!!h&&request.actorId===source.actorId&&request.bodyId===source.bodyId&&request.bodyFlags===q.bodyFlags&&request.profile===q.profile&&
  request.authorityEpoch===r.worldBoundary.authorityEpoch&&request.nativeSession===r.worldBoundary.nativeSession&&request.requestSequence>source.assignmentSequence&&request.requestedAt>=source.suspendedAt&&poseFields.every(k=>request.pose[k]===source.pose[k]);
}
// A real23 endpoint is not a24 suspension. Typed native inputs retain the
// executed body's pose and ancestry; only18 may acquire another trajectory.
export function nativeHomeRequestContinuesCompletedFarmArrival(request,source){
 const b=source?.binding,r=b?.reference,q=r?.sourceRequest,h=source?.nativeRoute;
 return !!request&&source?.kind==='native-farm-arrival-route-execution'&&source.version===1&&Number.isFinite(source.executedThrough)&&source.arrived===true&&source.running===false&&source.currentSpeed===0&&!!q&&!!h?.routeHandle&&source.executedThrough>=r.endTime&&source.actorId===r.actorId&&source.bodyId===r.bodyId&&h.actorId===r.actorId&&h.assignmentSequence===b.assignmentSequence&&['authorityEpoch','session','slot','generation'].every(k=>h.routeHandle[k]===r.expectedRouteHandle[k])&&request.actorId===source.actorId&&request.bodyId===source.bodyId&&request.bodyFlags===q.bodyFlags&&request.profile===q.profile&&request.authorityEpoch===r.worldBoundary.authorityEpoch&&request.nativeSession===r.worldBoundary.nativeSession&&request.requestSequence>b.assignmentSequence&&request.requestedAt>=r.endTime&&poseFields.every(k=>request.pose[k]===(k==='radius'?q.pose.radius:source[k]));
}
// A completed WALK supplies its executed endpoint, never a fabricated REST.
export function nativeHomeRequestContinuesCompletedIdleStroll(request,source){
 const b=source?.binding,r=b?.reference;
 return !!request&&source?.kind==='native-idle-stroll-execution'&&source.version===1&&source.arrived===true&&Number.isFinite(source.executedThrough)&&!!r&&source.executedThrough>=r.endTime&&source.actorId===r.actorId&&source.bodyId===r.bodyId&&request.actorId===source.actorId&&request.bodyId===source.bodyId&&request.bodyFlags===r.bodyFlags&&request.profile===r.profile&&request.authorityEpoch===r.worldBoundary.authorityEpoch&&request.nativeSession===r.worldBoundary.nativeSession&&request.requestSequence>b.assignmentSequence&&request.requestedAt>=r.endTime&&poseFields.every(k=>request.pose[k]===source.pose[k]);
}
export function nativeHomeRequestContinuesHeldWorker(request,source){
 if(source?.kind==='native-task-route-held-execution'){
  const route=source.nativeRoute,handle=route?.routeHandle;
  return !!request&&!!handle&&!!source.pose&&request.actorId===route.actorId&&request.bodyId===source.bodyId&&request.profile===source.profile&&
   request.authorityEpoch===handle.authorityEpoch&&request.nativeSession===handle.session&&
   request.requestSequence>route.assignmentSequence&&request.requestedAt>=source.suspendedAt&&
   poseFields.every(key=>request.pose[key]===source.pose[key]);
 }
 return nativeHomeRequestContinuesHeldIdleStroll(request,source)||nativeHomeRequestContinuesHeldFarmArrival(request,source);
}
