import {createCropGrouping} from './crop-components.js';
import {defensiveGroups,reservedGroup} from './defensive-groups.js';
export const RAID_WAIT_SECONDS=90;
export function liveWaitQueue(raid){
 raid.waitQueue??=[];
 if(!raid.waitQueue.length)return raid.waitQueue;
 const valid=new Set(raid.animals.filter(a=>a.status==='waiting'&&a.raidWait).map(a=>a.id));
 raid.waitQueue=raid.waitQueue.filter(id=>valid.has(id));
 return raid.waitQueue;
}
export function occupiedEligibleGroup(state,animal,eligible){
 const grouping=createCropGrouping(state.plants),seen=new Set();
 for(const p of grouping.living)if(!seen.has(p.id)){
  const group=grouping.group(p);group.forEach(p=>seen.add(p.id));const id=group.map(p=>p.id).sort()[0],owner=state.raid.reservations['crop:'+id];
  if(owner&&owner!==animal.id&&group.some(eligible)&&state.raid.animals.some(a=>a.id===owner&&!['gone','retreating','waiting'].includes(a.status)))return true;
 }
 return defensiveGroups(state).some(g=>reservedGroup(state,animal,g)&&state.raid.animals.some(a=>a.id!==animal.id&&!['gone','retreating','waiting'].includes(a.status)&&g.targets.some(t=>t.id===a.targetId)));
}
export function enqueueWait(state,animal){
 animal.status='waiting';animal.raidWait??={since:state.elapsed,retryAt:state.elapsed,moveRetryAt:state.elapsed,epoch:null};
 const queue=liveWaitQueue(state.raid);if(!queue.includes(animal.id))queue.push(animal.id);
 state.raid.waitProgress??={at:state.elapsed,budget:state.raid.animals.reduce((n,a)=>n+a.hitsRemaining,0)};
}
export function leaveWait(raid,animal){delete animal.raidWait;if(raid.waitQueue)raid.waitQueue=raid.waitQueue.filter(id=>id!==animal.id);}
export function observeWaitProgress(state){
 const progress=state.raid.waitProgress;if(!progress)return;
 const budget=state.raid.animals.reduce((n,a)=>n+a.hitsRemaining,0);if(budget<progress.budget)progress.at=state.elapsed;progress.budget=budget;
}
export function waitEpoch(state,nav){
 // Lease revision and actual hit progress are constant-time signals. Native
 // topology changes are immediate; remaining eligibility/Shield changes are
 // retried at most one simulated second later, without scene fingerprints.
 return `${nav.version},${state.raid.waitRevision??0},${state.raid.waitProgress?.at??0}`;
}
