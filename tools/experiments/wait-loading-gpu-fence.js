import {waitGpuPreparation} from './wait-gpu-preparation.js';

// QA candidate only. Not imported by the loading runtime while native A/B is
// frozen. Cancels the wait, never synchronous driver work already submitted.
export async function waitLoadingGpuFence(renderer,{signal,cancelled=()=>false,getEpoch=()=>0,timeout=30000,now=()=>performance.now(),nextFrame,pollIntervalMs=100}={}) {
 const gl=renderer.getContext(),epoch=getEpoch(),begin=now();let sync,pendingRaf,lost=false;
 const contextLost=()=>{lost=true;};
 const check=()=>{
  if(signal?.aborted||cancelled()||lost||renderer.getContext()!==gl||getEpoch()!==epoch||gl.isContextLost())throw Error('GPU preload cancelled');
  if(now()-begin>timeout)throw Error('GPU preload timed out');
 };
 // Latch the event: isContextLost alone misses loss/restoration between polls.
 gl.canvas?.addEventListener('webglcontextlost',contextLost);
 const frame=nextFrame??(()=>new Promise(resolve=>{pendingRaf=requestAnimationFrame(()=>{pendingRaf=undefined;resolve();});}));
 try{
  check();sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);if(!sync)throw Error('GPU preload fence unavailable');gl.flush();
  for(;;){
   check();const status=gl.clientWaitSync(sync,0,0);
   if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED)return;
   if(status===gl.WAIT_FAILED)throw Error('GPU preload fence failed');
   // One actual RAF per iteration. The timer/abort path can settle this wait
   // even when RAF is suspended; late frame completion cannot adopt readiness.
   const pending=frame();
   await waitGpuPreparation(pending,{check,nextFrame:()=>pending,signal,pollIntervalMs});
  }
 }finally{
  if(pendingRaf!==undefined)cancelAnimationFrame(pendingRaf);
  gl.canvas?.removeEventListener('webglcontextlost',contextLost);
  // Loss already invalidated old handles. Do not delete one in a new context.
  if(sync&&!lost&&renderer.getContext()===gl&&getEpoch()===epoch&&!gl.isContextLost())gl.deleteSync(sync);
 }
}
