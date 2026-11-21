import {copyNativeTaskRequestReference} from './native-task-request-reference.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const nonnegative=n=>Number.isFinite(n)&&n>=0;
const only=(v,keys)=>v&&Object.keys(v).every(k=>keys.includes(k));

// Correlated transition metadata only. The consumer must still possess the
// original attestation/lease; this receipt cannot admit or reconstruct a body.
export function copyNativePendingTaskCancellation(value){
 const request=copyNativeTaskRequestReference(value?.request),o=value?.owner;
 if(value?.kind!=='native-pending-task-cancellation'||value.version!==1||
    !only(value,['kind','version','request','sequence','effectiveTime','owner'])||
    !id(value.sequence)||value.sequence<=request.requestSequence||
    !nonnegative(value.effectiveTime)||value.effectiveTime<request.requestedAt||
    !only(o,['kind','sequence','ticket','bodyId','endTime'])||![20,21].includes(o.kind)||
    !['sequence','ticket','bodyId'].every(k=>id(o[k]))||o.sequence>=request.requestSequence||
    !nonnegative(o.endTime)||(o.kind===20?o.endTime!==0:o.endTime<=0)){
  throw TypeError('Invalid native pending task cancellation');
 }
 return Object.freeze({kind:value.kind,version:1,request,sequence:value.sequence,
  effectiveTime:value.effectiveTime,owner:Object.freeze({kind:o.kind,sequence:o.sequence,
   ticket:o.ticket,bodyId:o.bodyId,endTime:o.endTime})});
}

export function readNativePendingTaskCancellation(wasm,authorityEpoch,actorId,sequence){
 if(typeof wasm.nav_intent_pending_task_cancellation_snapshot!=='function')return null;
 if(wasm.nav_intent_pending_task_cancellation_snapshot(actorId,sequence)!==1)return null;
 const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_pending_task_cancellation_ptr(),16));
 if(a[0]!==1||a[2]!==actorId||a[13]!==sequence||!a.every(Number.isFinite)){
  throw TypeError('Native task cancellation differs from its event');
 }
 return copyNativePendingTaskCancellation({kind:'native-pending-task-cancellation',version:1,
  request:{kind:'native-task-route-request-reference',version:1,actorId:a[2],taskId:a[3],targetId:a[4],
   requestSequence:a[5],requestedAt:a[8],requestHandle:{kind:'native-task-route-request-handle',
    authorityEpoch,session:a[1],slot:a[6],generation:a[7]}},sequence:a[13],effectiveTime:a[14],
  owner:{kind:a[9],sequence:a[10],ticket:a[11],bodyId:a[12],endTime:a[15]}});
}
