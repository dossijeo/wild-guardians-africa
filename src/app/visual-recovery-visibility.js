// Visibility is a system intent: submit it to the recovery owner immediately,
// while ordinary player commands remain fenced.
export function deferVisibilityDuringVisualRecovery(owner,paused,reason,onError=()=>{}){
 if(reason!=='hidden'||owner?.workerRuntime?.status?.().visualDispatchBlocked!==true)return false;
 let pending;try{pending=typeof owner.workerRuntime.stageRecoveryVisibility==='function'?Promise.resolve(owner.workerRuntime.stageRecoveryVisibility(paused)):Promise.reject(Error('Recovery visibility channel unavailable'));}catch(error){pending=Promise.reject(error);}
 owner.pendingVisualRecoveryVisibility=pending;
 pending.catch(error=>{if(owner.pendingVisualRecoveryVisibility===pending)onError(error);});
 return true;
}
