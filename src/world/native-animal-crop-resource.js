import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativePresentationSamples} from './native-presentation-samples.js';
import {ceilFloat32} from '../float32-time.js';

const common=['actorId','bodyId','targetId','centerId','requestSequence','slot','generation','radius','x','z','phase','yaw','targetX','targetZ','centerX','centerZ'];
const strike=['routeTicket','routeAssignment','clip','duration'];
const requestFields=common.filter(key=>key!=='slot'&&key!=='generation');
const restoreFields=['attackId','clip','duration','remaining','requestedAt'];
const id=n=>Number.isSafeInteger(n)&&n>0;
const validTime=n=>Number.isFinite(n)&&n>=0;
function validDestination(value,kind){
 if(value.purpose==='retreat')return kind===26&&value.targetId===null&&value.centerId===null&&value.centerX===null&&value.centerZ===null;
 if(value.purpose==='center')return id(value.targetId)&&value.centerId===value.targetId&&
  Number.isFinite(value.centerX)&&Number.isFinite(value.centerZ)&&value.centerX===value.targetX&&value.centerZ===value.targetZ;
 return value.purpose===undefined&&id(value.targetId)&&id(value.centerId)&&Number.isFinite(value.centerX)&&Number.isFinite(value.centerZ);
}
const fields=value=>value.restore?requestFields:value.kind===26?common:[...common,...strike];

function copyRestoredStrike(value){
 if(!id(value?.attackId)||!Number.isInteger(value.clip)||value.clip<0||value.clip>3||
    !validTime(value.requestedAt)||!Number.isFinite(value.duration)||!(value.duration>0&&value.duration<=120)||
    !Number.isFinite(value.remaining)||!(value.remaining>0&&value.remaining<=value.duration))
  throw TypeError('Invalid saved animal strike');
 return Object.freeze(Object.fromEntries(restoreFields.map(key=>[key,value[key]])));
}
export const sameRestoredAnimalStrike=(a,b)=>a===b||!!a&&!!b&&restoreFields.every(key=>a[key]===b[key]);
export const nativeAnimalStrikeClipAge=(reference,age)=>reference.restore?
 Math.min(Math.fround(reference.duration),Math.fround(Math.fround(reference.duration-reference.restore.remaining)+age)):
 Math.min(reference.duration,age);

