// Native preparation uses this only through explicit owned-compilation/wait QA gates.
// The submitted work remains asynchronous. A caller's lifetime/deadline check
// can stop waiting even when the driver compilation promise never settles.
export async function waitGpuPreparation(pending,{check,nextFrame,signal,pollIntervalMs=100}) {
 if(!Number.isFinite(pollIntervalMs)||pollIntervalMs<=0)throw Error('Invalid GPU cancellation polling interval');
 let settled=false,failed=false,failure;
 const ready=Promise.resolve(pending).then(
  ()=>{settled=true;},
  error=>{settled=true;failed=true;failure=error;}
 );
 // Already-resolved work must not introduce an unnecessary animation frame.
 await Promise.resolve();
 if(!settled){
  let rejectInterrupted,timer;
  const interrupted=new Promise((resolve,reject)=>{rejectInterrupted=reject;});
  // An already-aborted signal can reject before the loop's check throws.
  // Always observe that rejection, even if no race has been installed yet.
  interrupted.catch(()=>{});
  const poll=()=>{try{check();}catch(error){rejectInterrupted(error);}};
  const abort=()=>{
   try{check();rejectInterrupted(signal.reason??new DOMException('GPU preparation cancelled','AbortError'));}
   catch(error){rejectInterrupted(error);}
  };
  try{
   // A suspended RAF must not suspend owner cancellation or the deadline too.
   // This timer observes existing checks; it does not interrupt driver work.
   timer=setInterval(poll,pollIntervalMs);
   signal?.addEventListener('abort',abort,{once:true});
   if(signal?.aborted)abort();
   while(!settled){
    check();
    await Promise.race([ready,Promise.resolve().then(nextFrame),interrupted]);
   }
  }catch(error){if(failed)throw failure;throw error;}
  finally{clearInterval(timer);signal?.removeEventListener('abort',abort);}
 }
 // Preserve a real failure, including one racing ownership invalidation.
 if(failed)throw failure;
 check();
}
