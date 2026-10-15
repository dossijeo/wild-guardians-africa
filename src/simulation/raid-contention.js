import {activeCrops} from './active-crops.js';
export const RAID_WAIT_SECONDS=90;
export function liveWaitQueue(raid){
 raid.waitQueue??=[];
 if(!raid.waitQueue.length)return raid.waitQueue;
 const valid=new Set(raid.animals.filter(a=>a.status==='waiting'&&a.raidWait).map(a=>a.id));
 raid.waitQueue=raid.waitQueue.filter(id=>valid.has(id));
 return raid.waitQueue;
}
export function occupiedEligibleGroup(state,animal,eligible){
 // A failed static search alone is not temporary contention. At least one
 // live target or approach must actually be occupied by another actor.
 const targets=new Set(activeCrops(state.plants).filter(eligible).map(p=>p.id));
 for(const t of state.structures)if(t.status==='intact'&&t.hp>0)targets.add(t.id);
 return state.raid.animals.some(a=>a!==animal&&!['gone','retreating','waiting'].includes(a.status)&&targets.has(a.targetId));
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
export function waitEpoch(state,nav,animal){
  // Lease revision and actual hit progress are constant-time signals. Native
  // topology and sector-residency changes wake a waiting actor immediately.
  // Other dynamic eligibility changes use a slow recovery retry.
  const sectors=nav.spatialSectorRevision?.(animal?.radius)??0;
 return `${nav.version},${sectors},${state.raid.waitRevision??0},${state.raid.waitProgress?.at??0}`;
}
