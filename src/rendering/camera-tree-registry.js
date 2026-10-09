import * as THREE from 'three';
import {cameraModelVolume} from './camera-model-volume.js';

// Optional camera QA only. Native batches own immutable logical instances and
// source bounds. The caller bumps revision for streaming/suppression changes;
// invalidate a chunk explicitly before editing an existing transform or source.
export class CameraTreeRegistry {
 constructor(index,{minimumSize=4,margin={horizontal:.4,vertical:.2}}={}){
  const h=typeof margin==='number'?margin:margin?.horizontal,v=typeof margin==='number'?margin:margin?.vertical;
  if(!Number.isFinite(minimumSize)||minimumSize<0||![h,v].every(x=>Number.isFinite(x)&&x>=0))throw Error('Invalid tree camera clearance');
  this.index=index;this.minimumSize=minimumSize;this.margin={horizontal:h,vertical:v};this.chunks=new Map();this.revision=null;this.rebuilds=0;
 }
 remove(key){const record=this.chunks.get(key);if(!record)return;for(const id of record.ids)this.index.delete(id);this.chunks.delete(key);}
 invalidate(key){this.remove(key);this.revision=null;}
 sync(chunks,revision){
  if(!Number.isSafeInteger(revision)||revision<0)throw Error('Invalid tree camera revision');
  if(this.revision===revision)return;
  const alive=new Set(),dummy=new THREE.Object3D(),matrix=new THREE.Matrix4();
  for(const [key,group] of chunks){
   alive.add(key);group.updateWorldMatrix(true,false);
   const batches=(group.userData.lodBatches??[]).filter(b=>b.group===0),old=this.chunks.get(key),world=group.matrixWorld.elements;
   if(old?.group===group&&old.matrix.every((x,i)=>x===world[i])&&old.batches.length===batches.length&&batches.every((b,i)=>old.batches[i]===b))continue;
   const volumes=[],ids=new Set();
   for(const batch of batches){
    const geometry=batch.levels[0].geometry;if(!geometry.boundingBox)geometry.computeBoundingBox();
    const bounds=geometry.boundingBox;
    if(bounds.isEmpty()||[...bounds.min.toArray(),...bounds.max.toArray()].some(x=>!Number.isFinite(x)))throw Error('Invalid native tree bounds');
    const size=bounds.getSize(new THREE.Vector3());
    for(const p of batch.instances){
     if(Math.max(size.x*Math.abs(p.sx),size.y*Math.abs(p.sy),size.z*Math.abs(p.sz))<this.minimumSize)continue;
     dummy.position.set(p.x-batch.chunkOrigin[0],p.y,p.z-batch.chunkOrigin[1]);dummy.rotation.y=p.yaw;dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();
     matrix.multiplyMatrices(group.matrixWorld,dummy.matrix);
     const id=`camera-tree:${key}:${p.id}`;if(ids.has(id))throw Error('Duplicate native tree ID');ids.add(id);
     volumes.push(cameraModelVolume(id,bounds,matrix,this.margin));
    }
   }
   // Prepare before retiring the old chunk: malformed source bounds cannot
   // leave a partly installed replacement. No geometry/material ownership.
   this.remove(key);for(const volume of volumes)this.index.set(volume.id,volume);
   this.chunks.set(key,{group,batches,matrix:world.slice(),ids:[...ids]});this.rebuilds++;
  }
  for(const key of this.chunks.keys())if(!alive.has(key))this.remove(key);
  this.revision=revision;
 }
 clear(){for(const key of [...this.chunks.keys()])this.remove(key);this.revision=null;}
}
