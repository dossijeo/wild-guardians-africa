import {copyNativeRouteReference} from './native-route-reference.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeSuspendedBodyReference,copyNativeWorldStopEffects} from './native-suspended-body-reference.js';

const id=n=>Number.isSafeInteger(n)&&n>0,only=(v,keys)=>Object.keys(v).every(k=>keys.includes(k));
const sameRoute=(a,b)=>!!a&&!!b&&a.actorId===b.actorId&&a.assignmentSequence===b.assignmentSequence&&!!a.routeHandle&&!!b.routeHandle&&['authorityEpoch','session','slot','generation'].every(k=>a.routeHandle[k]===b.routeHandle[k]);
function routeInWorld(value,worldBoundary){
 const route=copyNativeRouteReference(value),h=route.routeHandle;
 if(h.authorityEpoch!==worldBoundary.authorityEpoch||h.session!==worldBoundary.nativeSession||h.slot>0xffffffff||h.generation>0xffffffff)throw TypeError('Native stop route belongs to another authority or slot generation');
 return route;
}
// Same bounded owner/effect schema for explicit native source families12/24/25.
// The immutable family tag remains part of every public identity comparison.
function createCodec(kind,prefix){
 const [title,name]={12:['Idle stroll','stroll'],24:['Farm arrival','farm arrival'],25:['Task route','task route']}[kind];
 const referenceKind=prefix+'-stop-reference',ticketKind=prefix+'-stop-proposal-ticket',attestationKind=prefix+'-stop-attestation',translationKind=prefix+'-stop-translation',stoppedBodyKind=prefix+'-stopped-body';
// Resource identities only. Poses remain owned proposal data; copying this
// reference neither suspends a body nor grants a presentation horizon.
function copyReference(value){
 if(value?.kind!==referenceKind||value.version!==1||!only(value,['kind','version','worldBoundary','sourceRoute','routes','gates']))throw TypeError(`Invalid native ${title} stop reference`);
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary);if(!worldBoundary)throw TypeError('Native stop requires its world boundary');
 const sourceRoute=routeInWorld(value.sourceRoute,worldBoundary),actors=new Set(),bodies=new Set(),gateIds=new Set();
 if(!Array.isArray(value.routes)||!value.routes.length||value.routes.length>32768||!Array.isArray(value.gates)||value.gates.length>32768)throw TypeError('Invalid native stop owner collection');
 const routes=Array.from(value.routes,r=>{
  if(!r||!only(r,['nativeRoute','bodyId','state','resumeGeneration'])||!id(r.bodyId)||![0,4].includes(r.state)||actors.has(r.nativeRoute?.actorId)||bodies.has(r.bodyId))throw TypeError('Invalid or duplicate native stop route owner');
  const nativeRoute=routeInWorld(r.nativeRoute,worldBoundary);
  if(r.state===4)copyNativeSuspendedBodyReference({kind:'native-suspended-body',version:1,nativeRoute,worldBoundary,bodyId:r.bodyId,resumeGeneration:r.resumeGeneration,suspendedAt:worldBoundary.effectiveTime});
  else if(r.resumeGeneration!==0)throw TypeError('Invalid native stopped route consequence');
  actors.add(nativeRoute.actorId);bodies.add(r.bodyId);return Object.freeze({nativeRoute,bodyId:r.bodyId,state:r.state,resumeGeneration:r.resumeGeneration});
 });
 if(!routes.some(r=>r.state===4&&sameRoute(r.nativeRoute,sourceRoute)))throw TypeError(`Native ${name} stop lacks its suspended source route`);
 const gates=Array.from(value.gates,g=>{if(!g||!only(g,['gateId','mechanism'])||!id(g.gateId)||!id(g.mechanism)||gateIds.has(g.gateId))throw TypeError('Invalid or duplicate native stopped motor owner');gateIds.add(g.gateId);return Object.freeze({gateId:g.gateId,mechanism:g.mechanism});});
 return Object.freeze({kind:value.kind,version:1,worldBoundary,sourceRoute,routes:Object.freeze(routes),gates:Object.freeze(gates)});
}
const sameOwners=(a,b)=>a?.kind===referenceKind&&b?.kind===referenceKind&&a.version===1&&b.version===1&&sameRoute(a.sourceRoute,b.sourceRoute)&&Array.isArray(a.routes)&&Array.isArray(b.routes)&&a.routes.length===b.routes.length&&a.routes.every((r,i)=>r.bodyId===b.routes[i].bodyId&&r.state===b.routes[i].state&&r.resumeGeneration===b.routes[i].resumeGeneration&&sameRoute(r.nativeRoute,b.routes[i].nativeRoute))&&Array.isArray(a.gates)&&Array.isArray(b.gates)&&a.gates.length===b.gates.length&&a.gates.every((g,i)=>g.gateId===b.gates[i].gateId&&g.mechanism===b.gates[i].mechanism);
const sameReference=(a,b)=>sameOwners(a,b)&&sameNativeWorldBoundary(a.worldBoundary,b.worldBoundary);
const successor=(a,b)=>sameOwners(a,b)&&a.worldBoundary.authorityEpoch===b.worldBoundary.authorityEpoch&&a.worldBoundary.nativeSession===b.worldBoundary.nativeSession&&b.worldBoundary.ticket>a.worldBoundary.ticket&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime;

