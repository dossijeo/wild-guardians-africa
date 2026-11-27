import {floorFloat32} from '../float32-time.js';
import {copyNativeFarmArrivalRouteAttestation,copyNativeFarmArrivalRouteProposal,sameNativeFarmArrivalRouteReference} from './native-farm-arrival-route.js';
import {copyNativeIdleStrollAttestation,copyNativeIdleStrollProposal,sameNativeIdleStrollReference} from './native-idle-stroll.js';
import {copyNativeTaskRequestReference} from './native-task-request-reference.js';
import {copyNativeSuspendedBodyReference,sameNativeSuspendedBodyReference} from './native-suspended-body-reference.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {nativeFarmArrivalStopCodec,nativeIdleStrollStopCodec,NATIVE_STOP_POSE_FIELDS} from './native-worker-route-stop-codec.js';
import {sameNativeRouteReference} from './native-route-reference.js';

export const stopFields=Object.freeze(['age',...Object.keys(NATIVE_STOP_POSE_FIELDS)]);
function copyStoppedTaskSource(kind,input){
 const farm=kind===24,codec=farm?nativeFarmArrivalStopCodec:nativeIdleStrollStopCodec,field=farm?'farm':'stroll';
 const stop=codec.copyAttestation(input?.proof),previous=(farm?copyNativeFarmArrivalRouteAttestation:copyNativeIdleStrollAttestation)(input[field]),
   request=copyNativeTaskRequestReference(input.request),revokedSequence=input.revokedSequence;
 const r=stop.reference,boundary=r.worldBoundary,source=previous.reference,owner=r.routes[0];
 if(!stop.projection||r.routes.length!==1||r.gates.length||previous.gateIds.length||
    !sameNativeRouteReference(r.sourceRoute,{actorId:source.actorId,assignmentSequence:previous.assignmentSequence,routeHandle:source.expectedRouteHandle})||
    owner.state!==4||owner.bodyId!==source.bodyId||source.actorId!==request.actorId||
    boundary.nativeSession!==request.requestHandle.session||boundary.authorityEpoch!==request.requestHandle.authorityEpoch||
    !Number.isSafeInteger(revokedSequence)||revokedSequence<=previous.assignmentSequence||revokedSequence>=request.requestSequence||
    source.worldBoundary.ticket>=r.worldBoundary.ticket||source.worldBoundary.effectiveTime>=r.worldBoundary.effectiveTime||
    request.requestedAt<r.worldBoundary.effectiveTime||r.worldBoundary.effectiveTime>=source.endTime)
   throw Error('Invalid suspended worker task recovery source');
 const selector=codec.copyStoppedBody({kind:codec.stoppedBodyKind,version:1,actorId:source.actorId,stop:r});
 const bodyReference=copyNativeSuspendedBodyReference({kind:'native-suspended-body',version:1,nativeRoute:owner.nativeRoute,
   worldBoundary:boundary,bodyId:owner.bodyId,resumeGeneration:owner.resumeGeneration,suspendedAt:boundary.effectiveTime});
 const reference=Object.freeze({actorId:source.actorId,bodyId:source.bodyId,worldBoundary:boundary,selector,
   epoch:previous.preparedReference.worldBoundary.effectiveTime});
 return Object.freeze({kind:`native-stop${kind}-task-recovery`,version:1,proof:stop,[field]:previous,request,revokedSequence,reference,bodyReference});
}
export const copyStop24Source=input=>copyStoppedTaskSource(24,input);
export const copyStop12Source=input=>copyStoppedTaskSource(12,input);
export const sameStop24Source=(a,b)=>{try{return JSON.stringify(copyStop24Source(a))===JSON.stringify(copyStop24Source(b));}catch{return false;}};
export const sameStop12Source=(a,b)=>{try{return JSON.stringify(copyStop12Source(a))===JSON.stringify(copyStop12Source(b));}catch{return false;}};
export function copyStop24Resources(value){
 if(value?.kind!==24||value.version!==1||value.phase!=='committed'||
    Object.keys(value).some(k=>!['version','kind','phase','worldBoundary','stoppedTaskBinding','farmTemplate'].includes(k)))throw Error('Invalid Stop24 recovery resources');
 const stoppedTaskBinding=copyStop24Source(value.stoppedTaskBinding),worldBoundary=copyNativeWorldBoundary(value.worldBoundary);
 if(!sameNativeWorldBoundary(worldBoundary,stoppedTaskBinding.reference.worldBoundary))throw Error('Stop24 recovery source belongs to another world');
 const farmTemplate=copyNativeFarmArrivalRouteProposal(value.farmTemplate);
 if(!sameNativeFarmArrivalRouteReference(farmTemplate.nativeFarmArrival,stoppedTaskBinding.farm.preparedReference)||farmTemplate.gates.length)
   throw Error('Stop24 recovery lost its admitted Farm table');
 return Object.freeze({kind:24,version:1,phase:'committed',worldBoundary,stoppedTaskBinding,farmTemplate});
}
export function copyStop12Resources(value){
 if(value?.kind!==12||value.version!==1||value.phase!=='committed'||
    Object.keys(value).some(k=>!['version','kind','phase','worldBoundary','stoppedTaskBinding','strollTemplate'].includes(k)))throw Error('Invalid Stop12 recovery resources');
 const stoppedTaskBinding=copyStop12Source(value.stoppedTaskBinding),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),
   strollTemplate=copyNativeIdleStrollProposal(value.strollTemplate);
 if(!sameNativeWorldBoundary(worldBoundary,stoppedTaskBinding.reference.worldBoundary)||strollTemplate.gates.length||
    !sameNativeIdleStrollReference(strollTemplate.nativeIdleStroll,stoppedTaskBinding.stroll.preparedReference))throw Error('Stop12 recovery lost its admitted Idle table');
 return Object.freeze({kind:12,version:1,phase:'committed',worldBoundary,stoppedTaskBinding,strollTemplate});
}
export const sameStop24Clock=(selector,ref)=>nativeFarmArrivalStopCodec.sameStoppedBody(selector?.selector??selector,ref?.selector??ref);
export const sameStop12Clock=(selector,ref)=>nativeIdleStrollStopCodec.sameStoppedBody(selector?.selector??selector,ref?.selector??ref);
export const stop12ProjectionMatches=(row,proof)=>stoppedRecoveryProjectionMatches(row,proof,proof.stroll.reference.worldBoundary.effectiveTime);
export function stop24ProjectionMatches(row,proof){
 return stoppedRecoveryProjectionMatches(row,proof,proof.farm.reference.worldBoundary.effectiveTime);
}
export function stoppedRecoveryProjectionMatches(row,proof,startedAt){
 const p=proof.proof.projection.routeEffects.rows.slice(8,26),value=row?.projection;
 if(!value||!sameNativeSuspendedBodyReference(row.bodyReference,proof.bodyReference)||
    value.age!==floorFloat32(proof.reference.worldBoundary.effectiveTime-startedAt))return false;
 return Object.entries(NATIVE_STOP_POSE_FIELDS).every(([field,index])=>value[field]===Math.fround(p[index]));
}
