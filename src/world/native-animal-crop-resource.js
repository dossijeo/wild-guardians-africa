import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativePresentationSamples} from './native-presentation-samples.js';
import {ceilFloat32} from '../float32-time.js';

const common=['actorId','bodyId','targetId','centerId','requestSequence','slot','generation','radius','x','z','phase','yaw','targetX','targetZ','centerX','centerZ'];
const strike=['routeTicket','routeAssignment','clip','duration'];
const id=n=>Number.isSafeInteger(n)&&n>0;
const validTime=n=>Number.isFinite(n)&&n>=0;
const fields=kind=>kind===26?common:[...common,...strike];

// A resource identifies the escrowed program. Only the release from the
// issuer can associate its prepared ticket with an acquired assignment.
export function copyNativeAnimalCropReference(value,kind){
 if(![26,27].includes(kind)||value?.kind!==kind||value.version!==1)throw TypeError('Invalid native crop resource family');
 const boundary=copyNativeWorldBoundary(value.worldBoundary);
 if(!boundary||!['actorId','bodyId','targetId','centerId','requestSequence','generation','sourceControlSequence'].every(key=>id(value[key]))||
    !Number.isSafeInteger(value.slot)||value.slot<0||value.slot>0xffffffff||value.generation>0xffffffff||
    value.sourceControlSequence<value.requestSequence||!Number.isFinite(value.radius)||value.radius<=0||
    !['x','z','yaw','targetX','targetZ','centerX','centerZ'].every(k=>Number.isFinite(value[k]))||!validTime(value.phase)||
    !validTime(value.endTime)||value.endTime<boundary.effectiveTime)throw TypeError('Invalid native crop resource owner');
 if(kind===27&&(!id(value.routeTicket)||value.routeTicket>=boundary.ticket||!id(value.routeAssignment)||
    value.routeAssignment<=value.requestSequence||value.routeAssignment>value.sourceControlSequence||
    !Number.isInteger(value.clip)||value.clip<0||value.clip>3||!Number.isFinite(value.duration)||value.duration<=0||
    value.endTime!==boundary.effectiveTime+value.duration))throw TypeError('Invalid native strike source');
 return Object.freeze({version:1,kind,worldBoundary:boundary,sourceControlSequence:value.sourceControlSequence,endTime:value.endTime,
  ...Object.fromEntries(fields(kind).map(key=>[key,value[key]]))});
}
const sameOwner=(a,b)=>!!a&&!!b&&[26,27].includes(a.kind)&&a.kind===b.kind&&
 a.worldBoundary.authorityEpoch===b.worldBoundary.authorityEpoch&&a.worldBoundary.nativeSession===b.worldBoundary.nativeSession&&
 fields(a.kind).every(key=>a[key]===b[key]);
export const sameNativeAnimalCropReference=(a,b)=>sameOwner(a,b)&&sameNativeWorldBoundary(a.worldBoundary,b.worldBoundary)&&
 a.sourceControlSequence===b.sourceControlSequence&&a.endTime===b.endTime;
export function nativeAnimalCropSuccessor(actual,prepared){
 return sameOwner(actual,prepared)&&actual.worldBoundary.ticket>=prepared.worldBoundary.ticket&&
  actual.worldBoundary.effectiveTime>=prepared.worldBoundary.effectiveTime&&actual.sourceControlSequence>=prepared.sourceControlSequence&&
  ceilFloat32(actual.endTime-actual.worldBoundary.effectiveTime)===ceilFloat32(prepared.endTime-prepared.worldBoundary.effectiveTime)&&
  (actual.worldBoundary.ticket!==prepared.worldBoundary.ticket||sameNativeAnimalCropReference(actual,prepared));
}
export function copyNativeAnimalCropAttestation(value,kind){
 const reference=copyNativeAnimalCropReference(value?.reference,kind),preparedReference=copyNativeAnimalCropReference(value?.preparedReference,kind);
 if(value.version!==1||!nativeAnimalCropSuccessor(reference,preparedReference)||!id(value.assignmentSequence)||
    value.assignmentSequence<=reference.sourceControlSequence||(kind===27?!id(value.attackId):value.attackId!==undefined))
  throw TypeError('Native crop acquisition is unrelated to its prepared resource');
 return Object.freeze({version:1,reference,preparedReference,assignmentSequence:value.assignmentSequence,...(kind===27?{attackId:value.attackId}:{})});
}
export function copyNativeAnimalCropProposal(value,kind){
 const reference=copyNativeAnimalCropReference(value?.reference,kind);
 const expected=kind===26?'native-animal-crop-route-proposal':'native-animal-crop-strike-proposal';
 if(value.kind!==expected||value.version!==1||value.authorizedAutonomy!==false||
    !sameNativeWorldBoundary(value.worldBoundary,reference.worldBoundary))throw TypeError('Invalid native crop preparation');
 const base={kind:expected,version:1,worldBoundary:reference.worldBoundary,reference,authorizedAutonomy:false};
 if(kind===27)return Object.freeze(base);
 const rows=copyNativePresentationSamples(value);
 if(value.startTime!==reference.worldBoundary.effectiveTime||value.endTime!==reference.endTime||
    value.motionMode!=='animal'||value.motionFlags!==0||value.radius!==reference.radius||!Number.isSafeInteger(value.profile)||value.profile<0||
    rows[1]!==reference.x||rows[2]!==reference.z||rows[4]!==reference.phase||rows.at(-9)!==1||
    !Array.isArray(value.gates)||value.gates.length)throw TypeError('Native crop route program lost its source or arrival');
 return Object.freeze({...base,startTime:value.startTime,endTime:value.endTime,rowWidth:16,rows,motionFlags:0,
   radius:value.radius,profile:value.profile,motionMode:'animal',gates:Object.freeze([])});
}

const requestFields=common.filter(key=>key!=='slot'&&key!=='generation');
export function copyPendingAnimalCrop(value){
 if(value?.version!==1||!value.authorityEpoch||typeof value.authorityEpoch!=='string'||!id(value.nativeSession)||
    !['actorId','bodyId','targetId','centerId','requestSequence'].every(key=>id(value[key]))||
    !requestFields.every(key=>Number.isFinite(value[key]))||value.phase<0||value.radius<=0)
   throw TypeError('Invalid resting crop request');
 return Object.freeze({version:1,authorityEpoch:value.authorityEpoch,nativeSession:value.nativeSession,
   ...Object.fromEntries(requestFields.map(key=>[key,value[key]]))});
}
export function animalCropMatchesRequest(r,q){
 return !!q&&r.worldBoundary.authorityEpoch===q.authorityEpoch&&r.worldBoundary.nativeSession===q.nativeSession&&
   requestFields.every(key=>r[key]===q[key]);
}
