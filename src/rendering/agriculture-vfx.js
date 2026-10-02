import {BALANCE} from '../simulation/balance.js';
import {vfxEnvironment} from './vfx-native.js';
const durations=Object.fromEntries(BALANCE.spells.map(s=>[s.id,s.duration_seconds]));
export function agricultureVfxPlans(state){
  return state.spells.filter(s=>['growth','multiply'].includes(s.kind)&&s.remaining>0).map(s=>({key:s.id,kind:s.kind,x:s.x,z:s.z,scale:s.radius/.79,duration:durations[s.kind],time:Math.max(0,durations[s.kind]-s.remaining)}));
}
export class AgricultureVfx {
  constructor(library,pipeline,scene,surface){this.library=library;this.pipeline=pipeline;this.scene=scene;this.surface=surface;this.effects=new Map();}
  update(state){
    const desired=new Set(),environment=vfxEnvironment(state.time>=300?1:0);
    for(const plan of agricultureVfxPlans(state)){
      desired.add(plan.key);let effect=this.effects.get(plan.key);
      if(!effect){effect=this.library.create('heal',this.pipeline,{worldSurface:this.surface,agricultureMode:plan.kind,agricultureDuration:plan.duration});this.effects.set(plan.key,effect);this.scene.add(effect);}
      effect.position.set(plan.x,this.surface(plan.x,plan.z),plan.z);effect.scale.set(plan.scale,1,plan.scale);effect.environment=environment;
      if(plan.time<effect.native.time-1e-8||effect.native.time===0)effect.seek(plan.time);else effect.advance(Math.max(0,plan.time-effect.native.time));
    }
    for(const [key,effect] of this.effects)if(!desired.has(key)){effect.dispose();this.effects.delete(key);}
  }
  prepare(camera){let depth=false;for(const effect of this.effects.values())depth=effect.prepare(camera,this.scene)||depth;return depth;}
  dispose(){for(const effect of this.effects.values())effect.dispose();this.effects.clear();}
}
