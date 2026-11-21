const id=value=>Number.isSafeInteger(value)&&value>0;
export function copyNativeTaskRequestReference(value){
 const h=value?.requestHandle;
 if(value?.kind!=='native-task-route-request-reference'||value.version!==1||!['actorId','taskId','targetId','requestSequence'].every(key=>id(value[key]))||!Number.isFinite(value.requestedAt)||value.requestedAt<0||h?.kind!=='native-task-route-request-handle'||typeof h.authorityEpoch!=='string'||!h.authorityEpoch||!id(h.session)||!Number.isSafeInteger(h.slot)||h.slot<0||h.slot>0xffffffff||!id(h.generation)||h.generation>0xffffffff)throw TypeError('Invalid native task request control reference');
 return Object.freeze({kind:value.kind,version:1,actorId:value.actorId,taskId:value.taskId,targetId:value.targetId,requestSequence:value.requestSequence,requestedAt:value.requestedAt,requestHandle:Object.freeze({kind:h.kind,authorityEpoch:h.authorityEpoch,session:h.session,slot:h.slot,generation:h.generation})});
}
export function nativeTaskRequestMatchesStart(request,start){
 return !!request&&['actorId','taskId','targetId','requestSequence','requestedAt'].every(key=>request[key]===start[key])&&['authorityEpoch','session','slot','generation'].every(key=>request.requestHandle[key]===start.sourceRequestHandle[key]);
}
