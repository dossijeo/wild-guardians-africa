import {PROFILES} from '../simulation/workforce.js';
import {vfxDefinitions,vfxEnvironment} from './vfx-native.js';
const definitions=new Map(vfxDefinitions.map(d=>[d.id,d]));
const durations={water:3.4,harvest:3.6,repair:3.8};

// Presentation reads committed tasks. It never completes work or emits gameplay.
export function workVfxPlans(state){
  const plans=[];let tasks,targets;
  for(const worker of state.workers){
    if(worker.status!=='acting'||worker.incapacitated||worker.fallRemaining>0)continue;
    // No historical crop/task index is needed while workers travel, carry,
    // flee or idle. Keep these local to this call so live edits stay visible.
    tasks??=new Map(state.tasks.map(t=>[t.id,t]));
    const task=tasks.get(worker.taskId);if(!task)continue;
    targets??=new Map([...state.plants,...state.structures].map(e=>[e.id,e]));
    const target=targets.get(task.targetId);if(!target)continue;
    let kind=task.kind,id,elapsed,duration;
    const speed=PROFILES.find(p=>p.id===worker.profile)?.speed??1;
    if(kind==='initial'){
      const progress=Math.max(0,7.2-worker.actionRemaining*speed);
      if(progress<3.8){id='dig';elapsed=progress;duration=3.8;kind='plant';}
      else {id='water';elapsed=progress-3.8;duration=3.4;kind='water';}
    }else{
      id={water:'water',harvest:'harvest',repair:'dig'}[kind];duration=durations[kind];if(!id)continue;
      elapsed=Math.max(0,duration-worker.actionRemaining*speed);
    }
    const definition=definitions.get(id);
    plans.push({workerId:worker.id,key:`${worker.id}/${task.id}/${kind}`,id,x:target.x,z:target.z,yaw:worker.heading??0,time:Math.min(definition.duration,elapsed/duration*definition.duration)});
  }
  // Repairs settle on arrival, without an acting phase. Present the committed
  // result at its service point; old saves without presentation do not replay it.
  const seen=new Set();
  for(const event of state.events??[]){
    const p=event.presentation;
    if(event.type!=='RepairApplied'||typeof event.id!=='string'||seen.has(event.id)||!p||![p.elapsed,p.x,p.z,p.yaw,state.elapsed].every(Number.isFinite))continue;
    seen.add(event.id);const age=state.elapsed-p.elapsed;
    if(age<0||age>=definitions.get('dust').duration)continue;
    plans.push({key:`repair/${event.id}`,id:'dust',x:p.x,z:p.z,yaw:p.yaw,time:Math.max(1e-6,age),stepMode:true});
  }
  return plans;
}

export class WorkVfx {
  constructor(library,pipeline,scene,surface,waterSource=null){this.waterSource=waterSource;this.library=library;this.pipeline=pipeline;this.scene=scene;this.surface=surface;this.effects=new Map();}
  update(state){
    const desired=new Set(),environment=vfxEnvironment(state.time>=300?1:0);
    for(const plan of workVfxPlans(state)){
      desired.add(plan.key);let effect=this.effects.get(plan.key);
      if(!effect){effect=this.library.create(plan.id,this.pipeline,{worldSurface:this.surface,...(plan.id==='water'&&this.waterSource?{waterSource:time=>this.waterSource(plan.workerId,time,effect)}:{}),...(plan.stepMode?{stepMode:true}:{})});this.effects.set(plan.key,effect);this.scene.add(effect);}
      effect.position.set(plan.x,this.surface(plan.x,plan.z),plan.z);effect.rotation.y=plan.yaw;effect.environment=environment;
      if(plan.time<effect.native.time||effect.native.time===0)effect.seek(plan.time);else effect.advance(plan.time-effect.native.time);
    }
    for(const [key,effect] of this.effects)if(!desired.has(key)){effect.dispose();this.effects.delete(key);}
  }
  prepare(camera){let depth=false;for(const effect of this.effects.values())depth=effect.prepare(camera,this.scene)||depth;return depth;}
  dispose(){for(const effect of this.effects.values())effect.dispose();this.effects.clear();}
}
