import {contractExpired} from './workforce.js';
import {cancelIdle} from './idle.js';

export function enqueue(state,centerId,kind,targetId) {
  if(!centerId || state.tasks.some(t=>t.kind===kind&&t.targetId===targetId))return null;
  return appendTask(state,centerId,kind,targetId);
}
function appendTask(state,centerId,kind,targetId) {
  const t={id:`task-${state.nextId++}`,created:state.sequence++,centerId,kind,targetId,workerId:null,blocked:false};
  state.tasks.push(t);return t;
}
// Local to one synchronous append-only crop pass. Never retained across ticks,
// worker completions, queue reconstruction, attacks or restored snapshots.
export function taskEnqueuer(state) {
  let targets=null;
  return (centerId,kind,targetId)=>{
    if(!centerId)return null;
    if(!targets){
      targets=new Map();
      for(const task of state.tasks){
        const ids=targets.get(task.kind)??new Set();ids.add(task.targetId);targets.set(task.kind,ids);
      }
    }
    const ids=targets.get(kind)??new Set();
    if(ids.has(targetId))return null;
    ids.add(targetId);targets.set(kind,ids);
    return appendTask(state,centerId,kind,targetId);
  };
}
export function reserveTasks(state,canExecute=()=>true) {
  if(!state.workers.some(w=>w.status==='idle'&&!w.taskId&&!w.incapacitated&&!contractExpired(w,state))) {
    // Busy workers cannot reserve. Preserve the existing missing-target rule,
    // while clearing stale blocked flags exactly as an empty candidate list did.
    const blocked=state.tasks.filter(t=>!t.workerId&&t.blocked);
    if(!blocked.length)return;
    const missing=new Set(blocked.map(t=>t.targetId));
    for(const group of [state.plants,state.crates,state.structures]){
      if(!missing.size)break;
      for(const entity of group){missing.delete(entity.id);if(!missing.size)break;}
    }
    for(const t of blocked)if(!missing.has(t.targetId))t.blocked=false;
    return;
  }
  // Resolve pending targets once. Historical crops/crates remain in the save,
  // but must not be copied and searched separately for every queued task.
  const needed=new Set(state.tasks.filter(t=>!t.workerId).map(t=>t.targetId)),targets=new Map();
  for(const group of [state.plants,state.crates,state.structures]) {
    if(!needed.size)break;
    for(const entity of group) {
      if(needed.delete(entity.id))targets.set(entity.id,entity);
      if(!needed.size)break;
    }
  }
  // Eligibility is stable during this synchronous reservation pass. Keep one
  // live candidate list per center and remove each employee when assigned,
  // rather than filtering all employees again for every queued target.
  const available=new Map();
  for(const w of state.workers)if(w.status==='idle'&&!w.taskId&&!w.incapacitated&&!contractExpired(w,state)){
    const workers=available.get(w.centerId)??[];workers.push(w);available.set(w.centerId,workers);
  }
  for(const t of [...state.tasks].sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id))) {
    if(t.workerId)continue;
    const target=targets.get(t.targetId);
    if(!target)continue;
    const workers=available.get(t.centerId)??[];
    // Reachability can require A*: test nearest candidates until one succeeds.
    // The pure predicate and ordering retain the nearest eligible worker.
    // Most tasks are reachable by the nearest employee. Find that candidate
    // in one pass; sort only when its route actually fails. The fallback keeps
    // the same distance/id order and never queries the first candidate twice.
    let worker;
    if(workers.length<8){
      workers.sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)||a.id.localeCompare(b.id));
      worker=workers.find(w=>canExecute(w,t,target));
    }else{
      const distances=new Map();
      let nearest=workers[0],nearestDistance=Math.hypot(nearest.x-target.x,nearest.z-target.z);
      distances.set(nearest,nearestDistance);
      for(let i=1;i<workers.length;i++){
        const candidate=workers[i],distance=Math.hypot(candidate.x-target.x,candidate.z-target.z);
        distances.set(candidate,distance);
        if((distance-nearestDistance||candidate.id.localeCompare(nearest.id))<0){nearest=candidate;nearestDistance=distance;}
      }
      worker=canExecute(nearest,t,target)?nearest:null;
      if(!worker){
        workers.sort((a,b)=>distances.get(a)-distances.get(b)||a.id.localeCompare(b.id));
        worker=workers.find(w=>w!==nearest&&canExecute(w,t,target));
      }
    }
    t.blocked=!worker && workers.length>0;
    if(worker) { cancelIdle(worker);t.workerId=worker.id;worker.taskId=t.id;worker.status='walking';workers.splice(workers.indexOf(worker),1); }
  }
}
export function releaseTask(state,worker) {
  const t=state.tasks.find(t=>t.id===worker.taskId);
  if(t)t.workerId=null;
  worker.taskId=null;
  worker.taskApproach=null;
}
