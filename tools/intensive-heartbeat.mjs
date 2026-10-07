import {performance} from 'node:perf_hooks';

// Offline observability only. Sampling reads no simulation RNG, issues no
// commands and retains no live entity references. A busy synchronous search
// cannot publish a heartbeat until its next onTick callback returns.
export function createIntensiveHeartbeat({intervalMs=30000,now=()=>performance.now()}={}){
 if(!Number.isFinite(intervalMs)||intervalMs<=0)throw Error('Heartbeat interval must be positive and finite');
 const started=now();let next=started,sequence=0;
 const counts=rows=>{const result=new Map();for(const row of rows)result.set(row.status,(result.get(row.status)??0)+1);return Object.fromEntries(result);};
 return state=>{
  const wall=now();if(wall<next)return null;
  next=wall+intervalMs;
  let pending=0,reserved=0,blocked=0;
  for(const task of state.tasks){if(task.workerId)reserved++;else pending++;if(task.blocked)blocked++;}
  return {sequence:++sequence,observedWallMs:wall-started,day:state.day,time:state.time,elapsed:state.elapsed,completedNights:state.completedNights,result:state.result,
   pauses:[...state.pauses],livingPlants:state.plants.reduce((n,p)=>n+Number(p.alive),0),undeliveredCrates:state.crates.reduce((n,c)=>n+Number(!c.delivered),0),
   workers:{total:state.workers.length,statuses:counts(state.workers)},tasks:{total:state.tasks.length,pending,reserved,blocked},
   raid:state.raid?{total:state.raid.animals.length,statuses:counts(state.raid.animals),animals:state.raid.animals.slice(0,32).map(a=>({id:a.id,species:a.species,status:a.status,x:a.x,z:a.z,hitsRemaining:a.hitsRemaining,targetId:a.targetId,pathPoints:a.path?.length??null})),animalsTruncated:state.raid.animals.length>32}:null};
 };
}
