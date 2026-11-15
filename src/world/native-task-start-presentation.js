import {nativeTaskStartReferenceFromProposal,sameNativeTaskStartReference} from './native-task-start-reference.js';
import {copyNativePresentationSamples} from './native-presentation-samples.js';
import {copyNativeGatePresentation} from './native-gate-presentation.js';

// The existing native sample/geometry contract, with a distinct source request.
// It cannot pass a committed route or suspended-resume resource validator.
export function copyNativeTaskStartProposal(value){
 const nativeStart=nativeTaskStartReferenceFromProposal(value),{worldBoundary}=nativeStart;
 if(value.nativeStart!==undefined&&!sameNativeTaskStartReference(nativeStart,value.nativeStart)||value.motionMode!=='worker'||!Number.isSafeInteger(value.profile)||value.profile<0||!Number.isInteger(value.motionFlags)||value.motionFlags<0||value.motionFlags>63||!Number.isFinite(value.radius)||value.radius<=0||![value.origin?.x,value.origin?.z].every(Number.isFinite)||!['distance','speed','runDistance','runSpeed','runBudget'].every(key=>Number.isFinite(value[key])&&value[key]>=0)||!(value.points instanceof Float32Array)||value.points.length<2||value.points.length%2!==0||value.points.length>8192||!value.points.every(Number.isFinite)||!Array.isArray(value.gates)||value.gates.length>1024)throw TypeError('Invalid native task start presentation');
 const rows=copyNativePresentationSamples(value),gates=value.gates.map(gate=>copyNativeGatePresentation(gate,{worldBoundary,startTime:value.startTime,endTime:value.endTime}));
 if(rows[1]!==value.origin.x||rows[2]!==value.origin.z||new Set(gates.map(gate=>gate.gateId)).size!==gates.length)throw TypeError('Invalid native task start origin or gates');
 return Object.freeze({kind:value.kind,version:1,ticket:Object.freeze({...value.ticket}),worldBoundary,nativeStart,sourceRequestHandle:nativeStart.sourceRequestHandle,expectedRouteHandle:nativeStart.expectedRouteHandle,actorId:nativeStart.actorId,bodyId:nativeStart.bodyId,taskId:nativeStart.taskId,targetId:nativeStart.targetId,requestSequence:nativeStart.requestSequence,requestedAt:nativeStart.requestedAt,sourceControlSequence:nativeStart.sourceControlSequence,profile:value.profile,motionFlags:value.motionFlags,radius:value.radius,origin:Object.freeze({x:value.origin.x,z:value.origin.z}),startTime:value.startTime,endTime:value.endTime,distance:value.distance,speed:value.speed,runDistance:value.runDistance,runSpeed:value.runSpeed,runBudget:value.runBudget,motionMode:'worker',rowWidth:16,rows,points:value.points.slice(),gates:Object.freeze(gates),authorizedAutonomy:false,authorizedPassage:false});
}
