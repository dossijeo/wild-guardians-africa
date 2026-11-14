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

// Owned presentation inputs for the existing terrain proposal. They project
// consequences only; the separate direct channel must still attest any body.
export function copyNativeWorldStopEffects(resources,boundary){
 if(resources?.routeEffects===undefined)return null;
 boundary=copyNativeWorldBoundary(boundary);nativeSuspendedBodiesFromProposal(resources,boundary);
 const routes=resources.routeEffects,gate=resources.gateEffects;
 if(typeof resources.retainsNativeAssignments!=='boolean'||resources.retainsNativeAssignments!==(routes.rows.length===0)||gate?.version!==1||gate.rowWidth!==3||!(gate.rows instanceof Float64Array)||gate.rows.length%3||gate.rows.length>32768*3||!gate.rows.every(Number.isFinite))throw TypeError('Invalid native world stop effects');
 const actors=new Set(),gates=new Set();
 for(let i=0;i<routes.rows.length;i+=26){const row=routes.rows.subarray(i,i+26);copyNativeRouteReference({actorId:row[0],assignmentSequence:row[1],routeHandle:{authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,slot:row[2],generation:row[3]}});if(actors.has(row[0])||![0,4].includes(row[5])||row[6]!==boundary.effectiveTime||!Number.isSafeInteger(row[4])||row[4]<1||row[5]===0&&row[7]!==0)throw TypeError('Invalid native route stop effect');actors.add(row[0]);}
 for(let i=0;i<gate.rows.length;i+=3){const id=gate.rows[i],mechanism=gate.rows[i+1],opening=gate.rows[i+2];if(!Number.isSafeInteger(id)||id<1||gates.has(id)||!Number.isSafeInteger(mechanism)||mechanism<1||opening<0||opening>1)throw TypeError('Invalid native gate stop effect');gates.add(id);}
 return Object.freeze({version:1,phase:'proposal',nativeSession:boundary.nativeSession,ticket:boundary.ticket,effectiveTime:boundary.effectiveTime,retainsNativeAssignments:resources.retainsNativeAssignments,routeEffects:Object.freeze({version:1,rowWidth:26,rows:routes.rows.slice()}),gateEffects:Object.freeze({version:1,rowWidth:3,rows:gate.rows.slice()})});
}
