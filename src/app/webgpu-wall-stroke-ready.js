// Await the existing published-frame barrier for the sequence captured on
// release. Authority may advance meanwhile; this is not a moving target.
export async function pickReadyTerrainStroke({client,samples,minSequence,isCurrent,signal,timeoutMs=20000,requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame}){
 if(typeof client?.waitForCurrentFrame!=='function'||typeof client?.pickTerrainStroke!=='function'||typeof isCurrent!=='function'||!Number.isSafeInteger(minSequence)||minSequence<0||!Number.isFinite(timeoutMs)||timeoutMs<=0||typeof requestFrame!=='function'||typeof cancelFrame!=='function')throw TypeError('Invalid wall stroke readiness');
 const abort=new AbortController();let frame=null;
 const cancelled=()=>abort.abort(signal?.reason??new DOMException('Wall stroke cancelled','AbortError'));
 const check=()=>{if(signal?.aborted)throw signal.reason??new DOMException('Wall stroke cancelled','AbortError');if(!isCurrent())throw Error('Stale WebGPU pick');};
 const watch=()=>{try{check();}catch(error){abort.abort(error);return;}frame=requestFrame(watch);};
 const timer=setTimeout(()=>abort.abort(new DOMException('Wall stroke presentation timed out','TimeoutError')),timeoutMs);
 signal?.addEventListener('abort',cancelled,{once:true});
 try{
  check();watch();
  try{await client.waitForCurrentFrame({minSequence,signal:abort.signal});}catch(error){throw abort.signal.aborted?abort.signal.reason:error;}
  check();if(abort.signal.aborted)throw abort.signal.reason;
 }finally{clearTimeout(timer);if(frame!==null)cancelFrame(frame);signal?.removeEventListener('abort',cancelled);}
 // The existing picker retains camera/viewport/terrain and sequence guards.
 // It is issued once. Cancellation after issue still prevents delivery.
 check();const result=await client.pickTerrainStroke(samples,{minSequence});check();return result;
}
