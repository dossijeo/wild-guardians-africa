import * as THREE from 'three';
import {applyMaterialStudy as applySky} from './qa-canyon-sky.js';
// QA resident terrain only: normals may change, positions and colors must not.
export function applyMaterialStudy(world){
 const audit=applySky(world);if(audit.control)return audit;
 world.scene.updateMatrixWorld(true);const groups=new Map(),entries=[];let changed=0;
 for(const mesh of world.terrainMeshes){
  const original=mesh.geometry,geometry=original.clone(),p=geometry.attributes.position,n=geometry.attributes.normal;
  mesh.geometry=geometry;original.dispose();const nm=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld),inverse=nm.clone().invert();
  for(let i=0;i<p.count;i++){
   const normal=new THREE.Vector3().fromBufferAttribute(n,i).applyMatrix3(nm).normalize();if(normal.y>=.74)continue;
   const pos=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),key=pos.toArray().map(v=>Math.round(v*10000)).join(',');
   const entry={n,i,normal,inverse};if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry);
  }
  entries.push({original,geometry});
 }
 for(const group of groups.values())for(const e of group){
  const sum=new THREE.Vector3();for(const other of group)if(e.normal.dot(other.normal)>.75)sum.add(other.normal);
  sum.normalize();if(sum.distanceToSquared(e.normal)>1e-10)changed++;sum.applyMatrix3(e.inverse).normalize();e.n.setXYZ(e.i,sum.x,sum.y,sum.z);
 }
 for(const {original,geometry} of entries){
  const a=original.attributes.position,b=geometry.attributes.position,c=original.attributes.color,d=geometry.attributes.color;
  for(let i=0;i<a.count;i++)if(a.getX(i)!==b.getX(i)||a.getY(i)!==b.getY(i)||a.getZ(i)!==b.getZ(i)||c.getX(i)!==d.getX(i)||c.getY(i)!==d.getY(i)||c.getZ(i)!==d.getZ(i))throw Error('Smoothing changed position or color');
  const n=geometry.attributes.normal;if(n.isInterleavedBufferAttribute)n.data.needsUpdate=true;else n.needsUpdate=true;
 }
 return {...audit,scope:'Daytime sky study plus steep resident terrain normal smoothing in day and night',replacedGeometries:entries.length,changedNormalVertices:changed,residentMeshes:entries.length,positionsAndColorsUnchanged:true,limitations:'Resident snapshot only, no streamed-neighbor normals; angle cutoff .75, steep faces only'};
}
