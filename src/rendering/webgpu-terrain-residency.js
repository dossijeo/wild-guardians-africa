import * as THREE from 'three';
import {nativeTerrainBuffer} from './terrain-geometry.js';
import {nativeWaterBuffer} from './water-geometry.js';

// Worker-owned render residency for the existing Wild Engine chunk payload.
// The caller owns the material and ensures it is ready before publication.
// Revision/tombstone ordering prevents old chunk messages from resurrecting an
// evicted or superseded surface. This module does not generate world state.
export function createWebGpuTerrainResidency({scene,material,waterMaterial=null}={}){
 if(typeof document!=='undefined')throw Error('WebGPU terrain residency requires a Worker');
 if(!scene?.isScene||!material?.isMaterial||waterMaterial!==null&&!waterMaterial.isMaterial)throw TypeError('Terrain residency requires a scene and material');
 const entries=new Map(),waters=new Map(),versions=new Map();let closed=false;
 function releaseWater(key){const water=waters.get(key);if(water){scene.remove(water);water.geometry.dispose();waters.delete(key);}}
 const check=(cx,cz,revision)=>{
  if(closed)throw Error('Terrain residency disposed');
  if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz)||!Number.isSafeInteger(revision)||revision<0)throw TypeError('Invalid terrain identity');
  return `${cx},${cz}`;
 };
 function replace(payload,revision){
  const key=check(payload?.cx,payload?.cz,revision),previous=versions.get(key);
  if(previous!==undefined&&revision<=previous)return false;
  const terrain=payload?.terrain;
  if(payload.authority!=='spatial-wasm'||!(terrain?.positions instanceof Float32Array)||!(terrain.colors instanceof Float32Array)||!(terrain.indices instanceof Uint16Array)||terrain.positions.length!==49*49*3||terrain.colors.length!==terrain.positions.length||terrain.indices.length!==48*48*6)throw TypeError('Invalid Wild Engine terrain payload');
  if(payload.water!==undefined&&(!(payload.water instanceof Float32Array)||payload.water.length%9!==0||payload.water.length&&!waterMaterial))throw TypeError('Invalid Wild Engine water payload');
  let geometry,mesh,waterGeometry,water;
  try{geometry=nativeTerrainBuffer(terrain);mesh=new THREE.Mesh(geometry,material);mesh.position.set(payload.cx*48,0,payload.cz*48);mesh.receiveShadow=true;mesh.userData.ground=true;mesh.userData.spatialAuthority=payload.authority;mesh.userData.spatialTerrainRevision=revision;if(payload.water?.length){waterGeometry=nativeWaterBuffer(payload.water);water=new THREE.Mesh(waterGeometry,waterMaterial);water.position.copy(mesh.position);water.userData.nativeFluid='chunk';water.userData.spatialTerrainRevision=revision;}scene.add(mesh);if(water)scene.add(water);}
  catch(error){if(mesh?.parent===scene)scene.remove(mesh);if(water?.parent===scene)scene.remove(water);geometry?.dispose();waterGeometry?.dispose();throw error;}
  const old=entries.get(key);entries.set(key,mesh);versions.set(key,revision);
  if(old){scene.remove(old);old.geometry.dispose();}releaseWater(key);if(water)waters.set(key,water);return true;
 }
 function remove(cx,cz,revision){
  const key=check(cx,cz,revision),previous=versions.get(key);if(previous!==undefined&&revision<=previous)return false;
  versions.set(key,revision);const old=entries.get(key);if(old){entries.delete(key);scene.remove(old);old.geometry.dispose();}releaseWater(key);return true;
 }
 function dispose(){if(closed)return;closed=true;for(const mesh of entries.values()){scene.remove(mesh);mesh.geometry.dispose();}for(const key of waters.keys())releaseWater(key);entries.clear();versions.clear();}
 return {replace,remove,dispose,get size(){return entries.size;},get waterSize(){return waters.size;},get(cx,cz){return entries.get(`${cx},${cz}`)??null;},getWater(cx,cz){return waters.get(`${cx},${cz}`)??null;}};
}