// A resource identifies the escrowed program. Only the release from the
// issuer can associate its prepared ticket with an acquired assignment.
export function copyNativeAnimalCropReference(value,kind){
 if(![26,27].includes(kind)||value?.kind!==kind||value.version!==1)throw TypeError('Invalid native crop resource family');
 const boundary=copyNativeWorldBoundary(value.worldBoundary);
 const restore=value.restore===undefined?null:copyRestoredStrike(value.restore);
 if(!boundary||!validDestination(value,kind)||!['actorId','bodyId','requestSequence','sourceControlSequence'].every(key=>id(value[key]))||
    (!restore&&(!id(value.generation)||!Number.isSafeInteger(value.slot)||value.slot<0||value.slot>0xffffffff||value.generation>0xffffffff))||
    value.sourceControlSequence<value.requestSequence||!Number.isFinite(value.radius)||value.radius<=0||
    !['x','z','yaw','targetX','targetZ'].every(k=>Number.isFinite(value[k]))||!validTime(value.phase)||
    !validTime(value.endTime)||value.endTime<boundary.effectiveTime)throw TypeError('Invalid native crop resource owner');
 if(restore&&(kind!==27||value.purpose!==undefined||['slot','generation','routeTicket','routeAssignment'].some(key=>value[key]!==undefined)||
    value.clip!==restore.clip||value.duration!==restore.duration||restore.requestedAt>boundary.effectiveTime||
    value.endTime!==boundary.effectiveTime+restore.remaining||value.endTime<=boundary.effectiveTime))
  throw TypeError('Saved animal strike cannot use a route or another clip');
 if(kind===27&&!restore&&(!id(value.routeTicket)||value.routeTicket>=boundary.ticket||!id(value.routeAssignment)||
    value.routeAssignment<=value.requestSequence||value.routeAssignment>value.sourceControlSequence||
    !Number.isInteger(value.clip)||value.clip<0||value.clip>3||!Number.isFinite(value.duration)||value.duration<=0||
    value.endTime!==boundary.effectiveTime+value.duration))throw TypeError('Invalid native strike source');
 return Object.freeze({version:1,kind,worldBoundary:boundary,sourceControlSequence:value.sourceControlSequence,endTime:value.endTime,
  ...(value.purpose?{purpose:value.purpose}:{}),...(restore?{restore,clip:restore.clip,duration:restore.duration}:{}),
  ...Object.fromEntries(fields(value).map(key=>[key,value[key]]))});
}
const sameOwner=(a,b)=>!!a&&!!b&&[26,27].includes(a.kind)&&a.kind===b.kind&&a.purpose===b.purpose&&
 a.worldBoundary.authorityEpoch===b.worldBoundary.authorityEpoch&&a.worldBoundary.nativeSession===b.worldBoundary.nativeSession&&
 sameRestoredAnimalStrike(a.restore,b.restore)&&fields(a).every(key=>a[key]===b[key]);
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
    value.assignmentSequence<=reference.sourceControlSequence||
    (kind===27?!id(value.attackId)||reference.restore&&reference.restore.attackId!==value.attackId:value.attackId!==undefined))
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
    reference.purpose==='retreat'&&(rows.at(-15)!==Math.fround(reference.targetX)||rows.at(-14)!==Math.fround(reference.targetZ))||
    !Array.isArray(value.gates)||value.gates.length)throw TypeError('Native crop route program lost its source or arrival');
 return Object.freeze({...base,startTime:value.startTime,endTime:value.endTime,rowWidth:16,rows,motionFlags:0,
   radius:value.radius,profile:value.profile,motionMode:'animal',gates:Object.freeze([])});
}

export function copyPendingAnimalCrop(value){
 if(value?.version!==1||!value.authorityEpoch||typeof value.authorityEpoch!=='string'||!id(value.nativeSession)||
    !validDestination(value,26)||!['actorId','bodyId','requestSequence'].every(key=>id(value[key]))||
    !['x','z','yaw','targetX','targetZ','radius','phase'].every(key=>Number.isFinite(value[key]))||value.phase<0||value.radius<=0)
   throw TypeError('Invalid resting crop request');
 const restore=value.restore===undefined?null:copyRestoredStrike(value.restore);
 if(restore&&value.purpose!==undefined)throw TypeError('Only a crop strike can be restored');
 return Object.freeze({version:1,authorityEpoch:value.authorityEpoch,nativeSession:value.nativeSession,
   ...(value.purpose?{purpose:value.purpose}:{}),...(restore?{restore}:{}),...Object.fromEntries(requestFields.map(key=>[key,value[key]]))});
}
export function animalCropMatchesRequest(r,q){
 return !!q&&r.purpose===q.purpose&&r.worldBoundary.authorityEpoch===q.authorityEpoch&&r.worldBoundary.nativeSession===q.nativeSession&&
   sameRestoredAnimalStrike(r.restore,q.restore)&&requestFields.every(key=>r[key]===q[key]);
}

export function nativeAnimalCropPublicationMatches(raid,{reference,attackId}){
 const animal=raid?.animals.find(candidate=>candidate.id==='animal-'+reference.actorId);
 if(animal?.species!=='warthog')return false;
 if(reference.purpose==='retreat')return animal.status==='retreating'&&!animal.targetId&&animal.hitsRemaining===0&&
  (animal.exit??animal.spawn)?.x===reference.targetX&&(animal.exit??animal.spawn)?.z===reference.targetZ;
 const targetId=(reference.purpose==='center'?'structure-':'plant-')+reference.targetId;
 return animal.targetId===targetId&&(reference.kind===26?['entering','walking'].includes(animal.status):
  animal.status==='attacking'&&animal.attackId==='attack-'+attackId);
}
