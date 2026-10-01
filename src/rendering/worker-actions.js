import {PROFILES} from '../simulation/workforce.js';
export function workerPose(worker,task,elapsed,library) {
  const speed=PROFILES.find(p=>p.id===worker.profile)?.speed??1;
  let name='Idle',time=elapsed;
  if(worker.fallRemaining>0&&!worker.incapacitated){name='Fall';time=Math.max(0,library.actions.Fall.duration-worker.fallRemaining);}
  else if(worker.status==='fleeing'||worker.incapacitated&&worker.status!=='home'){name='Run';time=elapsed*(worker.incapacitated?.35:1);}
  else if(worker.status==='carrying'){name='Carry_Crate';}
  else if(['walking','arriving','returning'].includes(worker.status)){name='Walk_Skip';}
  else if(worker.status==='acting'&&task){
    if(task.kind==='initial'){
      const progress=Math.max(0,7.2-worker.actionRemaining*speed);
      name=progress<3.8?'Plant':'Water';time=progress<3.8?progress:progress-3.8;
    }else{
      name={water:'Water',harvest:'Harvest',repair:'Dig',crate:'Harvest'}[task.kind]??'Idle';
      const logicalDuration={water:3.4,harvest:3.6,repair:3.8,crate:1}[task.kind]??library.actions[name].duration;
      time=Math.max(0,logicalDuration-worker.actionRemaining*speed)*library.actions[name].duration/logicalDuration;
    }
  }
  const spec=library.actions[name];
  return {name,time:spec.loop?time%spec.duration:Math.min(time,spec.duration),loop:spec.loop};
}
