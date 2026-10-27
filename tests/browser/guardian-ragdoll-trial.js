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
 let accumulator=0,skinContact=null;const start=actor.pose[0],samples=[];
 return {before(){binding.restore();},frame(dt){if(actor.age<6){accumulator+=Math.min(.05,dt);while(accumulator>=1/60){solver.step();accumulator-=1/60;samples.push(solver.stats.stepMs);}}binding.apply(actor.pose);if(actor.age>=6&&!skinContact){data.model.updateWorldMatrix(true,true);const v=new Vector3();let below=0,total=0,penetration=0;data.model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i+=3){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);const depth=world.nav.field.surface(v.x,v.z)-v.y;penetration=Math.max(penetration,depth);if(depth>.08)below++;total++;}});skinContact={penetration,fractionBelow8cm:below/total,samples:total};}},report(){const sorted=[...samples].sort((a,b)=>a-b);return {species:animal.species,age:actor.age,settled:actor.settled,displacement:actor.pose[0]-start,physicsP95:sorted[Math.floor(sorted.length*.95)],bodies:actor.parts.length,colliders:colliders.map(c=>c&&({samples:c.samples,hullPoints:c.hull?.length/3})),skinContact,scope:'visual physics probe; no gameplay or recovery integration'};},dispose(){binding.restore();solver.dispose();}};
}
