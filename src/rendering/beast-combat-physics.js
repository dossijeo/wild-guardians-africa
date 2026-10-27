import {guardianImpactTime} from '../simulation/guardian-timing.js';
import {Vector3,Box3} from 'three';
import {BeastRagdollSolver} from '../simulation/beast-ragdoll.js';
import {BeastRagdollBinding} from './beast-ragdoll-binding.js';
import {BeastRecovery} from './beast-recovery.js';
import {applyAnimalPose} from './animal-actions.js';
import {ATTACK} from '../simulation/guardian-combat.js';
import {wallCollisionBounds} from '../world/wall-collision-frame.js';
let initialization;
export async function beastPhysicsRuntime(){initialization??=import('@dimforge/rapier3d-compat').then(async({default:R})=>{await R.init();return R;});return initialization;}

// Simulation calls step before raid/worker AI; rendering only samples the poses.
// Bounded to three articulated actors, with no physical world while inactive.
export class BeastCombatPhysics{
 constructor(world,R){this.world=world;this.R=R;this.entries=new Map();this.seen=new Map();this.v=new Vector3();this.stats={active:0,physicsMs:0,recoveryMs:0,rejected:0,startMs:0,maxStepMs:0};world.nav.beastPhysics=this;}
 static async create(world){
  const R=await beastPhysicsRuntime();
  // Compile the articulated/contact path and select skin support vertices during
  // loading, before an input-triggered hit can pay the cold WASM cost.
  for(const rig of await world.animalPreload?.spares()??[]){
   const binding=new BeastRagdollBinding(rig.model),pose=binding.capture(),colliders=binding.colliders(),solver=new BeastRagdollSolver(R);
   try{solver.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});solver.add('warm',{pose,colliders,scale:rig.model.scale.x});for(let i=0;i<120;i++){solver.step();if(i%8===7)await new Promise(resolve=>setTimeout(resolve,0));}}finally{solver.dispose();}
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  return new BeastCombatPhysics(world,R);
 }
 start(animal){
  const started=performance.now();const w=this.world,data=w.mixers.get(animal.id),root=w.objects.get(animal.id);if(!data||!root)return false;
  const previous=this.entries.get(animal.id);
  if(previous&&!previous.recovery){
   previous.solver.impulse(animal.id,{direction:animal.magicImpact.direction,intensity:animal.magicImpact.intensity,mass:ATTACK.profiles[animal.species].mass});
   previous.hitAt=animal.magicImpact.impactAt??-Infinity;previous.actor.age=0;previous.settledAt=null;animal.magicDown.since=w.state.elapsed;animal.magicDown.until=w.state.elapsed+9;return true;
  }
  if(previous?.recovery){
   // Sample get-up at simulation time, even when no frame was rendered between
   // two ticks. Capture before restoring the authored pose: otherwise a hit
   // during get-up visibly snaps the animal upright before launching it again.
   const recovery=previous.recovery;recovery.age=0;recovery.apply(previous.recoveryAge);
   try{
    const binding=new BeastRagdollBinding(data.model),pose=binding.capture(),colliders=binding.colliders();
    const hip=binding.entries[0].bone.getWorldPosition(this.v),offset={x:hip.x-animal.x,z:hip.z-animal.z};
    const actor=previous.solver.add(animal.id,{pose,colliders,scale:data.model.scale.x,mass:ATTACK.profiles[animal.species].mass,direction:animal.magicImpact.direction,intensity:animal.magicImpact.intensity,heading:animal.heading??0});
    Object.assign(previous,{binding,actor,offset,recovery:null,recoveryAge:0,accumulator:0,hitAt:animal.magicImpact.impactAt??-Infinity,settledAt:null});
    animal.magicDown={phase:'falling',since:w.state.elapsed,until:w.state.elapsed+9};
    this.stats.startMs=performance.now()-started;return true;
   }finally{recovery.restore();}
  }
  if(this.entries.size>=3){this.stats.rejected++;return false;}
  root.updateMatrixWorld(true);const binding=new BeastRagdollBinding(data.model),pose=binding.capture(),colliders=binding.colliders(),solver=new BeastRagdollSolver(this.R,{capacity:1});
  try{
   const vertices=[],indices=[],size=16,ox=animal.x-8,oz=animal.z-8;
   for(let z=0;z<=size;z++)for(let x=0;x<=size;x++){const px=ox+x,pz=oz+z;vertices.push(px,w.nav.field.surface(px,pz),pz);}
   for(let z=0;z<size;z++)for(let x=0;x<size;x++){const i=z*(size+1)+x;indices.push(i,i+size+1,i+1,i+1,i+size+1,i+size+2);}
   solver.terrain(new Float32Array(vertices),new Uint32Array(indices));
   for(const structure of w.state.structures){if(structure.status!=='intact'||Math.hypot(structure.x-animal.x,structure.z-animal.z)>10)continue;
    if(structure.kind==='wall'){const b=wallCollisionBounds(structure,0),y=w.nav.field.surface(structure.x,structure.z);solver.box({x:(b[0]+b[2])/2,y:y+1.25,z:(b[1]+b[3])/2},{x:(b[2]-b[0])/2,y:1.25,z:(b[3]-b[1])/2});}
    else{const object=w.objects.get(structure.id);if(object){const box=new Box3().setFromObject(object),center=box.getCenter(new Vector3()),half=box.getSize(new Vector3()).multiplyScalar(.5);if(half.x>0&&half.y>0&&half.z>0)solver.box(center,half);}}
   }
   for(const p of w.nav.propsAt?.(animal.x,animal.z,8)??[])if(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18){const r=p.radius??1,y=w.nav.field.surface(p.x,p.z);solver.box({x:p.x,y:y+1.5,z:p.z},{x:r,y:1.5,z:r});}
   const hit=animal.magicImpact,actor=solver.add(animal.id,{pose,colliders,scale:data.model.scale.x,mass:ATTACK.profiles[animal.species].mass,direction:hit.direction,intensity:hit.intensity,heading:animal.heading??0});
   const hip=binding.entries[0].bone.getWorldPosition(new Vector3()),offset={x:hip.x-animal.x,z:hip.z-animal.z};
   animal.magicDown={phase:'falling',since:w.state.elapsed,until:w.state.elapsed+9};animal.path=null;animal.attackRemaining=0;animal.hitApplied=true;if(animal.status==='attacking')animal.status='walking';
   this.entries.set(animal.id,{animal,data,root,binding,solver,actor,offset,accumulator:0,hitAt:animal.magicImpact.impactAt??-Infinity,settledAt:null,recovery:null});this.stats.startMs=performance.now()-started;return true;
  }catch(error){solver.dispose();throw error;}
 }
 step(state,dt){
  const started=performance.now();
  for(const id of this.seen.keys())if(!state.raid?.animals.some(a=>a.id===id))this.seen.delete(id);
  for(const animal of state.raid?.animals??[]){
   if(animal.magicDown&&!this.entries.has(animal.id))delete animal.magicDown;
   const hit=animal.magicImpact;if(hit&&state.elapsed>=guardianImpactTime(hit)&&state.elapsed-guardianImpactTime(hit)<.5&&this.seen.get(animal.id)!==hit.at){if(!this.world.mixers.has(animal.id))continue;this.seen.set(animal.id,hit.at);try{this.start(animal);}catch(error){this.world.onError?.(error);}}
  }
  for(const [id,e] of this.entries){
   if(!state.raid?.animals.includes(e.animal)||e.animal.status==='gone'||state.result){this.release(id);continue;}
   const a=e.animal;
   if(e.recovery){e.recoveryAge=Math.min(e.recovery.duration,e.recoveryAge+dt);if(e.recoveryAge>=e.recovery.duration){e.recovery.restore();this.release(id);a.path=null;a.approach=null;a.destinationId=null;}continue;}
   e.accumulator+=Math.min(dt,Math.max(0,state.elapsed-e.hitAt));while(e.accumulator>=1/60){e.solver.step();e.accumulator-=1/60;}
   e.binding.restore();e.binding.apply(e.actor.pose);const hip=e.binding.entries[0].bone.getWorldPosition(this.v);a.x=hip.x-e.offset.x;a.z=hip.z-e.offset.z;
   if(e.actor.settled){e.settledAt??=e.actor.age;}else e.settledAt=null;
   if(e.actor.age>5||e.settledAt!==null&&e.actor.age-e.settledAt>.3){
    e.binding.restore();e.root.position.set(a.x,this.world.nav.field.surface(a.x,a.z),a.z);e.root.updateMatrixWorld(true);e.data.key=null;applyAnimalPose(e.data,a,state.elapsed);
    e.recovery=new BeastRecovery(e.binding,e.actor.pose,{surface:(x,z)=>this.world.nav.field.surface(x,z)});e.recoveryAge=0;e.solver.remove(id);a.magicDown.phase='recovering';
   }
  }
  this.stats.active=this.entries.size;this.stats.physicsMs=performance.now()-started;this.stats.maxStepMs=Math.max(this.stats.maxStepMs,this.stats.physicsMs);
 }
 before(id){const e=this.entries.get(id);if(e?.recovery)e.recovery.restore();else e?.binding.restore();}
 render(id){const e=this.entries.get(id);if(!e)return;if(e.recovery){const start=performance.now();e.recovery.age=0;e.recovery.apply(e.recoveryAge);this.stats.recoveryMs+=performance.now()-start;}else e.binding.apply(e.actor.pose);}
 release(id){const e=this.entries.get(id);if(!e)return;e.recovery?.restore();e.binding.restore();e.solver.dispose();delete e.animal.magicDown;this.entries.delete(id);}
 dispose(){for(const id of this.entries.keys())this.release(id);if(this.world.nav.beastPhysics===this)delete this.world.nav.beastPhysics;this.seen.clear();}
}
