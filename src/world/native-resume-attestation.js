import {ceilFloat32,floorFloat32} from '../float32-time.js';
import {copyNativeResumeReference,nativeResumeSuccessor,sameNativeResumeReference} from './native-resume-reference.js';

// A typed fact received ONLY on the direct authority channel. Copying this
// relationship supplies no permission; NativeRouteControl checks the issued
// assignment and the exact suspended source before it installs the fact.
export function copyNativeResumeAttestation(value){
 const reference=copyNativeResumeReference(value?.reference),assignmentSequence=value?.assignmentSequence;
 if(!Number.isSafeInteger(assignmentSequence)||assignmentSequence<=reference.sourceControlSequence)throw TypeError('Invalid native resume assignment attestation');
 if(value.preparedReference===undefined)return Object.freeze({reference,assignmentSequence});
 const preparedReference=copyNativeResumeReference(value.preparedReference),gateIds=value.gateIds;
 if(!nativeResumeSuccessor(preparedReference,reference)||value.projectionVersion!==1||floorFloat32(reference.endTime-reference.worldBoundary.effectiveTime)!==floorFloat32(preparedReference.endTime-preparedReference.worldBoundary.effectiveTime)||!Array.isArray(gateIds)||gateIds.length>1024||gateIds.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(gateIds).size!==gateIds.length)throw TypeError('Invalid deferred native resume attestation');
 return Object.freeze({reference,assignmentSequence,preparedReference,projectionVersion:1,gateIds:Object.freeze([...gateIds])});
}
export function nativeResumeAttestationCovers(value,reference){return sameNativeResumeReference(value?.reference,reference)||sameNativeResumeReference(value?.preparedReference,reference);}

// Resource compatibility check at the retained graphical owner. This cannot
// install a direct-control proof or authorize a command packet by itself.
export function nativeResumePresentationMatches(prepared,actual,value){
 const binding=copyNativeResumeAttestation(value),route=actual?.nativeRoute,reference=binding.reference;
 if(!sameNativeResumeReference(binding.preparedReference,prepared.nativeResume)||route?.actorId!==reference.actorId||route.assignmentSequence!==binding.assignmentSequence||JSON.stringify(route.routeHandle)!==JSON.stringify(reference.expectedRouteHandle)||actual.startTime!==reference.worldBoundary.effectiveTime||actual.endTime!==reference.endTime||['motionMode','motionFlags','profile','radius'].some(key=>actual[key]!==prepared[key])||actual.rows.length!==prepared.rows.length||actual.gates.length!==prepared.gates.length)return false;
 for(let i=0;i<actual.rows.length;i++)if((i%16?Math.fround(actual.rows[i]):ceilFloat32(actual.rows[i]-actual.startTime))!==(i%16?Math.fround(prepared.rows[i]):ceilFloat32(prepared.rows[i]-prepared.startTime)))return false;
 return actual.gates.every((gate,i)=>{const old=prepared.gates[i];return binding.gateIds.includes(gate.gateId)&&['gateId','entityId','mechanism','modelId'].every(key=>gate[key]===old[key])&&['rootMatrix','hinge','positions','leafFlags'].every(key=>gate[key].length===old[key].length&&gate[key].every((v,j)=>Object.is(v,old[key][j])))&&gate.rows.length===old.rows.length&&gate.rows.every((v,j)=>(j%2?Math.fround(v):ceilFloat32(v-actual.startTime))===(j%2?Math.fround(old.rows[j]):ceilFloat32(old.rows[j]-prepared.startTime)));});
}
