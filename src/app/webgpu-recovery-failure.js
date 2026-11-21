// Fence direct input before attempting to establish which presentation owns
// the authority stream. Existing in-flight work cannot be recalled here.
export async function classifyVisualRecoveryFailure(runtime,cause,{finishStarted=false}={}){
 if(!runtime||typeof runtime.blockVisualRecoveryDispatch!=='function'||typeof runtime.markVisualLost!=='function'||typeof runtime.rejectVisualRecovery!=='function'||typeof finishStarted!=='boolean')throw TypeError('Invalid visual recovery failure');
 runtime.blockVisualRecoveryDispatch();let detached=false;if(finishStarted)try{await runtime.markVisualLost();detached=true;}catch{}if(!detached)try{await runtime.rejectVisualRecovery();detached=true;}catch{}
 const error=Error(detached?'Visual recovery failed after the presentation was detached':'Visual recovery separation could not be verified; further commands are blocked',{cause});if(detached)error.retryable=true;else error.code='visual-recovery-indeterminate';return error;
}