function referenceFromProposal(value){
 if(value?.kind!==kind||value.version!==1||value.phase!=='proposal'||value.retainsNativeAssignments!==false||value.authorizedAutonomy!==false||value.authorizedPassage!==false||!Array.isArray(value.chunks)||value.chunks.length||!Array.isArray(value.removed)||value.removed.length)throw TypeError('Invalid body-only native stop proposal');
 const reference=copyReference(value.nativeStop),b=reference.worldBoundary;
 if(!sameNativeWorldBoundary(value.worldBoundary,b)||value.nativeSession!==b.nativeSession||value.ticket!==b.ticket||value.effectiveTime!==b.effectiveTime)throw TypeError('Native stop proposal boundary mismatch');
 const effects=copyNativeWorldStopEffects(value,b);if(!effects?.routeEffects.rows.length)throw TypeError('Native stop proposal lacks native effects');
 const routes=[],gates=[];
 for(let i=0;i<effects.routeEffects.rows.length;i+=26){const r=effects.routeEffects.rows.subarray(i,i+26),pose=r.subarray(8);if(![0,1].includes(pose[6])||pose[7]!==b.effectiveTime||pose[15]!==0||pose[16]!==0||![1,2].includes(pose[17])||r[5]===4&&pose[17]!==2||[0,1,3,4,9,10,11].some(k=>!Number.isFinite(Math.fround(pose[k]))))throw TypeError('Native stop proposal changed its frozen physical pose');routes.push({nativeRoute:{actorId:r[0],assignmentSequence:r[1],routeHandle:{authorityEpoch:b.authorityEpoch,session:b.nativeSession,slot:r[2],generation:r[3]}},bodyId:r[4],state:r[5],resumeGeneration:r[7]});}
 for(let i=0;i<effects.gateEffects.rows.length;i+=3)gates.push({gateId:effects.gateEffects.rows[i],mechanism:effects.gateEffects.rows[i+1]});
 const actual=copyReference({...reference,routes,gates});if(!sameReference(actual,reference))throw TypeError('Native stop effects differ from their resource owners');return reference;
}
function copyProposal(value){
 if(!value||!only(value,['version','phase','nativeSession','ticket','effectiveTime','kind','retainsNativeAssignments','routeEffects','gateEffects','chunks','removed','worldBoundary','nativeStop','authorizedAutonomy','authorizedPassage']))throw TypeError('Unexpected native stop proposal fields');
 const nativeStop=referenceFromProposal(value),worldBoundary=nativeStop.worldBoundary,effects=copyNativeWorldStopEffects(value,worldBoundary);
 return Object.freeze({...effects,kind,worldBoundary,nativeStop,chunks:Object.freeze([]),removed:Object.freeze([]),authorizedAutonomy:false,authorizedPassage:false});
}
function copyTicket(value){
 if(value?.kind!==ticketKind||!only(value,['kind','authorityEpoch','session','ticket','sourceRoute'])||typeof value.authorityEpoch!=='string'||!value.authorityEpoch||!id(value.session)||!id(value.ticket))throw TypeError(`Invalid native ${name} stop proposal ticket`);
 const sourceRoute=routeInWorld(value.sourceRoute,{authorityEpoch:value.authorityEpoch,nativeSession:value.session});return Object.freeze({kind:value.kind,authorityEpoch:value.authorityEpoch,session:value.session,ticket:value.ticket,sourceRoute});
}
function ticketFromProposal(value){const r=referenceFromProposal(value),b=r.worldBoundary;return copyTicket({kind:ticketKind,authorityEpoch:b.authorityEpoch,session:b.nativeSession,ticket:b.ticket,sourceRoute:r.sourceRoute});}
function copyAttestation(value){
 if(value?.kind!==attestationKind||value.version!==1||value.projectionVersion!==1||!only(value,['kind','version','projectionVersion','reference','preparedReference','projection']))throw TypeError(`Invalid native ${name} stop attestation`);
 const reference=copyReference(value.reference),preparedReference=copyReference(value.preparedReference);
 if(!sameReference(preparedReference,reference)&&!successor(preparedReference,reference))throw TypeError('Native stop differs from its prepared resource owners');
 const projection=value.projection===undefined?null:copyProjection(value.projection,reference);
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,reference,preparedReference,...(projection?{projection}:{})});
}
const attestationCovers=(proof,reference)=>proof?.kind===attestationKind&&proof.version===1&&proof.projectionVersion===1&&(sameReference(proof.reference,reference)||sameReference(proof.preparedReference,reference));

