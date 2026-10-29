import {sampleMeshSurfaceCrossings} from './guardian-skin-crossings.js';
import {Box3,Vector3} from 'three';
// Diagnostic only: pairwise articulated collider distances, sampled at 10 Hz.
// Excludes baked actors (no Rapier colliders); never use this as skin clearance.
export function sampleRecoveryPeerContacts(manager,includeFalling=false){
 const entries=[...manager.entries.values()],pairs=[];
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const a=entries[i],b=entries[j];if(!includeFalling&&!a.recovery&&!b.recovery)continue;
  let minimum=0,contacts=0,parts=null;
  for(let ai=0;ai<a.actor.parts.length;ai++)for(let bi=0;bi<b.actor.parts.length;bi++){
   const contact=a.actor.parts[ai].body.collider(0).contactCollider(b.actor.parts[bi].body.collider(0),0);
   if(!contact||contact.distance>=0)continue;
   contacts++;if(contact.distance<minimum){minimum=contact.distance;parts=[ai,bi];}
  }
  pairs.push({a:a.animal.id,b:b.animal.id,recovering:[!!a.recovery,!!b.recovery],contacts,minimum,parts});
 }
 return pairs;
}

const meshCache=new WeakMap(),point=new Vector3();
// All deformed mesh vertices, not just contact samples. A disjoint AABB proves
// separation; an intersecting AABB is only a candidate, never a penetration.
export function sampleRecoverySkinBounds(manager,includeFalling=false,surfaceCrossings=false){
 const entries=[...manager.entries.values(),...(manager.baked?.entries.values()??[])];
 const bounds=entries.map(e=>{
  let meshes=meshCache.get(e.data.model);
  if(!meshes){meshes=[];e.data.model.traverse(o=>{if(o.isMesh&&o.geometry?.attributes.position)meshes.push(o);});meshCache.set(e.data.model,meshes);}
  const box=new Box3();
  for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++){
   mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);box.expandByPoint(point);
  }
  return box;
 });
 const pairs=[];
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const a=entries[i],b=entries[j];if(!includeFalling&&!a.recovery&&!b.recovery)continue;
  const x=bounds[i],y=bounds[j],overlap=['x','y','z'].map(axis=>Math.min(x.max[axis],y.max[axis])-Math.max(x.min[axis],y.min[axis]));
  const pair={a:a.animal.id,b:b.animal.id,modes:[a.actor?'physical':'baked',b.actor?'physical':'baked'],overlap,candidate:overlap.every(v=>v>0)};
  if(pair.candidate&&surfaceCrossings)pair.surfaceCrossings=sampleMeshSurfaceCrossings(meshCache.get(a.data.model),meshCache.get(b.data.model),8,x.clone().intersect(y));
  if(pair.candidate&&!!a.actor!==!!b.actor){
   const physical=a.actor?a:b,baked=a.actor?b:a,box=a.actor?x:y;
   let inside=0;const byPart={},examples=[];
   for(const mesh of meshCache.get(baked.data.model))for(let k=0;k<mesh.geometry.attributes.position.count;k++){
    mesh.getVertexPosition(k,point).applyMatrix4(mesh.matrixWorld);if(!box.containsPoint(point))continue;
    for(let part=0;part<(physical.actor.parts?.length??0);part++)if(physical.actor.parts[part].body.collider(0).containsPoint(point)){
     inside++;byPart[part]=(byPart[part]??0)+1;
     if(examples.length<8)examples.push({mesh:mesh.name,index:k,part,position:point.toArray()});break;
    }
   }
   pair.bakedVerticesInsidePhysical={inside,byPart,examples,unresolved:baked.fall?.solidContacts?.unresolved??null};
  }
  pairs.push(pair);
 }
 return pairs;
}

export function sampleRecoveryPositions(manager){
 return [...manager.entries.values(),...(manager.baked?.entries.values()??[])].map(e=>({
  id:e.animal.id,mode:e.actor?'physical':'baked',phase:e.animal.magicDown?.phase,
  hip:e.binding.bones.get('Hips').getWorldPosition(new Vector3()).toArray(),
  correction:e.recovery?.horizontalCorrection?.toArray()??e.fall?.solidContacts?.shift.toArray()??null,
  recoveryAge:e.recovery?e.recoveryAge:null,lift:e.recovery?.lift??e.fall?.lift??null,entryClearance:e.recovery?.entryClearance??null,
 }));
}
