import {FOOTSTEPS} from './footsteps-data.js';

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

// Shared confirmed-state observer for both renderers. It never interpolates a
// trail across a long observation gap where the actual path is unknown.
export function createLocomotionStepTracker(){
 const observations=new Map();let elapsed=null,stateRef=null;
 return {observe(state,headingFor=actor=>actor.heading??0){
  if(stateRef&&stateRef!==state||elapsed!==null&&state.elapsed<elapsed){observations.clear();elapsed=null;}
  if(elapsed===state.elapsed)return [];
  const dt=elapsed===null?0:state.elapsed-elapsed,observed=new Set(),result=[];
  for(const actor of [...state.workers,...(state.raid?.animals??[])]){
   observed.add(actor.id);const pose=movingPose(actor),previous=observations.get(actor.id),yaw=headingFor(actor)??actor.heading??0,clip=pose&&FOOTSTEPS.sources[actor.profile??actor.species]?.clips[pose.name];
   if(clip&&previous?.pose?.name===pose.name&&dt>0&&dt<=.25&&Math.hypot(actor.x-previous.x,actor.z-previous.z)>1e-8)for(const step of crossedFootsteps(clip,previous.pose.phase,pose.phase)){
    const u=(step.phase-previous.pose.phase)/(pose.phase-previous.pose.phase),c=Math.cos(yaw),s=Math.sin(yaw),[px,pz]=step.point;
    result.push({key:`${actor.id}/${pose.name}/${step.cycle}/${step.index}`,x:previous.x+(actor.x-previous.x)*u+c*px+s*pz,z:previous.z+(actor.z-previous.z)*u-s*px+c*pz,yaw,birth:state.elapsed-dt*(1-u)});
   }
   observations.set(actor.id,{x:actor.x,z:actor.z,pose});
  }
  for(const id of observations.keys())if(!observed.has(id))observations.delete(id);elapsed=state.elapsed;stateRef=state;return result;
 },reset(){observations.clear();elapsed=null;stateRef=null;}};
}
