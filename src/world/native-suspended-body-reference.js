import {copyNativeRouteReference} from './native-route-reference.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';

// Identifies an already-owned native suspension, not a route to execute. Only
// the direct authority's committed attestation can make this reference current.
export function copyNativeSuspendedBodyReference(value){
 if(value?.kind!=='native-suspended-body'||value.version!==1)throw TypeError('Invalid native suspended body reference');
 const nativeRoute=copyNativeRouteReference(value.nativeRoute),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),generation=nativeRoute.routeHandle.generation;
 if(!worldBoundary||worldBoundary.authorityEpoch!==nativeRoute.routeHandle.authorityEpoch||worldBoundary.nativeSession!==nativeRoute.routeHandle.session||!Number.isSafeInteger(value.bodyId)||value.bodyId<1||generation>0xffffffff||value.resumeGeneration!==(generation===0xffffffff?1:generation+1)||value.suspendedAt!==worldBoundary.effectiveTime)throw TypeError('Invalid native suspension identity or boundary');
 return Object.freeze({kind:'native-suspended-body',version:1,nativeRoute,worldBoundary,bodyId:value.bodyId,resumeGeneration:value.resumeGeneration,suspendedAt:value.suspendedAt});
}

export function sameNativeSuspendedBodyReference(a,b){
 return !!a&&!!b&&a.bodyId===b.bodyId&&a.resumeGeneration===b.resumeGeneration&&a.suspendedAt===b.suspendedAt&&sameNativeWorldBoundary(a.worldBoundary,b.worldBoundary)&&a.nativeRoute.actorId===b.nativeRoute.actorId&&a.nativeRoute.assignmentSequence===b.nativeRoute.assignmentSequence&&['authorityEpoch','session','slot','generation'].every(key=>a.nativeRoute.routeHandle[key]===b.nativeRoute.routeHandle[key]);
}

export function nativeSuspendedBodyReferenceCovered(reference,boundary){
 const expected=reference.worldBoundary;return !!boundary&&expected.authorityEpoch===boundary.authorityEpoch&&expected.nativeSession===boundary.nativeSession&&boundary.ticket>=expected.ticket&&boundary.effectiveTime>=reference.suspendedAt;
}

// Copy BEFORE calling a preparer. A mutable presentation payload must not be
// able to rewrite the authority's later body-ownership attestation.
export function nativeSuspendedBodiesFromProposal(resources,boundary){
 if(resources?.routeEffects===undefined)return Object.freeze([]);
 const worldBoundary=copyNativeWorldBoundary(boundary),effects=resources.routeEffects;
 if(!worldBoundary||resources.version!==1||resources.phase!=='proposal'||resources.nativeSession!==worldBoundary.nativeSession||resources.ticket!==worldBoundary.ticket||resources.effectiveTime!==worldBoundary.effectiveTime||effects.version!==1||effects.rowWidth!==26||!(effects.rows instanceof Float64Array)||effects.rows.length%26||effects.rows.length>32768*26||!effects.rows.every(Number.isFinite))throw TypeError('Invalid native proposal suspension effects');
 const result=[],actors=new Set(),bodies=new Set();
 for(let i=0;i<effects.rows.length;i+=26){const row=effects.rows.subarray(i,i+26);if(row[5]!==4)continue;
  const reference=copyNativeSuspendedBodyReference({kind:'native-suspended-body',version:1,nativeRoute:{actorId:row[0],assignmentSequence:row[1],routeHandle:{authorityEpoch:worldBoundary.authorityEpoch,session:worldBoundary.nativeSession,slot:row[2],generation:row[3]}},worldBoundary,bodyId:row[4],resumeGeneration:row[7],suspendedAt:row[6]});
  if(actors.has(reference.nativeRoute.actorId)||bodies.has(reference.bodyId))throw TypeError('Duplicate native suspension effect');actors.add(reference.nativeRoute.actorId);bodies.add(reference.bodyId);result.push(reference);
 }
 return Object.freeze(result);
}
