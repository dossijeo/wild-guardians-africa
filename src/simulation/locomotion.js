import {LOCOMOTION as L} from './locomotion-calibration.js';
import {BALANCE as B} from './balance.js';
import {PROFILES} from './workforce.js';
export const dailyRunMetres=()=>L.longTripMetres*B.workers.daily_run_distance_long_trips;
export function urgentWork(state,worker){
  const active=state.workers.filter(w=>w.centerId===worker.centerId&&!w.incapacitated&&
    !['home','returning','fleeing','incapacitated'].includes(w.status)&&state.time<PROFILES.find(p=>p.id===w.profile).end);
  return active.length>0&&state.tasks.filter(t=>t.centerId===worker.centerId).length/active.length>B.workers.run_start_pending_tasks_per_worker_over;
}
export function movePath(actor,metres){
  let left=metres;
  while(actor.path.length&&left>0){
    const point=actor.path[0],distance=Math.hypot(actor.x-point.x,actor.z-point.z);
    if(distance<=left){actor.x=point.x;actor.z=point.z;left-=distance;actor.path.shift();}
    else{actor.x+=(point.x-actor.x)*left/distance;actor.z+=(point.z-actor.z)*left/distance;left=0;}
  }
  return metres-left;
}
export function moveWorker(worker,seconds,{urgent=false,flight=false,slow=false,carrying=false}={}){
  let left=seconds,runDistance=0,walkDistance=0;
  const canRun=!carrying&&(flight||urgent&&!worker.recovering&&!worker.incapacitated&&(worker.runRemaining??0)>0);
  if(canRun){
    const speed=L.runMetresPerSecond*(slow?.35:1);
    const requested=flight?speed*left:Math.min(speed*left,worker.runRemaining);
    runDistance=movePath(worker,requested);left-=runDistance/speed;
    if(!flight)worker.runRemaining=Math.max(0,worker.runRemaining-runDistance);
    worker.runPhase=(worker.runPhase??0)+runDistance/L.runMetresPerSecond;
  }
  if(left>1e-9&&worker.path.length){
    walkDistance=movePath(worker,L.walkMetresPerSecond*left);
    const key=carrying?'carryPhase':'walkPhase';worker[key]=(worker[key]??0)+walkDistance/L.walkMetresPerSecond;
  }
  worker.running=runDistance>0&&walkDistance<1e-9;
  return worker.path.length===0;
}
