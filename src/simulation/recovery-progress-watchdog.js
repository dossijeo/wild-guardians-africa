export const RECOVERY_IDLE_MS=120000,RECOVERY_TOTAL_MS=600000,RECOVERY_REQUEST_MS=RECOVERY_TOTAL_MS+10000;
// Two bounds: time since the last acknowledged replay item, and total time.
export function createRecoveryProgressWatchdog({idleMs=RECOVERY_IDLE_MS,totalMs=RECOVERY_TOTAL_MS,onTimeout,schedule=setTimeout,cancel=clearTimeout}={}){
 if(!Number.isFinite(idleMs)||idleMs<=0||!Number.isFinite(totalMs)||totalMs<idleMs||typeof onTimeout!=='function'||typeof schedule!=='function'||typeof cancel!=='function')throw TypeError('Invalid recovery watchdog');
 let closed=false,idle=null,total=null;function dispose(){if(closed)return;closed=true;if(idle!==null)cancel(idle);if(total!==null)cancel(total);idle=total=null;}function fail(reason){if(closed)return;dispose();onTimeout(reason);}function progress(){if(closed)return false;if(idle!==null)cancel(idle);idle=schedule(()=>fail('idle'),idleMs);return true;}total=schedule(()=>fail('total'),totalMs);progress();return {progress,dispose};
}

// Activation may drain already accepted commands and wait for graphics ACKs.
// Observe progress; a short RPC deadline must not revoke a healthy handoff.
export async function awaitRecoveryProgress({run,readProgress,idleMs=RECOVERY_IDLE_MS,totalMs=RECOVERY_TOTAL_MS,schedule=setTimeout,cancel=clearTimeout}={}){
 if(typeof run!=='function'||typeof readProgress!=='function')throw TypeError('Invalid recovery progress operation');
 const abort=new AbortController();let poll=null,closed=false,rejectFailure,previous=readProgress();
 const failure=new Promise((_,reject)=>{rejectFailure=reject;});
 const watch=createRecoveryProgressWatchdog({idleMs,totalMs,schedule,cancel,onTimeout:reason=>{abort.abort();rejectFailure(Error('Recovery activation '+reason+' timeout'));}});
 function inspect(){if(closed)return;try{const next=readProgress();if(next!==previous){previous=next;watch.progress();}poll=schedule(inspect,100);}catch(error){abort.abort();rejectFailure(error);}}
 poll=schedule(inspect,100);
 try{return await Promise.race([Promise.resolve().then(()=>run(abort.signal)),failure]);}finally{closed=true;cancel(poll);watch.dispose();abort.abort();}
}
