export function validRaidContention(state){
 const raid=state.raid;if(!raid)return true;
 const queue=raid.waitQueue;
 if(queue!==undefined&&(!Array.isArray(queue)||new Set(queue).size!==queue.length||queue.length>raid.animals.length||queue.some(id=>typeof id!=='string'||!raid.animals.some(a=>a.id===id&&a.status==='waiting'&&a.raidWait))))return false;
 if(raid.waitRevision!==undefined&&(!Number.isSafeInteger(raid.waitRevision)||raid.waitRevision<0||raid.waitRevision>4294967295))return false;
 const progress=raid.waitProgress;
 if(progress!==undefined&&(!progress||!Number.isFinite(progress.at)||progress.at<0||progress.at>state.elapsed||!Number.isSafeInteger(progress.budget)||progress.budget<0||progress.budget!==raid.animals.reduce((n,a)=>n+a.hitsRemaining,0)))return false;
 for(const a of raid.animals){
  const wait=a.raidWait;
  if(a.status==='waiting'&&(!wait||!queue?.includes(a.id)))return false;
  if(wait!==undefined){
   if(a.status!=='waiting'||!wait||!Number.isFinite(wait.since)||wait.since<0||wait.since>state.elapsed||!Number.isFinite(wait.retryAt)||wait.retryAt<wait.since||wait.retryAt>state.elapsed+1.000001||!Number.isFinite(wait.moveRetryAt)||wait.moveRetryAt<wait.since||wait.moveRetryAt>state.elapsed+1.000001||wait.epoch!==null&&(typeof wait.epoch!=='string'||wait.epoch.length>96))return false;
  }
 }
 return true;
}
