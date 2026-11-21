import {Box3,BufferGeometry,Group,Matrix4,Mesh,Vector3} from 'three';
import {centerCulture} from '../world/centers.js';

// Experimental handoff of the geometry bounds used by Box3.setFromObject.
// Captured once from an initialized scene; the worker owns subsequent transforms.
export function captureStructureTemplate(root){
 if(!root?.userData?.nativeBuilding)throw TypeError('Expected a native building');
 root.updateWorldMatrix(true,true);
 const inverse=new Matrix4().copy(root.matrixWorld).invert(),parts=[];
 root.traverse(node=>{
  if(!node.geometry)return;
  if(node.isSkinnedMesh||node.isInstancedMesh)throw Error('Unsupported dynamic structure geometry');
  const geometry=node.geometry;if(!geometry.boundingBox)geometry.computeBoundingBox();
  const box=geometry.boundingBox;if(!box||box.isEmpty())return;
  parts.push({min:box.min.toArray(),max:box.max.toArray(),matrix:new Matrix4().multiplyMatrices(inverse,node.matrixWorld).toArray()});
 });
 if(!parts.length)throw Error('Empty structure collision template');
 return {version:1,scale:root.scale.toArray(),parts};
}

export function createWorkerStructureObjects(state,nav,templates){
 if(!templates||typeof templates!=='object'||Array.isArray(templates))throw TypeError('Invalid structure templates');
 const geometries=[],objects=new Map(),known=new Map();
 function instantiate(template){
  if(template?.version!==1||!Array.isArray(template.scale)||template.scale.length!==3||template.scale.some(v=>!Number.isFinite(v)||v<=0)||!Array.isArray(template.parts)||!template.parts.length)throw TypeError('Invalid structure template');
  const root=new Group();root.scale.fromArray(template.scale);
  for(const part of template.parts){
   if(![part.min,part.max,part.matrix].every((a,i)=>Array.isArray(a)&&a.length===(i===2?16:3)&&a.every(Number.isFinite))||part.min.some((v,i)=>v>part.max[i]))throw TypeError('Invalid structure template part');
   const geometry=new BufferGeometry();geometry.boundingBox=new Box3(new Vector3().fromArray(part.min),new Vector3().fromArray(part.max));geometries.push(geometry);
   const mesh=new Mesh(geometry);mesh.matrix.fromArray(part.matrix);mesh.matrixAutoUpdate=false;root.add(mesh);
  }
  return root;
 }
 return {
  sync(animal){
   for(const structure of state.structures){
    if(structure.status!=='intact'||structure.kind==='wall'||Math.hypot(structure.x-animal.x,structure.z-animal.z)>10)continue;
    if(structure.kind!=='center')throw Error('Worker physics lacks nearby structure geometry');
    const culture=centerCulture(structure,state),template=templates[culture];
    if(!template)throw Error('Worker physics lacks nearby structure geometry');
    const y=nav.field.surface(structure.x,structure.z)+.025,signature=JSON.stringify([culture,structure.x,y,structure.z,structure.yaw??0]);
    let object=objects.get(structure.id);
    if(!object){object=instantiate(template);objects.set(structure.id,object);known.set(structure.id,signature);}
    if(known.get(structure.id)!==signature)throw Error('Worker structure geometry changed during physics');
    object.position.set(structure.x,y,structure.z);object.rotation.y=structure.yaw??0;object.updateMatrixWorld(true);
   }
  },objects,
  dispose(){for(const geometry of geometries)geometry.dispose();for(const object of objects.values()){object.traverse(node=>node.material?.dispose());object.clear();}objects.clear();},
 };
}
