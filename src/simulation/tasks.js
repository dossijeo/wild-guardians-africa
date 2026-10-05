import {contractExpired} from './workforce.js';
import {cancelIdle} from './idle.js';

export function enqueue(state,centerId,kind,targetId) {
  if(!centerId || state.tasks.some(t=>t.kind===kind&&t.targetId===targetId))return null;
  const t={id:`task-${state.nextId++}`,created:state.sequence++,centerId,kind,targetId,workerId:null,blocked:false};
  state.tasks.push(t);return t;
}
export function reserveTasks(state,canExecute=()=>true) {
  if(!state.workers.some(w=>w.status==='idle'&&!w.taskId&&!w.incapacitated&&!contractExpired(w,state))) {
    // Busy workers cannot reserve. Preserve the existing missing-target rule,
    // while clearing stale blocked flags exactly as an empty candidate list did.
    for(const t of state.tasks)if(!t.workerId&&t.blocked&&(
      state.plants.some(e=>e.id===t.targetId)||state.crates.some(e=>e.id===t.targetId)||state.structures.some(e=>e.id===t.targetId)
    ))t.blocked=false;
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
  for(const t of [...state.tasks].sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id))) {
    if(t.workerId)continue;
    const target=targets.get(t.targetId);
    if(!target)continue;
    const workers=state.workers.filter(w=>w.centerId===t.centerId&&w.status==='idle'&&!w.taskId&&!w.incapacitated&&!contractExpired(w,state));
    // Reachability can require A*: test nearest candidates until one succeeds.
    // The pure predicate and ordering retain the nearest eligible worker.
    workers.sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)||a.id.localeCompare(b.id));
    const worker=workers.find(w=>canExecute(w,t,target));
    t.blocked=!worker && workers.length>0;
    if(worker) { cancelIdle(worker);t.workerId=worker.id;worker.taskId=t.id;worker.status='walking'; }
  }
}
export function releaseTask(state,worker) {
  const t=state.tasks.find(t=>t.id===worker.taskId);
  if(t)t.workerId=null;
  worker.taskId=null;
  worker.taskApproach=null;
}
