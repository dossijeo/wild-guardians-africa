import {Box3,Vector3} from 'three';
import {BeastRecovery} from './beast-recovery.js';
import {visitBeastSolids} from './beast-physics-environment.js';

// Conservative sampled skin envelope, translated away from nearby solid boxes.
// Keep the entry side of each obstacle: never eject through a thin wall.
export class BakedSolidContacts{
 constructor(binding,boxes){
  this.binding=binding;this.boxes=boxes;this.samples=BeastRecovery.contactSamples(binding.model);this.bounds=new Box3();this.point=new Vector3();this.reference=binding.bones.get('Hips').getWorldPosition(new Vector3());this.shift=new Vector3();
 }
 static forAnimal(world,animal,binding){const boxes=[];visitBeastSolids(world,animal,(key,read)=>{const box=read();if(key.startsWith('structure:')){const id=key.slice(10);box.active=()=>{for(const s of world.state.structures)if(s.id===id)return s.status==='intact';return false;};}boxes.push(box);});return new BakedSolidContacts(binding,boxes);}
 resolve(){
  this.shift.set(0,0,0);if(!this.boxes.length)return this.shift;
  this.bounds.makeEmpty();for(const {mesh,index}of this.samples){mesh.getVertexPosition(index,this.point).applyMatrix4(mesh.matrixWorld);this.bounds.expandByPoint(this.point);}
  const b=this.bounds,r=this.reference;
  for(let pass=0;pass<4;pass++)for(const solid of this.boxes){
   if(solid.active?.()===false||!b.intersectsBox(solid))continue;
   const x=r.x<(solid.min.x+solid.max.x)/2?solid.min.x-b.max.x-.015:solid.max.x-b.min.x+.015;
   const z=r.z<(solid.min.z+solid.max.z)/2?solid.min.z-b.max.z-.015:solid.max.z-b.min.z+.015;
   // Prefer a face that the initial hip was already outside.
   const outsideX=r.x<=solid.min.x||r.x>=solid.max.x,outsideZ=r.z<=solid.min.z||r.z>=solid.max.z;
   this.point.set((outsideX&&!outsideZ||outsideX===outsideZ&&Math.abs(x)<=Math.abs(z))?x:0,0,(outsideZ&&!outsideX||outsideX===outsideZ&&Math.abs(z)<Math.abs(x))?z:0);
   b.translate(this.point);this.shift.add(this.point);
  }
  if(this.shift.lengthSq()){const hip=this.binding.bones.get('Hips');hip.getWorldPosition(this.point).add(this.shift);hip.position.copy(hip.parent.worldToLocal(this.point));this.binding.model.updateMatrixWorld(true);}
  return this.shift;
 }
}
