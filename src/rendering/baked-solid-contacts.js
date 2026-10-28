import {clearBoxOffset} from './clear-box-offset.js';
import {Box3,Vector3} from 'three';
import {BeastRecovery} from './beast-recovery.js';
import {visitBeastSolids} from './beast-physics-environment.js';

// Conservative sampled skin envelope, translated away from nearby solid boxes.
// Keep the entry side of each obstacle: never eject through a thin wall.
export class BakedSolidContacts{
 constructor(binding,boxes,peers=null){
  this.binding=binding;this.boxes=boxes;this.peers=peers;this.peerCache=new Map();this.peerBoxes=[];this.partBox=new Box3();this.samples=BeastRecovery.contactSamples(binding.model);this.positions=new Float64Array(this.samples.length*3);this.bounds=new Box3();this.point=new Vector3();this.reference=binding.bones.get('Hips').getWorldPosition(new Vector3());this.shift=new Vector3();this.peerOffset=new Vector3();
 }
 static forAnimal(world,animal,binding,{peers=false}={}){const boxes=[];visitBeastSolids(world,animal,(key,read)=>{const box=read();if(key.startsWith('structure:')){const id=key.slice(10);box.active=()=>{for(const s of world.state.structures)if(s.id===id)return s.status==='intact';return false;};}boxes.push(box);});return new BakedSolidContacts(binding,boxes,peers?()=>{const manager=world.nav.beastPhysics,entries=[...(manager?.entries.values()??[])];for(const e of manager?.baked?.entries.values()??[]){if(e.animal.id===animal.id)break;entries.push(e);}return entries;}:null);}
 refreshPeers(){
  this.peerBoxes.length=0;const seen=new Set();
  for(const e of this.peers?.()??[]){
   const model=e.data.model;seen.add(model);let cached=this.peerCache.get(model);
   if(!cached){cached={box:new Box3(),samples:BeastRecovery.contactSamples(model)};this.peerCache.set(model,cached);}
   cached.box.makeEmpty();
   if(e.actor){for(const {body}of e.actor.parts){
    const collider=body.collider(0),position=collider.translation(),rotation=collider.rotation();this.partBox.makeEmpty();
    if(collider.shapeType()===e.solver.R.ShapeType.ConvexPolyhedron){const vertices=collider.vertices();for(let i=0;i<vertices.length;i+=3){this.point.fromArray(vertices,i).applyQuaternion(rotation).add(position);this.partBox.expandByPoint(this.point);}}
    else{const half=collider.halfHeight()??0,radius=collider.radius()??0;for(const sign of [-1,1]){this.point.set(0,sign*half,0).applyQuaternion(rotation).add(position);this.partBox.expandByPoint(this.point);}this.partBox.expandByScalar(radius);}
    cached.box.union(this.partBox);
   }}else for(const {mesh,index}of cached.samples){mesh.getVertexPosition(index,this.point).applyMatrix4(mesh.matrixWorld);cached.box.expandByPoint(this.point);}
   // A small proactive margin prevents the baked path from entering a neighbor
   // before the next pose update. Keep the initial side, as for static solids.
   cached.box.expandByScalar(.08);this.peerBoxes.push(cached.box);
  }
  for(const model of this.peerCache.keys())if(!seen.has(model))this.peerCache.delete(model);
 }
 resolve(surface=null){
  if(this.peers)this.refreshPeers();
  this.minimumClearance=Infinity;this.shift.set(0,0,0);if(!this.boxes.length&&!this.peerBoxes.length&&!this.peerOffset.lengthSq())return this.shift;
  this.bounds.makeEmpty();let offset=0;for(const {mesh,index}of this.samples){mesh.getVertexPosition(index,this.point).applyMatrix4(mesh.matrixWorld);this.bounds.expandByPoint(this.point);if(surface){this.positions[offset++]=this.point.x;this.positions[offset++]=this.point.y;this.positions[offset++]=this.point.z;}}
  // Include the contact skin in broad-phase overlap, not just separation.
  // Sparse support samples can miss small features between extrema.
  this.bounds.expandByScalar(.015);
  if(this.peers){this.bounds.translate(this.peerOffset);this.shift.copy(this.peerOffset);}
  const b=this.bounds,r=this.reference;
  for(let pass=0;pass<4;pass++)for(const solid of [...this.peerBoxes,...this.boxes]){
   if(solid.active?.()===false||!b.intersectsBox(solid))continue;
   const x=r.x<(solid.min.x+solid.max.x)/2?solid.min.x-b.max.x-.015:solid.max.x-b.min.x+.015;
   const z=r.z<(solid.min.z+solid.max.z)/2?solid.min.z-b.max.z-.015:solid.max.z-b.min.z+.015;
   // Prefer a face that the initial hip was already outside.
   const outsideX=r.x<=solid.min.x||r.x>=solid.max.x,outsideZ=r.z<=solid.min.z||r.z>=solid.max.z;
   this.point.set((outsideX&&!outsideZ||outsideX===outsideZ&&Math.abs(x)<=Math.abs(z))?x:0,0,(outsideZ&&!outsideX||outsideX===outsideZ&&Math.abs(z)<Math.abs(x))?z:0);
   b.translate(this.point);this.shift.add(this.point);
  }
  this.unresolved=0;for(const solid of [...this.peerBoxes,...this.boxes])if(solid.active?.()!==false&&b.intersectsBox(solid))this.unresolved++;
  if(this.unresolved&&this.peerBoxes.length){
   b.translate(this.point.copy(this.shift).negate());
   const correction=clearBoxOffset(b,[...this.peerBoxes,...this.boxes],this.shift,.015,this.boxes);
   if(correction){b.translate(correction);this.unresolved=0;}
  }
  if(this.peers)this.peerOffset.copy(this.shift);
  if(this.shift.lengthSq()){const hip=this.binding.bones.get('Hips');hip.getWorldPosition(this.point).add(this.shift);hip.position.copy(hip.parent.worldToLocal(this.point));this.binding.model.updateMatrixWorld(true);}
  else if(surface)for(let i=0;i<offset;i+=3)this.minimumClearance=Math.min(this.minimumClearance,this.positions[i+1]-surface(this.positions[i],this.positions[i+2]));
  return this.shift;
 }
}
