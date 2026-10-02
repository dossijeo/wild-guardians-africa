import {centerBoundaryPoint,centerCulture} from '../world/centers.js';
import {vfxDefinitions,vfxEnvironment} from './vfx-native.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';

const definitions=new Map(vfxDefinitions.map(d=>[d.id,d]));
// Last decorative contact in each original composition. A combo still consumes
// exactly one logical hit, at the end of the committed animation.
export const attackVfxContacts={rhino:{time:1.7,point:[.84,.98,0]},lion:{time:1.75,point:[.78,1.1,.09]},buffalo:{time:1.43,point:[-.03,.03,0]},warthog:{time:1.27,point:[.8,1.03,0]},hyena:{time:1.25,point:[.84,1.1,0]}};
export const animalVisualHeights=Object.fromEntries(Object.entries(ANIMAL_ACTIONS.animals).map(([id,a])=>[id,a.presentation.bindHeight]));

function frame(species,animal,target){
  const contact=attackVfxContacts[species];if(!contact)return null;
  const yaw=(animal.heading??Math.atan2(target.x-animal.x,target.z-animal.z))-Math.PI/2;
  const scale=animalVisualHeights[species]/1.1;
  const distance=Math.hypot(animal.x-target.x,animal.z-target.z);
  const radius=Math.min(distance,target.radius??(target.kind==='wall'?1.2:0));
  const {x,z}=target.kind==='center'?centerBoundaryPoint(target,Math.atan2(animal.x-target.x,animal.z-target.z)):{x:target.x+(distance?(animal.x-target.x)/distance*radius:0),z:target.z+(distance?(animal.z-target.z)/distance*radius:0)};
  const [px,,pz]=contact.point;
  return {x:x-scale*(Math.cos(yaw)*px+Math.sin(yaw)*pz),z:z-scale*(-Math.sin(yaw)*px+Math.cos(yaw)*pz),yaw,scale,contact:{x,z}};
}
function shieldFor(state,target){return state.spells.find(s=>s.kind==='shield'&&s.remaining>0&&Math.hypot(s.x-target.x,s.z-target.z)<=s.radius);}

export function attackVfxPlans(state){
  const plans=new Map(),targets=new Map([...state.plants,...state.structures].map(t=>[t.id,t]));
  for(const animal of state.raid?.animals??[]){
    if(animal.status!=='attacking'||animal.hitApplied||animal.hitsRemaining<=0||!animal.attackId||!(animal.attackDuration>0))continue;
    const target=targets.get(animal.targetId),contact=attackVfxContacts[animal.species];
    if(!target||target.alive===false||target.status&&target.status!=='intact'||!contact)continue;
    const placement=frame(animal.species,animal,shieldFor(state,target)??(target.kind==='center'?{...target,culture:centerCulture(target,state)}:target));
    const progress=Math.max(0,Math.min(1,1-animal.attackRemaining/animal.attackDuration));
    plans.set(animal.attackId,{key:animal.attackId,id:animal.species,...placement,time:Math.min(contact.time-1e-5,contact.time*progress)});
  }
  // Persisted domain facts reconstruct dissipating effects after reload, even
  // after the animal/raid has left. Old saves without this metadata remain valid.
  for(const event of state.events){
    if(event.type!=='AnimalLogicalHit'||!event.presentation)continue;
    const p=event.presentation,contact=attackVfxContacts[event.species],point=t=>t&&Number.isFinite(t.x)&&Number.isFinite(t.z);
    if(!contact||!Number.isFinite(p.elapsed)||!point(p.animal)||!point(p.target)||p.shield&&(!point(p.shield)||!(p.shield.radius>0)))continue;
    const age=state.elapsed-p.elapsed,time=contact.time+age;
    if(age<0||time>=definitions.get(event.species).duration)continue;
    const savedTarget=p.shield??(p.target.kind==='center'?{...p.target,culture:p.target.culture??centerCulture(targets.get(event.targetId)??p.target,state),yaw:p.target.yaw??targets.get(event.targetId)?.yaw}:p.target);
    plans.set(event.attackId,{key:event.attackId,id:event.species,...frame(event.species,p.animal,savedTarget),time,blocked:!!p.shield});
  }
  return [...plans.values()];
}

export class AttackVfx {
  constructor(library,pipeline,scene,surface){this.library=library;this.pipeline=pipeline;this.scene=scene;this.surface=surface;this.effects=new Map();}
  update(state){
    const desired=new Set(),environment=vfxEnvironment(state.time>=300?1:0);
    for(const plan of attackVfxPlans(state)){
      desired.add(plan.key);let effect=this.effects.get(plan.key);
      if(!effect){effect=this.library.create(plan.id,this.pipeline,{worldSurface:this.surface});this.effects.set(plan.key,effect);this.scene.add(effect);}
      effect.position.set(plan.x,this.surface(plan.x,plan.z),plan.z);effect.rotation.y=plan.yaw;effect.scale.setScalar(plan.scale);effect.environment=environment;
      if(plan.time<effect.native.time||effect.native.time===0)effect.seek(plan.time);else effect.advance(plan.time-effect.native.time);
    }
    for(const [key,effect] of this.effects)if(!desired.has(key)){effect.dispose();this.effects.delete(key);}
  }
  prepare(camera){let depth=false;for(const effect of this.effects.values())depth=effect.prepare(camera,this.scene)||depth;return depth;}
  dispose(){for(const effect of this.effects.values())effect.dispose();this.effects.clear();}
}
