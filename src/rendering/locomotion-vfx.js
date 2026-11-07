import {StepRipples} from './step-ripples.js';
import {vfxEnvironment} from './vfx-native.js';
const lifetime=1.6;
import {createLocomotionStepTracker} from './locomotion-contact.js';
export {movingPose,crossedFootsteps} from './locomotion-contact.js';
export class LocomotionVfx {
 constructor(library,pipeline,scene,surface,waterAt=()=>null){this.waterAt=waterAt;this.library=library;this.pipeline=pipeline;this.scene=scene;this.surface=surface;this.effects=new Map();this.steps=createLocomotionStepTracker();this.elapsed=null;}
 update(state,objects=new Map(),headingFor=null){
  if(this.stateRef&&this.stateRef!==state)this.dispose();
  if(this.elapsed!==null&&state.elapsed<this.elapsed)this.dispose();
  if(this.elapsed===state.elapsed)return;
  const environment=vfxEnvironment(state.time>=300?1:0);
  for(const {key,x,z,yaw,birth} of this.steps.observe(state,actor=>headingFor?.(actor)??objects.get(actor.id)?.rotation.y??actor.heading??0)){
   if(this.effects.has(key))continue;const water=this.waterAt(x,z);
   if(water?.inside&&Number.isFinite(water.level)){this.prepareWaterSteps();this.ripples.add(x,z,water.level,birth);continue;}
   const effect=this.library.create('dust',this.pipeline,{worldSurface:this.surface,stepMode:true});effect.position.set(x,this.surface(x,z),z);effect.rotation.y=yaw;effect.userData.birth=birth;this.effects.set(key,effect);this.scene.add(effect);
  }
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
 dispose(){this.ripples?.dispose();this.ripples=null;for(const effect of this.effects.values())effect.dispose();this.effects.clear();this.steps.reset();this.elapsed=null;this.stateRef=null;}
}
