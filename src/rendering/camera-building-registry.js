import * as THREE from 'three';
import {CameraVolumeIndex} from './camera-volume-index.js';
import {cameraModelVolume} from './camera-model-volume.js';
function updateSharedParent(node,parents){
 if(!node||parents.has(node))return;
 updateSharedParent(node.parent,parents);node.updateWorldMatrix(false,false);parents.add(node);
}
export class CameraBuildingRegistry {
 constructor({centerMargin=null,villageMargin=null,...indexOptions}={}){
  this.index=new CameraVolumeIndex(indexOptions);this.roots=new Map();this.centerMargin=centerMargin;this.villageMargin=villageMargin;this.revisions=0;
 }
 remove(id){const record=this.roots.get(id);if(!record)return;for(const key of record.ids)this.index.delete(key);this.roots.delete(id);}
 sync(objects,entities){
  const alive=new Set();let parents;
  for(const entity of entities){
   const root=objects.get(entity.id);if(!root)continue;alive.add(entity.id);if(root.parent)updateSharedParent(root.parent,parents??=new Set());root.updateWorldMatrix(false,false);
   const native=root.userData.nativeBuilding,state=native?(root.damage>=.9998?'ash':root.damage>.79?'fall':'still'):'village',ash=native&&root.damage>.23;
   const old=this.roots.get(entity.id),matrix=root.matrixWorld.elements;
   if(old?.root===root&&old.state===state&&old.ash===ash&&old.matrix.every((x,i)=>x===matrix[i]))continue;
   this.remove(entity.id);root.updateWorldMatrix(false,true);const ids=[];
   const add=(id,bounds,matrix,margin)=>{
    // Large roofs need a visual buffer as well as geometric non-penetration.
    // Derive it once from this model's world size; small objects keep their own
    // tighter registries and there is no universal camera zoom restriction.
    if(margin===null){const size=bounds.getSize(new THREE.Vector3()),scale=new THREE.Vector3().setFromMatrixScale(matrix),span=Math.max(size.x*Math.abs(scale.x),size.z*Math.abs(scale.z));margin={horizontal:Math.max(1.2,Math.min(3,span*.1)),vertical:Math.max(2,Math.min(6,span*.2))};}
    this.index.set(id,cameraModelVolume(id,bounds,matrix,margin));ids.push(id);
   };
   if(native){
    const bounds=root.template.culling.boxes[state].clone();if(ash&&state!=='ash')bounds.union(root.template.culling.boxes.ash);
    add(entity.id+':center',bounds,root.matrixWorld,this.centerMargin);
   }else root.traverse(mesh=>{
    const unit=mesh.userData.unit;if(!mesh.isMesh||!unit)return;
    add(entity.id+':'+mesh.id,new THREE.Box3(new THREE.Vector3(...unit.min),new THREE.Vector3(...unit.max)),mesh.matrixWorld,this.villageMargin);
   });
   this.roots.set(entity.id,{root,state,ash,matrix:matrix.slice(),ids});this.revisions++;
  }
  for(const id of this.roots.keys())if(!alive.has(id))this.remove(id);
 }
 clear(){this.index.clear();this.roots.clear();}
}
