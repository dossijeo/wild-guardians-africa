// Optional CPU attribution only. With no witness, do not read the clock.
export function loadingSyncWitness(witness,label,run,now=()=>performance.now()){
 if(!witness)return run();
 const start=now();let failed=false;
 try{return run();}catch(error){failed=true;throw error;}finally{
  const end=now();try{witness({label,start,end,duration:end-start,failed,scope:'Synchronous invocation CPU wall time; no GPU queries or awaited work.'});}catch{}
 }
}

// Optional attribution for an existing asynchronous phase. Elapsed time includes
// its CPU submissions, awaited readiness/frame delivery and overlapping work;
// never sum these nested spans as CPU or GPU time. The ordinary path is exact.
export function loadingAwaitWitness(witness,label,run,now=()=>performance.now()){
 if(!witness)return run();
 const start=now();let token,started=false;
 // Optional bounded native diagnostics can retain an unresolved phase. Plain
 // witnesses still receive exactly one completed span, never a start row.
 try{if(typeof witness.onAwaitStart==='function'){token=witness.onAwaitStart({label,start});started=true;}}catch{}
 const record=failed=>{const end=now(),span={label,start,end,duration:end-start,failed,scope:'Awaited phase wall time including nested CPU, waits and concurrent presentation; not exclusive CPU or GPU duration.'};
  if(started)try{witness.onAwaitEnd?.(token,span);}catch{}
  try{witness(span);}catch{}
 };
 try{return Promise.resolve(run()).then(value=>{record(false);return value;},error=>{record(true);throw error;});}catch(error){record(true);throw error;}
}
