import {contractExpired} from './workforce.js';
import {cancelIdle} from './idle.js';

export function enqueue(state,centerId,kind,targetId) {
  if(!centerId || state.tasks.some(t=>t.kind===kind&&t.targetId===targetId))return null;
  const t={id:`task-${state.nextId++}`,created:state.sequence++,centerId,kind,targetId,workerId:null,blocked:false};
  state.tasks.push(t);return t;
}
export function reserveTasks(state,canExecute=()=>true) {
  for(const t of [...state.tasks].sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id))) {
    if(t.workerId)continue;
    const target=[...state.plants,...state.crates,...state.structures].find(e=>e.id===t.targetId);
    if(!target)continue;
    const workers=state.workers.filter(w=>w.centerId===t.centerId&&w.status==='idle'&&!w.taskId&&!w.incapacitated&&!contractExpired(w,state));
    const eligible=workers.filter(w=>canExecute(w,t,target));
    eligible.sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)||a.id.localeCompare(b.id));
    const worker=eligible[0];
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
