import {BeastRecovery} from '../../src/rendering/beast-recovery.js';
import {applyAnimalPose} from '../../src/rendering/animal-actions.js';
import {Vector3} from 'three';
import {BeastRagdollSolver} from '../../src/simulation/beast-ragdoll.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {ATTACK} from '../../src/simulation/guardian-combat.js';
// Graphical integration probe, deliberately separate from authoritative combat
// until recovery and logical-position reconciliation have been validated.
export async function ragdollTrial(world,animal){
 const {default:R}=await import('@dimforge/rapier3d-compat');await R.init();
 const data=world.mixers.get(animal.id);if(!data)throw Error('Beast rig is still loading');
 animal.motionPhase=.35;data.key=null;applyAnimalPose(data,animal,world.state.elapsed);
 const binding=new BeastRagdollBinding(data.model),solver=new BeastRagdollSolver(R),vertices=[],indices=[],size=16;
 for(let z=0;z<=size;z++)for(let x=0;x<=size;x++){const px=animal.x+x-8,pz=animal.z+z-8;vertices.push(px,world.nav.field.surface(px,pz),pz);}
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){const i=z*(size+1)+x;indices.push(i,i+size+1,i+1,i+1,i+size+1,i+size+2);}
 solver.terrain(new Float32Array(vertices),new Uint32Array(indices));
 const pose=binding.capture(),colliders=binding.colliders();
 const actor=solver.add(animal.id,{pose,colliders,scale:data.model.scale.x,mass:ATTACK.profiles[animal.species].mass,direction:{x:1,y:-.2,z:.2},heading:animal.heading??0});
 let accumulator=0,skinContact=null,recovery=null,complete=false,settledAt=null;const start=actor.pose[0],samples=[],root=world.objects.get(animal.id),original={x:animal.x,z:animal.z};
 const measure=()=>{data.model.updateMatrixWorld(true);const v=new Vector3();let below=0,total=0,penetration=0;data.model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i+=3){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);const depth=world.nav.field.surface(v.x,v.z)-v.y;penetration=Math.max(penetration,depth);if(depth>.08)below++;total++;}});return {penetration,fractionBelow8cm:below/total,samples:total};};
 return {before(){if(recovery)recovery.restore();else binding.restore();},frame(dt){
  if(complete)return;
  if(recovery){complete=recovery.apply(dt);return;}
  accumulator+=Math.min(.25,dt);while(accumulator>=1/60){solver.step();accumulator-=1/60;samples.push(solver.stats.stepMs);}
  binding.apply(actor.pose);
  if(actor.settled&&actor.age>1){settledAt??=actor.age;if(actor.age-settledAt>.3){
   skinContact=measure();const fallen=binding.entries[0].bone.getWorldPosition(new Vector3());binding.restore();const standing=binding.entries[0].bone.getWorldPosition(new Vector3());
   animal.x+=fallen.x-standing.x;animal.z+=fallen.z-standing.z;animal.path=null;animal.destinationId=null;
   root.position.set(animal.x,world.nav.field.surface(animal.x,animal.z),animal.z);root.updateMatrixWorld(true);data.key=null;applyAnimalPose(data,animal,world.state.elapsed);
   recovery=new BeastRecovery(binding,actor.pose,{surface:(x,z)=>world.nav.field.surface(x,z)});solver.remove(animal.id);recovery.apply(0);
  }}else settledAt=null;
 },report(){const sorted=[...samples].sort((a,b)=>a-b);return {species:animal.species,age:actor.age,settled:actor.settled,phase:complete?'recovered':recovery?'recovering':'falling',recoveryAge:recovery?.age,displacement:actor.pose[0]-start,logicalDisplacement:Math.hypot(animal.x-original.x,animal.z-original.z),physicsP95:sorted[Math.floor(sorted.length*.95)],bodies:solver.stats.active*14,skinContact,recoveryLift:recovery?.lift,scope:'QA physics and recovery; production combat not connected'};},dispose(){recovery?.restore();binding.restore();solver.dispose();}};
}
