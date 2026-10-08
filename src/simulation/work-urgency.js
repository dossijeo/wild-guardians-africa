import {BALANCE} from './balance.js';
import {PROFILES,contractExpired} from './workforce.js';

const eligible=(w,s)=>!w.incapacitated&&!contractExpired(w,s)&&w.status!=='home'&&w.status!=='returning'&&w.status!=='fleeing'&&w.status!=='incapacitated'&&s.time<PROFILES.find(p=>p.id===w.profile).end;

// Local to one synchronous worker pass. Call changed after processing each
// employee, including early returns, so later employees see departures live.
// Task completion replaces/shrinks its array; reservations only change fields.
export function createUrgencyPass(state){
 let workers=state.workers,length=workers.length,time=state.time,day=state.day,counts=new Map(),members=new Map(),tasks=null,taskLength=-1,pending=null;
 function validate(){
  if(workers!==state.workers||length!==state.workers.length||time!==state.time||day!==state.day){workers=state.workers;length=workers.length;time=state.time;day=state.day;counts=new Map();members=new Map();}
 }
 return {
  invalidate(){counts=new Map();members=new Map();},
  urgent(worker){
   validate();const center=worker.centerId;
   if(!counts.has(center)){
    let active=0;for(const w of workers)if(w.centerId===center){const valid=eligible(w,state);members.set(w,{center,valid});if(valid)active++;}counts.set(center,active);
   }
   const active=counts.get(center);if(!active)return false;
   if(tasks!==state.tasks||taskLength!==state.tasks.length){tasks=state.tasks;taskLength=tasks.length;pending=new Map();for(const task of tasks)pending.set(task.centerId,(pending.get(task.centerId)??0)+1);}
   return (pending.get(center)??0)/active>BALANCE.workers.run_start_pending_tasks_per_worker_over;
  },
  changed(worker){
   if(!counts.size)return;
   validate();const before=members.get(worker);
   if(before?.valid)counts.set(before.center,counts.get(before.center)-1);
   members.delete(worker);
   if(counts.has(worker.centerId)){const valid=eligible(worker,state);members.set(worker,{center:worker.centerId,valid});if(valid)counts.set(worker.centerId,counts.get(worker.centerId)+1);}
  }
 };
}
