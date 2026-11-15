const id=n=>Number.isSafeInteger(n)&&n>0;
const fields=['kind','version','actorId','taskId','targetId','authorityEpoch','nativeSession','requestSequence','requestedAt'];
// A fresh native intent declaration after loading semantic progress. This is
// neither an old route handle nor permission to execute a restored action.
export function copyNativeTaskActionRestoreReference(value){
 if(value?.kind!=='native-task-action-restore-reference'||value.version!==1||Object.keys(value).some(k=>!fields.includes(k))||!['actorId','taskId','targetId','nativeSession','requestSequence'].every(k=>id(value[k]))||typeof value.authorityEpoch!=='string'||!value.authorityEpoch||!Number.isFinite(value.requestedAt)||value.requestedAt<0)throw TypeError('Invalid native action restore source');
 return Object.freeze(Object.fromEntries(fields.map(k=>[k,value[k]])));
}
export function sameNativeTaskActionRestoreReference(a,b){return !!a&&!!b&&fields.every(k=>a[k]===b[k]);}