// Owned final values, distinct from immutable authority identities. A copy is
// not a presentation permission; the native source and direct release attest it.
function copyProjection(value,reference){
 if(value?.version!==1||!only(value,['version','routeEffects','gateEffects']))throw TypeError('Invalid native stop projection');
 reference=copyReference(reference);const b=reference.worldBoundary;
 const effect=(input,width)=>{const rows=input?.rows;if(!(rows instanceof Float64Array)&&!Array.isArray(rows)||rows.length>32768*width||rows.length%width||input?.version!==1||input?.rowWidth!==width)throw TypeError('Invalid native stop projection rows');return {...input,rows:rows instanceof Float64Array?rows:Float64Array.from(rows)};};
 const proposal=copyProposal({version:1,phase:'proposal',kind,nativeSession:b.nativeSession,ticket:b.ticket,effectiveTime:b.effectiveTime,worldBoundary:b,nativeStop:reference,retainsNativeAssignments:false,routeEffects:effect(value.routeEffects,26),gateEffects:effect(value.gateEffects,3),chunks:[],removed:[],authorizedAutonomy:false,authorizedPassage:false});
 // Final attestation values are immutable snapshots, including their rows.
 // Unlike proposal buffers, they can be shared with a preparer without aliasing
 // writable data into the later direct-authority release.
 const frozen=input=>Object.freeze({version:1,rowWidth:input.rowWidth,rows:Object.freeze(Array.from(input.rows))});
 return Object.freeze({version:1,routeEffects:frozen(proposal.routeEffects),gateEffects:frozen(proposal.gateEffects)});
}
function copyStoppedBody(value){
 if(value?.kind!==stoppedBodyKind||value.version!==1||!only(value,['kind','version','stop','actorId'])||!id(value.actorId))throw TypeError('Invalid native stopped body selector');
 const stop=copyReference(value.stop),owner=stop.routes.find(r=>r.nativeRoute.actorId===value.actorId);
 if(owner?.state!==4)throw TypeError('Native stopped body selector requires a suspended owner');
 return Object.freeze({kind:value.kind,version:1,stop,actorId:value.actorId});
}
const sameStoppedBody=(a,b)=>a?.kind===stoppedBodyKind&&b?.kind===stoppedBodyKind&&a.version===1&&b.version===1&&a.actorId===b.actorId&&sameReference(a.stop,b.stop);
 return Object.freeze({kind,referenceKind,ticketKind,attestationKind,translationKind,stoppedBodyKind,
   stoppedGateKind:prefix+'-stopped-gate',
   copyReference,sameReference,successor,referenceFromProposal,copyProposal,copyTicket,ticketFromProposal,copyAttestation,attestationCovers,copyProjection,copyStoppedBody,sameStoppedBody});
}
export const nativeIdleStrollStopCodec=createCodec(12,'native-idle-stroll');
export const nativeFarmArrivalStopCodec=createCodec(24,'native-farm-arrival');
export const nativeTaskRouteStopCodec=createCodec(25,'native-task-route');
export function nativeGateStopCodec(reference){
 if(reference?.kind===nativeIdleStrollStopCodec.referenceKind)return nativeIdleStrollStopCodec;
 if(reference?.kind===nativeFarmArrivalStopCodec.referenceKind)return nativeFarmArrivalStopCodec;
 if(reference?.kind===nativeTaskRouteStopCodec.referenceKind)return nativeTaskRouteStopCodec;
 return null;
}
export function nativeStoppedGateClockMatches(binding,gate,stop){
 const selector=binding?.nativeStopped,codec=nativeGateStopCodec(stop);
 return !!codec&&selector?.kind===codec.stoppedGateKind&&selector.gateId===gate.gateId&&selector.mechanism===gate.mechanism&&
   binding.semantic==='stop-value'&&binding.stopField==='opening'&&binding.epoch===stop.worldBoundary.effectiveTime&&
   codec.sameReference(selector.stop,stop);
}
export const NATIVE_STOP_POSE_FIELDS=Object.freeze({x:0,z:1,phase:3,yaw:4,arrived:6,runPhase:9,walkPhase:10,carryPhase:11});
