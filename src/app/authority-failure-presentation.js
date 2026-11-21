// A failed simulation host has no authoritative state to reconcile against.
// Closing only its owned presentation rejects outstanding input promises and
// clears provisional visuals. It does not alter or manufacture game state.
export function closeAuthorityFailurePresentation(owner){
 const view=owner?.webGpuWorld;if(!view)return false;
 owner.webGpuWorld=null;try{view.dispose();}catch{}
 return true;
}
