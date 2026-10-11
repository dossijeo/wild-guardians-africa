import * as THREE from 'three';
import {cameraModelVolume} from './camera-model-volume.js';

// Native wall parts supply finite mesh envelopes. Closed gate leaves protect
// the camera; opening leaves retain their actual hinge transforms and passage.
export class CameraWallRegistry{
 constructor(index,{margin={horizontal:.25,vertical:.12}}={}){this.index=index;this.margin=margin;this.roots=new Map();}
 remove(id){for(const key of this.roots.get(id)?.ids??[])this.index.delete(key);this.roots.delete(id);}
 sync(objects,entities){
  const alive=new Set();
  for(const entity of entities){
   const root=objects.get(entity.id);if(!root?.userData.nativeWall)continue;alive.add(entity.id);
   const signature=[root.stageKey,root.gateOpen,root.visual,root.position.x,root.position.y,root.position.z,root.rotation.y,root.scale.x,root.scale.y,root.scale.z].join('|');
   if(this.roots.get(entity.id)?.signature===signature)continue;
   this.remove(entity.id);root.updateWorldMatrix(true,true);const ids=[];
   for(const {mesh} of root.parts){
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    const bounds=mesh.geometry.boundingBox;if(bounds.isEmpty())continue;
    const id='camera-wall:'+entity.id+':'+mesh.id;
    this.index.set(id,cameraModelVolume(id,bounds,mesh.matrixWorld,this.margin));ids.push(id);
   }
   this.roots.set(entity.id,{signature,ids});
  }
  for(const id of this.roots.keys())if(!alive.has(id))this.remove(id);
 }
 clear(){for(const id of [...this.roots.keys()])this.remove(id);}
}
