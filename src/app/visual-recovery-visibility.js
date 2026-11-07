// Visibility is a system intent, not a player action against the old frame.
// Keep its latest value while the presentation fence blocks Worker commands.
export function deferVisibilityDuringVisualRecovery(owner,paused,reason){
 if(reason!=='hidden'||owner?.workerRuntime?.status?.().visualDispatchBlocked!==true)return false;
 owner.pendingVisualRecoveryHidden=paused;
 return true;
}

export function takeDeferredRecoveryVisibility(owner){
 const value=owner?.pendingVisualRecoveryHidden;
 if(typeof value!=='boolean')return null;
 delete owner.pendingVisualRecoveryHidden;
 return value;
}
