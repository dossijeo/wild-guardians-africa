// Two bounds: time since the last acknowledged replay item, and total time.
export function createRecoveryProgressWatchdog({idleMs=120000,totalMs=600000,onTimeout,schedule=setTimeout,cancel=clearTimeout}={}){
 if(!Number.isFinite(idleMs)||idleMs<=0||!Number.isFinite(totalMs)||totalMs<idleMs||typeof onTimeout!=='function'||typeof schedule!=='function'||typeof cancel!=='function')throw TypeError('Invalid recovery watchdog');
 let closed=false,idle=null,total=null;function dispose(){if(closed)return;closed=true;if(idle!==null)cancel(idle);if(total!==null)cancel(total);idle=total=null;}function fail(reason){if(closed)return;dispose();onTimeout(reason);}function progress(){if(closed)return false;if(idle!==null)cancel(idle);idle=schedule(()=>fail('idle'),idleMs);return true;}total=schedule(()=>fail('total'),totalMs);progress();return {progress,dispose};
}
