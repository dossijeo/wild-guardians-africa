import {LOCOMOTION as L} from './locomotion-calibration.js';
import {BALANCE as B} from './balance.js';
import {PROFILES,contractExpired} from './workforce.js';
import {waitForGate} from './gates.js';
// User gameplay revision: travel +50%; walking/carrying cadence +50%,
// running cadence retains the original animation clock.
export const WORKER_SPEED_MULTIPLIER=1.5;
export const dailyRunMetres=()=>L.longTripMetres*B.workers.daily_run_distance_long_trips;
export function urgentWork(state,worker){
  const active=state.workers.filter(w=>w.centerId===worker.centerId&&!w.incapacitated&&!contractExpired(w,state)&&
    !['home','returning','fleeing','incapacitated'].includes(w.status)&&state.time<PROFILES.find(p=>p.id===w.profile).end);
  return active.length>0&&state.tasks.filter(t=>t.centerId===worker.centerId).length/active.length>B.workers.run_start_pending_tasks_per_worker_over;
}
export function movePath(actor,metres,clear=null){
  let left=metres;
  while(actor.path.length&&left>0){
    const point=actor.path[0],distance=Math.hypot(actor.x-point.x,actor.z-point.z);
    const amount=Math.min(distance,left),end=distance?{x:actor.x+(point.x-actor.x)*amount/distance,z:actor.z+(point.z-actor.z)*amount/distance}:point;
    if(clear&&!clear(actor,end))break;
    if(distance<=left){actor.x=point.x;actor.z=point.z;left-=distance;actor.path.shift();}
    else{actor.x+=(point.x-actor.x)*left/distance;actor.z+=(point.z-actor.z)*left/distance;left=0;}
  }
  return metres-left;
}
export function movePathWithGates(actor,metres,gates=[],clear=null){
  const leaves=gates.filter(g=>g.gate&&g.status!=='ruined');if(!leaves.length)return movePath(actor,metres,clear);
  let travelled=0;
  while(actor.path.length&&metres-travelled>1e-9){
    if(waitForGate(actor,leaves))break;
    const step=movePath(actor,Math.min(.1,metres-travelled),clear);travelled+=step;if(!step)break;
  }
  return travelled;
}
export function moveWorker(worker,seconds,{urgent=false,flight=false,slow=false,carrying=false,gates=[],clear=null}={}){
  if(waitForGate(worker,gates))return false;
  let left=seconds,runDistance=0,walkDistance=0;
  const canRun=!carrying&&(flight||urgent&&!worker.recovering&&!worker.incapacitated&&(worker.runRemaining??0)>0);
  if(canRun){
    const speed=L.runMetresPerSecond*WORKER_SPEED_MULTIPLIER*(slow?.35:1);
    const requested=flight?speed*left:Math.min(speed*left,worker.runRemaining);
    runDistance=movePathWithGates(worker,requested,gates,clear);left-=runDistance/speed;
    if(!flight)worker.runRemaining=Math.max(0,worker.runRemaining-runDistance);
    worker.runPhase=(worker.runPhase??0)+runDistance/(L.runMetresPerSecond*WORKER_SPEED_MULTIPLIER);
  }
  if(left>1e-9&&worker.path.length&&!worker.gateWaiting){
    walkDistance=movePathWithGates(worker,L.walkMetresPerSecond*WORKER_SPEED_MULTIPLIER*left,gates,clear);
    const key=carrying?'carryPhase':'walkPhase';worker[key]=(worker[key]??0)+walkDistance/L.walkMetresPerSecond;
  }
  worker.running=runDistance>0&&walkDistance<1e-9&&!worker.gateWaiting;
  return worker.path.length===0;
}
