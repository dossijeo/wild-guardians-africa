import {FOOTSTEPS} from './footsteps-data.js';
import {actorTickState} from '../simulation/worker-actor-tick-states.js';

export function movingPose(actor){
 if(actor.profile){
  if(actor.status==='home'||actor.incapacitated||actor.fallRemaining>0||actor.gateWaiting)return null;
  if(actor.status==='carrying')return {name:'Carry_Crate',phase:actor.carryPhase??0};
  if(actor.status==='fleeing')return {name:'Run',phase:actor.runPhase??0};
  if(['walking','arriving','returning'].includes(actor.status))return actor.running?{name:'Run',phase:actor.runPhase??0}:{name:'Walk_Skip',phase:actor.walkPhase??0};
  if(['idle','waiting'].includes(actor.status)&&actor.idleState?.mode==='walk')return {name:'Walk_Skip',phase:actor.walkPhase??0};
 }else if(['entering','walking','retreating'].includes(actor.status))return {name:actor.status==='walking'?'Walking':'Running',phase:actor.motionPhase??0};
 return null;
}
export function crossedFootsteps(clip,start,end){
 const contacts=[];if(!(end>start))return contacts;
 for(const [index,marker] of clip.contacts.entries()){
  const first=Math.floor((start-marker.time)/clip.duration)+1,last=Math.floor((end-marker.time)/clip.duration);
  for(let cycle=first;cycle<=last;cycle++)contacts.push({...marker,index,cycle,phase:cycle*clip.duration+marker.time});
 }
 return contacts.sort((a,b)=>a.phase-b.phase);
}

// Reuse the exact presentation rule for confirmed samples and future
// interval planning. The caller supplies the already selected visual heading.
export function locomotionStepsBetween(actor,previous,start,end,yaw,result=[]){
 const pose=movingPose(actor),clip=pose&&FOOTSTEPS.sources[actor.profile??actor.species]?.clips[pose.name],dt=end-start;
 if(clip&&previous?.pose?.name===pose.name&&dt>0&&dt<=.25&&Math.hypot(actor.x-previous.x,actor.z-previous.z)>1e-8)for(const step of crossedFootsteps(clip,previous.pose.phase,pose.phase)){
  const u=(step.phase-previous.pose.phase)/(pose.phase-previous.pose.phase),c=Math.cos(yaw),s=Math.sin(yaw),[px,pz]=step.point;
  result.push({key:`${actor.id}/${pose.name}/${step.cycle}/${step.index}`,x:previous.x+(actor.x-previous.x)*u+c*px+s*pz,z:previous.z+(actor.z-previous.z)*u-s*px+c*pz,yaw,birth:end-dt*(1-u)});
 }
 return result;
}

// Shared confirmed-state observer for both renderers. It never interpolates a
// trail across a long observation gap where the actual path is unknown.
export function createLocomotionStepTracker(){
 const observations=new Map();let elapsed=null,stateRef=null;
 return {observe(state,headingFor=actor=>actor.heading??0){
  if(stateRef&&stateRef!==state||elapsed!==null&&state.elapsed<elapsed){observations.clear();elapsed=null;}
  if(elapsed===state.elapsed)return [];
  const start=elapsed??state.elapsed,observed=new Set(),result=[];
  for(const actor of [...state.workers,...(state.raid?.animals??[])]){
   observed.add(actor.id);const pose=movingPose(actor),previous=observations.get(actor.id),yaw=headingFor(actor)??actor.heading??0;
   locomotionStepsBetween(actor,previous,start,state.elapsed,yaw,result);
   observations.set(actor.id,{x:actor.x,z:actor.z,pose});
  }
  for(const id of observations.keys())if(!observed.has(id))observations.delete(id);elapsed=state.elapsed;stateRef=state;return result;
 },preview(state,preview,{headingAtEnd}={}){
  const ticks=preview?.trace?.actorTickStates,actors=[...(state?.workers??[]),...(state?.raid?.animals??[])];
  if(stateRef!==state||elapsed!==preview?.start||state.elapsed!==preview.start||!Number.isFinite(preview.end)||preview.end<=preview.start||preview.end-preview.start>.25||ticks?.complete!==true||!Array.isArray(ticks.actors)||ticks.actors.length!==actors.length||typeof headingAtEnd!=='function')return null;
  const records=new Map();for(const record of ticks.actors){if(typeof record?.actorId!=='string'||records.has(record.actorId)||!Array.isArray(record.samples))return null;records.set(record.actorId,record.samples);}
  const result=[],seen=new Set();for(const actor of actors){
   if(typeof actor?.id!=='string'||!actor.id||seen.has(actor.id))return null;seen.add(actor.id);
   const samples=records.get(actor.id),previous=observations.get(actor.id),first=samples?.[0],last=samples?.at(-1),pose=movingPose(actor);
   if(!previous||!samples||samples.length<2||first?.at!==preview.start||last?.at!==preview.end||JSON.stringify(first)!==JSON.stringify(actorTickState(actor,preview.start,state.tasks??[]))||previous.x!==actor.x||previous.z!==actor.z||JSON.stringify(previous.pose)!==JSON.stringify(pose)||samples.some((sample,i)=>!Number.isFinite(sample?.at)||i&&sample.at<=samples[i-1].at))return null;
   const projected={...actor,x:last.x,z:last.z,status:last.status,running:last.running,gateWaiting:last.gateWaiting,incapacitated:last.incapacitated,fallRemaining:last.fallRemaining,walkPhase:last.walkPhase,runPhase:last.runPhase,carryPhase:last.carryPhase,motionPhase:last.motionPhase,idleState:last.idleMode===null?null:{mode:last.idleMode}};
   if(!Number.isFinite(projected.x)||!Number.isFinite(projected.z))return null;
   // Only require a proven heading when a visible contact is actually due.
   const provisional=locomotionStepsBetween(projected,previous,preview.start,preview.end,0);if(!provisional.length)continue;
   const yaw=headingAtEnd(actor,last,samples);if(!Number.isFinite(yaw))return null;
   locomotionStepsBetween(projected,previous,preview.start,preview.end,yaw,result);
  }
  return result;
 },reset(){observations.clear();elapsed=null;stateRef=null;}};
}
