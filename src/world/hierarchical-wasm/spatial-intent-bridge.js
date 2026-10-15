import {centerGeometry} from '../centers.js';
import {contractExpired,PROFILES} from '../../simulation/workforce.js';

// Experimental event-fed bridge. Gameplay does not call it yet: it is used to
// prove the native read model can be rebuilt after load and changed by deltas.
const width=10,maxBatch=4096;
const profileEnd=new Map(PROFILES.map(profile=>[profile.id,profile.end]));
const numericId=id=>{
  const match=/-(\d+)$/.exec(id??'');
  if(!match||!Number.isSafeInteger(Number(match[1]))||Number(match[1])<1)
    throw TypeError(`Unsupported native intent ID: ${id}`);
  return Number(match[1]);
};
const lexicalRank=id=>Number(`0.${/-(\d+)$/.exec(id)[1]}`);
const workerRow=(worker,state)=>[1,1,numericId(worker.id),
  numericId(worker.centerId),worker.x,worker.z,
  worker.status==='idle'&&!worker.taskId&&!worker.incapacitated&&
    !contractExpired(worker,state)&&state.time<(profileEnd.get(worker.profile)??0)?1:0,
  0,0,lexicalRank(worker.id)];
const targetRow=(entity,state)=>{
  if('alive' in entity)return [1,2,numericId(entity.id),
    entity.species==='platano'?2:1,entity.x,entity.z,entity.alive?1:0,0,0,0];
  if(entity.kind==='wall'){
    const scale=entity.gate?(entity.material==='reforzado'?1.6:
      ['adobe','piedra'].includes(entity.material)?1.4:1):1;
    return [1,2,numericId(entity.id),3,entity.x,entity.z,1,0,entity.yaw??0,scale];
  }
  if(entity.kind==='center')return [1,2,numericId(entity.id),4,
    entity.x,entity.z,1,0,entity.yaw??0,centerGeometry(entity,state).radius];
  return [1,2,numericId(entity.id),0,entity.x,entity.z,
    entity.delivered?0:1,0,0,0];
};
const taskRow=task=>[1,3,numericId(task.id),numericId(task.centerId),
  task.kind==='initial'||task.kind==='water'?1:task.kind==='repair'?2:0,
  0,task.workerId?numericId(task.workerId):0,numericId(task.targetId),
  task.created,lexicalRank(task.id)];

export function createSpatialIntentBridge(session){
  const wasm=session?.core?.wasm;
  for(const name of ['nav_intent_reset','nav_intent_changes_ptr',
    'nav_intent_apply_changes','nav_intent_plan_tasks','nav_intent_results_ptr',
    'nav_intent_discard','nav_intent_commit'])
    if(typeof wasm?.[name]!=='function')throw TypeError(`Missing ${name}`);
  let sequence=0,initialized=false;
  const apply=rows=>{
    if(!initialized)throw Error('Reset the native intent session first');
    for(let offset=0;offset<rows.length;offset+=maxBatch){
      const batch=rows.slice(offset,offset+maxBatch),ptr=wasm.nav_intent_changes_ptr(batch.length);
      if(!ptr)throw Error('Native intent change allocation failed');
      new Float64Array(wasm.memory.buffer,ptr,batch.length*width).set(batch.flat());
      if(wasm.nav_intent_apply_changes(sequence+1,batch.length)!==1)
        throw Error('Native intent delta was rejected; rebuild from a saved state');
      sequence++;
    }
    return sequence;
  };
  const resetFromState=state=>{
    wasm.nav_intent_reset();sequence=0;initialized=true;
    try{
      const workers=[...state.workers].sort((a,b)=>a.id.localeCompare(b.id));
      const tasks=[...state.tasks].sort((a,b)=>
        a.created-b.created||a.id.localeCompare(b.id));
      const rows=[...workers.map(worker=>workerRow(worker,state)),
        ...state.plants.filter(plant=>plant.alive).map(plant=>targetRow(plant,state)),
        ...state.crates.filter(crate=>!crate.delivered).map(crate=>targetRow(crate,state)),
        ...state.structures.map(structure=>targetRow(structure,state)),
        ...tasks.map(task=>taskRow(task))];
      apply(rows);
    }
    catch(error){
      wasm.nav_intent_reset();sequence=0;initialized=false;
      throw error;
    }
    return {sequence,workers:wasm.nav_intent_worker_count(),
      targets:wasm.nav_intent_target_count(),tasks:wasm.nav_intent_task_count()};
  };
  // Call only for committed game events, not every tick or actor position.
  // A moving worker needs an update when a new action is requested.
  const applyEvents=(state,events)=>{
    const rows=[];
    for(const event of events){
      if(event.type==='worker')rows.push(event.remove?
        [0,1,numericId(event.id),0,0,0,0,0,0,0]:
        workerRow(event.entity,state));
      else if(event.type==='target')rows.push(event.remove?
        [0,2,numericId(event.id),0,0,0,0,0,0,0]:
        targetRow(event.entity,state));
      else if(event.type==='task')rows.push(event.remove?
        [0,3,numericId(event.id),0,0,0,0,0,0,0]:
        taskRow(event.entity));
      else throw TypeError(`Unsupported intent event: ${event.type}`);
    }
    try{return apply(rows);}
    catch(error){
      // A multi-batch event may have partially reached WASM. JS remains the
      // authority, so rebuild the derived read model before surfacing failure.
      resetFromState(state);
      throw error;
    }
  };
  const planTasks=()=>{
    if(!initialized)throw Error('Reset the native intent session first');
    session.actorSectorRevision({worker:true});
    const count=wasm.nav_intent_plan_tasks();
    if(count<0)throw Error(`Native intent planning failed: ${count}`);
    const pointer=wasm.nav_intent_results_ptr();
    const data=Array.from(new Float64Array(wasm.memory.buffer,pointer,count*8));
    return Array.from({length:count},(_,index)=>{
      const at=index*8;
      return {taskId:data[at],workerId:data[at+1]||null,status:data[at+2],
        routeOffset:data[at+3],routeCount:data[at+4],cause:data[at+5],
        approach:{x:data[at+6],z:data[at+7]}};
    });
  };
  return {resetFromState,applyEvents,planTasks,
    discard:()=>wasm.nav_intent_discard(),
    commit:()=>wasm.nav_intent_commit(),
    sequence:()=>sequence};
}

