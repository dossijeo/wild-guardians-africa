// Optional CPU attribution only. With no witness, do not read the clock.
export function loadingSyncWitness(witness,label,run,now=()=>performance.now()){
 if(!witness)return run();
 const start=now();let failed=false;
 try{return run();}catch(error){failed=true;throw error;}finally{
  const end=now();try{witness({label,start,end,duration:end-start,failed,scope:'Synchronous invocation CPU wall time; no GPU queries or awaited work.'});}catch{}
 }
}
