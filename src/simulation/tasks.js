import {contractExpired} from './workforce.js';
import {cancelIdle} from './idle.js';

const planningRevisions=new WeakMap();
const taskObservers=new WeakMap();
const changed=state=>planningRevisions.set(state,(planningRevisions.get(state)??0)+1);
export const taskPlanningRevision=state=>planningRevisions.get(state)??0;
export function observeTaskChanges(state,callback){
  if(typeof callback!=='function')throw new TypeError('Expected a task-change listener');
  let listeners=taskObservers.get(state);
  if(!listeners){listeners=new Set();taskObservers.set(state,listeners);}
  listeners.add(callback);
  return ()=>listeners.delete(callback);
}
function workerSnapshot(worker){
  return {id:worker.id,centerId:worker.centerId,x:worker.x,z:worker.z,
    status:worker.status,taskId:worker.taskId,
    incapacitated:worker.incapacitated,contractDay:worker.contractDay,
    profile:worker.profile};
}
export function notifyWorkerPlanningChange(state,worker){
  const listeners=taskObservers.get(state);
  if(!listeners?.size)return;
  const event={type:'worker',worker:workerSnapshot(worker)};
  for(const callback of listeners)callback(event);
}
export function notifyWorkerPlanningRemoval(state,workerId){
  const listeners=taskObservers.get(state);
  if(!listeners?.size)return;
  const event={type:'worker-removed',workerId};
  for(const callback of listeners)callback(event);
}
export function notifyWorkerPlanningRoster(state,previous,current){
  if(!taskObservers.get(state)?.size)return;
  const retained=new Set(current.map(worker=>worker.id));
  for(const worker of previous)
    if(!retained.has(worker.id))notifyWorkerPlanningRemoval(state,worker.id);
}
function taskChange(state,type,task,worker=null){
  const listeners=taskObservers.get(state);
  if(!listeners?.size)return;
  const event={type,taskId:task.id,centerId:task.centerId,
    targetId:task.targetId,kind:task.kind,created:task.created,
    workerId:task.workerId??null,
    worker:worker?workerSnapshot(worker):null};
  for(const callback of listeners)callback(event);
}
export function replaceTasks(state,next){
  const listening=taskObservers.get(state)?.size;
  const retained=listening?new Set(next.map(task=>task.id)):null;
  const removed=listening?state.tasks.filter(task=>!retained.has(task.id)):[];
  state.tasks=next;
  for(const task of removed)taskChange(state,'removed',task);
  return next;
}

export function enqueue(state,centerId,kind,targetId) {
  if(!centerId || state.tasks.some(t=>t.kind===kind&&t.targetId===targetId))return null;
  return appendTask(state,centerId,kind,targetId);
}
function appendTask(state,centerId,kind,targetId) {
  const t={id:`task-${state.nextId++}`,created:state.sequence++,centerId,kind,targetId,workerId:null,blocked:false};
  state.tasks.push(t);changed(state);taskChange(state,'created',t);return t;
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
export function reserveTasks(state,canExecute=()=>true,onAssigned=()=>{}) {
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
    // A pending native graph query is not a physical proof that this task is
    // blocked. Retry on a later reservation pass as sectors become resident.
    let pending=false;
    const plans=new Map();
    const reachable=w=>{
      const result=canExecute(w,t,target);
      if(result===null)pending=true;
      if(result)plans.set(w,result);
      return Boolean(result);
    };
    // Reachability can require A*: test nearest candidates until one succeeds.
    // The pure predicate and ordering retain the nearest eligible worker.
    // Most tasks are reachable by the nearest employee. Find that candidate
    // in one pass; sort only when its route actually fails. The fallback keeps
    // the same distance/id order and never queries the first candidate twice.
    let worker;
    if(workers.length<8){
      workers.sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)||a.id.localeCompare(b.id));
      worker=workers.find(reachable);
    }else{
      const distances=new Map();
      let nearest=workers[0],nearestDistance=Math.hypot(nearest.x-target.x,nearest.z-target.z);
      distances.set(nearest,nearestDistance);
      for(let i=1;i<workers.length;i++){
        const candidate=workers[i],distance=Math.hypot(candidate.x-target.x,candidate.z-target.z);
        distances.set(candidate,distance);
        if((distance-nearestDistance||candidate.id.localeCompare(nearest.id))<0){nearest=candidate;nearestDistance=distance;}
      }
      worker=reachable(nearest)?nearest:null;
      if(!worker){
        workers.sort((a,b)=>distances.get(a)-distances.get(b)||a.id.localeCompare(b.id));
        worker=workers.find(w=>w!==nearest&&reachable(w));
      }
    }
    t.blocked=!worker && workers.length>0 && !pending;
    if(worker) { cancelIdle(worker);t.workerId=worker.id;worker.taskId=t.id;worker.status='walking';workers.splice(workers.indexOf(worker),1);changed(state);taskChange(state,'assigned',t,worker);onAssigned(worker,t,target,plans.get(worker)); }
  }
}
// Apply one already validated native global proposal. The caller must commit
// the corresponding native lease first; this function never selects targets or
// computes routes. Check the entire batch before changing any JS assignment.
export function applyConfirmedTaskAssignments(state,assignments,navVersion,
  {validateOnly=false}={}){
  if(!Number.isFinite(navVersion))throw TypeError('Expected a navigation revision');
  const tasks=new Map(state.tasks.map(task=>[task.id,task]));
  const workers=new Map(state.workers.map(worker=>[worker.id,worker]));
  const usedTasks=new Set(),usedWorkers=new Set();
  for(const assignment of assignments){
    const {taskId,workerId,path,destination}=assignment;
    const task=tasks.get(taskId),worker=workers.get(workerId);
    if(!task||!worker||usedTasks.has(taskId)||usedWorkers.has(workerId)||
      task.workerId||worker.taskId||worker.status!=='idle'||
      worker.incapacitated||contractExpired(worker,state)||
      worker.centerId!==task.centerId||!Array.isArray(path)||!path.length||
      path.some(point=>!Number.isFinite(point.x)||!Number.isFinite(point.z))||
      !destination||typeof destination.id!=='string'||
      !Number.isFinite(destination.x)||!Number.isFinite(destination.z))
      throw Error('Stale or invalid native task assignment');
    usedTasks.add(taskId);usedWorkers.add(workerId);
  }
  if(validateOnly)return assignments.length;
  for(const {taskId,workerId,path,destination} of assignments){
    const task=tasks.get(taskId),worker=workers.get(workerId);
    cancelIdle(worker);
    task.workerId=worker.id;task.blocked=false;
    worker.taskId=task.id;worker.status='walking';worker.path=path;
    worker.destinationId=destination.id;worker.pathVersion=navVersion;
    if(['repair','initial','water'].includes(task.kind))
      worker.taskApproach={taskId:task.id,destination};
    else worker.taskApproach=null;
    changed(state);
  }
  for(const {taskId,workerId} of assignments)
    taskChange(state,'assigned',tasks.get(taskId),workers.get(workerId));
  return assignments.length;
}
export function releaseTask(state,worker) {
  const t=state.tasks.find(t=>t.id===worker.taskId);
  worker.taskId=null;
  worker.taskApproach=null;
  if(t){t.workerId=null;changed(state);taskChange(state,'released',t,worker);}
}