// Experimental action-level gate for the global worker task queue. Callers
// deliver committed deltas at action boundaries; ordinary movement never
// invokes the native planner. A pending physical result gets one bounded
// recovery retry in case a dynamic obstruction produced no reliable event.
export function createEventDrivenTaskPlanner(session,{retrySeconds=8}={}){
  if(!Number.isFinite(retrySeconds)||retrySeconds<=0)
    throw RangeError('retrySeconds must be positive');
  const bridge=createSpatialIntentBridge(session);
  const eligible=new Set(),requests=new Map();
  let dirty=true,nextRetry=Infinity,lastTime=-Infinity,total=0,initialized=false;
  const setWorker=(worker,state)=>{
    const id=numericId(worker.id);
    if(workerRow(worker,state)[6])eligible.add(id);
    else eligible.delete(id);
  };
  const resetFromState=state=>{
    initialized=false;
    const result=bridge.resetFromState(state);
    eligible.clear();requests.clear();total=0;
    for(const worker of state.workers)setWorker(worker,state);
    dirty=true;nextRetry=Infinity;lastTime=-Infinity;
    initialized=true;
    return result;
  };
  const applyEvents=(state,events)=>{
    let result;
    try{result=bridge.applyEvents(state,events);}
    catch(error){
      // The bridge has rebuilt WASM from authoritative JS state. Rebuild this
      // gate's eligibility view as well, so recovery cannot miss a wakeup.
      eligible.clear();
      for(const worker of state.workers)setWorker(worker,state);
      dirty=true;nextRetry=Infinity;
      throw error;
    }
    for(const event of events)if(event.type==='worker'){
      if(event.remove)eligible.delete(numericId(event.id));
      else setWorker(event.entity,state);
    }
    if(events.length)dirty=true;
    return result;
  };
  const planIfNeeded=simulatedSeconds=>{
    if(!initialized)throw Error('Reset the native intent session first');
    if(!Number.isFinite(simulatedSeconds)||simulatedSeconds<lastTime)
      throw RangeError('Simulation time must be finite and monotonic');
    lastTime=simulatedSeconds;
    if(!dirty&&simulatedSeconds<nextRetry)return null;
    if(!session.core.wasm.nav_intent_task_count()){
      dirty=false;nextRetry=Infinity;return [];
    }
    const result=bridge.planTasks();
    dirty=false;
    nextRetry=result.some(row=>row.status===2||row.status===3)?
      simulatedSeconds+retrySeconds:Infinity;
    total++;
    for(const id of eligible){
      let times=requests.get(id);
      if(!times)requests.set(id,times=[]);
      times.push(simulatedSeconds);
      while(times.length&&times[0]<=simulatedSeconds-60)times.shift();
    }
    return result;
  };
  const metrics=simulatedSeconds=>({nativePlanningCalls:total,
    perWorkerPerMinute:Object.fromEntries([...requests].map(([id,times])=>
      [id,times.filter(time=>time>simulatedSeconds-60).length]))});
  return {resetFromState,applyEvents,planIfNeeded,metrics,
    discard:bridge.discard,commit:bridge.commit,sequence:bridge.sequence};
}
