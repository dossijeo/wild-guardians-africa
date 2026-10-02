import {BALANCE} from '../simulation/balance.js';
import {vfxEnvironment} from './vfx-native.js';
const duration=BALANCE.spells.find(s=>s.id==='shield').duration_seconds;
export function shieldVfxPlans(state){
  const plans=state.spells.filter(s=>s.kind==='shield'&&s.remaining>0).map(s=>({key:s.id,mode:'barrier',x:s.x,z:s.z,yaw:0,scale:s.radius/1.65,time:Math.max(0,duration-s.remaining)}));
  for(const event of state.events){
    const p=event.presentation,shield=p?.shield;if(event.type!=='AnimalLogicalHit'||!shield)continue;
    if(!Number.isFinite(p.elapsed)||![shield.x,shield.z,shield.radius,p.animal?.x,p.animal?.z].every(Number.isFinite)||shield.radius<=0)continue;
    const age=state.elapsed-p.elapsed;if(age<0||age>=.9)continue;
    const angle=Math.atan2(p.animal.x-shield.x,p.animal.z-shield.z),yaw=angle+Math.PI/2,scale=shield.radius/1.65;
    // Place the original block at its height on the actual ellipsoid surface.
    // The logical barrier is a circle; presentation projects onto the 3D dome.
    const radius=shield.radius*Math.sqrt(1-(.86/1.98)**2),cx=shield.x+Math.sin(angle)*radius,cz=shield.z+Math.cos(angle)*radius;
    plans.push({key:'block/'+event.attackId,mode:'contact',x:cx+Math.cos(yaw)*1.5*scale,z:cz-Math.sin(yaw)*1.5*scale,yaw,scale,time:Math.max(1e-6,age),contact:{x:cx,z:cz,height:.86*scale},shieldId:shield.id});
  }
  return plans;
}
export class ShieldVfx {
  constructor(library,pipeline,scene,surface){this.library=library;this.pipeline=pipeline;this.scene=scene;this.surface=surface;this.effects=new Map();}
  update(state){
    const desired=new Set(),environment=vfxEnvironment(state.time>=300?1:0);
    for(const plan of shieldVfxPlans(state)){
      desired.add(plan.key);let effect=this.effects.get(plan.key);
      if(!effect){effect=this.library.create('shield',this.pipeline,{worldSurface:this.surface,shieldMode:plan.mode,shieldDuration:duration});this.effects.set(plan.key,effect);this.scene.add(effect);}
      effect.position.set(plan.x,this.surface(plan.x,plan.z),plan.z);effect.rotation.y=plan.yaw;effect.scale.setScalar(plan.scale);effect.environment=environment;
      if(plan.time<effect.native.time-1e-8||effect.native.time===0)effect.seek(plan.time);else effect.advance(Math.max(0,plan.time-effect.native.time));
    }
    for(const [key,effect] of this.effects)if(!desired.has(key)){effect.dispose();this.effects.delete(key);}
  }
  prepare(camera){let depth=false;for(const effect of this.effects.values())depth=effect.prepare(camera,this.scene)||depth;return depth;}
  dispose(){for(const effect of this.effects.values())effect.dispose();this.effects.clear();}
}
