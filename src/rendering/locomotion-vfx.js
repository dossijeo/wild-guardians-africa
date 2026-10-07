import {StepRipples} from './step-ripples.js';
import {FOOTSTEPS} from './footsteps-data.js';
import {vfxEnvironment} from './vfx-native.js';
const lifetime=1.6;
import {movingPose,crossedFootsteps} from './locomotion-contact.js';
export {movingPose,crossedFootsteps} from './locomotion-contact.js';
export class LocomotionVfx {
 constructor(library,pipeline,scene,surface,waterAt=()=>null){this.waterAt=waterAt;this.library=library;this.pipeline=pipeline;this.scene=scene;this.surface=surface;this.effects=new Map();this.observations=new Map();this.elapsed=null;}
 update(state,objects=new Map()){
  if(this.stateRef&&this.stateRef!==state)this.dispose();
  if(this.elapsed!==null&&state.elapsed<this.elapsed)this.dispose();
  if(this.elapsed===state.elapsed)return;
  const dt=this.elapsed===null?0:state.elapsed-this.elapsed,environment=vfxEnvironment(state.time>=300?1:0),observed=new Set();
  for(const actor of [...state.workers,...(state.raid?.animals??[])]){
   observed.add(actor.id);const pose=movingPose(actor),previous=this.observations.get(actor.id),yaw=objects.get(actor.id)?.rotation.y??actor.heading??0;
   const clip=pose&&FOOTSTEPS.sources[actor.profile??actor.species]?.clips[pose.name];
   // Long observation gaps cannot establish the traversed route. Omit historical
   // dust rather than drawing a straight trail through obstacles after a jump.
   if(clip&&previous?.pose?.name===pose.name&&dt>0&&dt<=.25&&Math.hypot(actor.x-previous.x,actor.z-previous.z)>1e-8){
    for(const step of crossedFootsteps(clip,previous.pose.phase,pose.phase)){
     const u=(step.phase-previous.pose.phase)/(pose.phase-previous.pose.phase),c=Math.cos(yaw),s=Math.sin(yaw),[px,pz]=step.point;
     const x=previous.x+(actor.x-previous.x)*u+c*px+s*pz,z=previous.z+(actor.z-previous.z)*u-s*px+c*pz,key=`${actor.id}/${pose.name}/${step.cycle}/${step.index}`;
     if(this.effects.has(key))continue;
     const water=this.waterAt(x,z);
     if(water?.inside&&Number.isFinite(water.level)){
      this.prepareWaterSteps();this.ripples.add(x,z,water.level,state.elapsed-dt*(1-u));continue;
     }
     const effect=this.library.create('dust',this.pipeline,{worldSurface:this.surface,stepMode:true});effect.position.set(x,this.surface(x,z),z);effect.rotation.y=yaw;effect.userData.birth=state.elapsed-dt*(1-u);this.effects.set(key,effect);this.scene.add(effect);
    }
   }
   this.observations.set(actor.id,{x:actor.x,z:actor.z,pose});
  }
  for(const id of this.observations.keys())if(!observed.has(id))this.observations.delete(id);
  for(const [key,effect] of this.effects){
   const age=state.elapsed-effect.userData.birth;
   if(age>=lifetime){effect.dispose();this.effects.delete(key);continue;}
   effect.environment=environment;const time=Math.max(1e-6,age);
   if(effect.native.time===0||time<effect.native.time-1e-8)effect.seek(time);else effect.advance(Math.max(0,time-effect.native.time));
  }
  this.ripples?.update(state.elapsed);
  this.elapsed=state.elapsed;
  this.stateRef=state;
 }
 prepareWaterSteps(){this.ripples??=new StepRipples(this.scene);return this.ripples.mesh;}
 prepare(camera){let depth=false;for(const effect of this.effects.values())depth=effect.prepare(camera,this.scene)||depth;return depth;}
 dispose(){this.ripples?.dispose();this.ripples=null;for(const effect of this.effects.values())effect.dispose();this.effects.clear();this.observations.clear();this.elapsed=null;this.stateRef=null;}
}
