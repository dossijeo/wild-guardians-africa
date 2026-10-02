import {vfxDefinitions,vfxEnvironment} from './vfx-native.js';
const materials={zarzas:'wood',empalizada:'wood',reforzado:'wood',adobe:'adobe',piedra:'stone'};
const durations=new Map(vfxDefinitions.map(d=>[d.id,d.duration]));
export function wallImpactContact(wall,animal){
  const yaw=wall.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),dx=animal.x-wall.x,dz=animal.z-wall.z;
  const x=c*dx-s*dz,z=s*dx+c*dz,scale=wall.gate?({adobe:1.4,piedra:1.4,reforzado:1.6}[wall.material]??1):1;
  const width=1.09*(wall.baseScaleX??1)*scale,depth=.22*scale;
  // Ray from the wall centre toward the attacker meets the logical outer face.
  const factor=Math.min(x?width/Math.abs(x):Infinity,z?depth/Math.abs(z):Infinity);
  const local=Number.isFinite(factor)?{x:x*factor,z:z*factor}:{x:0,z:depth};
  return {x:wall.x+c*local.x+s*local.z,z:wall.z-s*local.x+c*local.z,yaw:Math.atan2(dx,dz)};
}
export function materialVfxPlans(state){
  const plans=[];
  for(const event of state.events){
    const p=event.presentation,target=p?.target,id=materials[target?.material];
    if(event.type!=='AnimalLogicalHit'||!p||p.shield||target?.kind!=='wall'||!id||!Number.isFinite(p.elapsed)||![target.x,target.z,p.animal?.x,p.animal?.z].every(Number.isFinite)||target.yaw!==undefined&&!Number.isFinite(target.yaw)||target.baseScaleX!==undefined&&(!Number.isFinite(target.baseScaleX)||target.baseScaleX<=0))continue;
    const age=state.elapsed-p.elapsed,time=.42+age;if(age<0||time>=durations.get(id))continue;
    const contact=wallImpactContact(target,p.animal),c=Math.cos(contact.yaw),s=Math.sin(contact.yaw);
    plans.push({key:event.attackId,id,time,x:contact.x-c*.05-s*.33,z:contact.z+s*.05-c*.33,yaw:contact.yaw,contact});
  }
  return plans;
}
export class MaterialVfx {
  constructor(library,pipeline,scene,surface){this.library=library;this.pipeline=pipeline;this.scene=scene;this.surface=surface;this.effects=new Map();}
  update(state){
    const desired=new Set(),environment=vfxEnvironment(state.time>=300?1:0);
    for(const plan of materialVfxPlans(state)){
      desired.add(plan.key);let effect=this.effects.get(plan.key);
      if(!effect){effect=this.library.create(plan.id,this.pipeline,{worldSurface:this.surface});this.effects.set(plan.key,effect);this.scene.add(effect);}
      effect.position.set(plan.x,this.surface(plan.contact.x,plan.contact.z),plan.z);effect.rotation.y=plan.yaw;effect.environment=environment;
      if(plan.time<effect.native.time-1e-8||effect.native.time===0)effect.seek(plan.time);else effect.advance(Math.max(0,plan.time-effect.native.time));
    }
    for(const [key,effect] of this.effects)if(!desired.has(key)){effect.dispose();this.effects.delete(key);}
  }
  prepare(camera){let depth=false;for(const effect of this.effects.values())depth=effect.prepare(camera,this.scene)||depth;return depth;}
  dispose(){for(const effect of this.effects.values())effect.dispose();this.effects.clear();}
}
