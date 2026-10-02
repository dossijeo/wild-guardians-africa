import {PROFILES} from '../simulation/workforce.js';
import {LoopRepeat,LoopOnce,Box3,Vector3} from 'three';
export function nativeCrate(gltf){
  const original=gltf.scene.getObjectByName('Prop_FruitCrate');
  if(!original)throw new Error('Falta la caja original de transporte');
  const crate=original.clone();crate.scale.setScalar(1);crate.position.set(0,0,0);crate.rotation.set(0,0,0);crate.updateMatrixWorld(true);
  const box=new Box3().setFromObject(crate),center=box.getCenter(new Vector3());
  crate.position.set(-center.x,-box.min.y,-center.z);return crate;
}
export function applyWorkerPose(data,worker,task,elapsed,library){
  const pose=workerPose(worker,task,elapsed,library),clip=data.clips.find(c=>c.name===pose.name);
  if(!clip)throw new Error(`Falta la acción original ${pose.name} de ${worker.profile}`);
  if(data.name!==pose.name){data.action?.stop();data.action=data.mixer.clipAction(clip);data.action.reset().setLoop(pose.loop?LoopRepeat:LoopOnce,pose.loop?Infinity:1).play();data.action.paused=true;data.action.clampWhenFinished=true;data.name=pose.name;}
  data.action.time=pose.time;data.mixer.update(0);
  return pose;
}
export function workerPose(worker,task,elapsed,library) {
  const speed=PROFILES.find(p=>p.id===worker.profile)?.speed??1;
  let name='Idle',time=elapsed;
  if(['idle','waiting'].includes(worker.status)&&worker.idleState){
    name={rest:'Idle',watch:'Alert',walk:'Walk_Skip'}[worker.idleState.mode]??'Idle';
    time=worker.idleState.mode==='walk'?(worker.walkPhase??0):worker.idleState.elapsed;
  }
  if(worker.fallRemaining>0&&!worker.incapacitated){name='Fall';time=Math.max(0,library.actions.Fall.duration-worker.fallRemaining);}
  else if(worker.status==='fleeing'||worker.incapacitated&&worker.status!=='home'){name='Run';time=worker.runPhase??elapsed*(worker.incapacitated?.35:1);}
  else if(worker.status==='carrying'){name='Carry_Crate';time=worker.carryPhase??elapsed;}
  else if(['walking','arriving','returning'].includes(worker.status)){
    name=worker.running?'Run':'Walk_Skip';time=worker.running?(worker.runPhase??elapsed):(worker.walkPhase??elapsed);
  }
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
  if(worker.gateWaiting&&!worker.incapacitated&&!worker.fallRemaining){name=worker.status==='carrying'?'Carry_Crate':'Idle';time=worker.status==='carrying'?(worker.carryPhase??0):elapsed;}
  const spec=library.actions[name];
  return {name,time:spec.loop?time%spec.duration:Math.min(time,spec.duration),loop:spec.loop};
}
