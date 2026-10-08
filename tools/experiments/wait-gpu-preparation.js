// Candidate only; not yet connected to native preparation while GPU QA is open.
// The submitted work remains asynchronous. A caller's lifetime/deadline check
// can stop waiting even when the driver compilation promise never settles.
export async function waitGpuPreparation(pending,{check,nextFrame}) {
 let settled=false,failed=false,failure;
 Promise.resolve(pending).then(
  ()=>{settled=true;},
  error=>{settled=true;failed=true;failure=error;}
 );
 // Already-resolved work must not introduce an unnecessary animation frame.
 await Promise.resolve();
 while(!settled){check();await nextFrame();}
 // Preserve a real failure, including one racing ownership invalidation.
 if(failed)throw failure;
 check();
}
