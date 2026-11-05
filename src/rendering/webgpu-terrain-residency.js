import * as THREE from 'three';
import {nativeTerrainBuffer} from './terrain-geometry.js';
import {nativeWaterBuffer} from './water-geometry.js';
import {createTerrainAdmission} from './webgpu-terrain-admission.js';
import {SpatialSurfaceView} from '../world/wild-engine/spatial-surface-view.js';

// Worker-owned render residency for the existing Wild Engine chunk payload.
// The caller owns the material and ensures it is ready before publication.
// Revision/tombstone ordering prevents old chunk messages from resurrecting an
// evicted or superseded surface. This module does not generate world state.
export function createWebGpuTerrainResidency({scene,material,waterMaterial=null,materialFactory=null,onRevision=null,pipelineAdmission=null,onAdmissionError=()=>{},onPublished=()=>{}}={}){
 if(typeof document!=='undefined')throw Error('WebGPU terrain residency requires a Worker');
 if(!scene?.isScene||!material?.isMaterial||waterMaterial!==null&&!waterMaterial.isMaterial||materialFactory!==null&&typeof materialFactory!=='function'||onRevision!==null&&typeof onRevision!=='function'||pipelineAdmission!==null&&typeof pipelineAdmission.prepare!=='function'||typeof onAdmissionError!=='function'||typeof onPublished!=='function')throw TypeError('Terrain residency requires a scene and material');
 const entries=new Map(),waters=new Map(),versions=new Map(),epochs=new Map(),surfaceView=new SpatialSurfaceView(),publisher=pipelineAdmission?createTerrainAdmission({scene,admission:pipelineAdmission,onError:onAdmissionError,onPublished}):null;let closed=false;
 function releaseWater(key){const water=waters.get(key);if(water){scene.remove(water);water.geometry.dispose();waters.delete(key);}}
 const check=(cx,cz,revision)=>{
  if(closed)throw Error('Terrain residency disposed');
  if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz)||!Number.isSafeInteger(revision)||revision<0)throw TypeError('Invalid terrain identity');
  return `${cx},${cz}`;
 };
 function replace(payload,revision,epoch=null){
  const key=check(payload?.cx,payload?.cz,revision),previous=versions.get(key);
  if(previous!==undefined&&revision<=previous)return false;
  if(epoch!==null&&(typeof epoch!=='string'||!epoch))throw TypeError('Invalid terrain epoch');
  const terrain=payload?.terrain;
  if(payload.authority!=='spatial-wasm'||!(terrain?.positions instanceof Float32Array)||!(terrain.colors instanceof Float32Array)||!(terrain.indices instanceof Uint16Array)||terrain.positions.length!==49*49*3||terrain.colors.length!==terrain.positions.length||terrain.indices.length!==48*48*6)throw TypeError('Invalid Wild Engine terrain payload');
  if(payload.water!==undefined&&(!(payload.water instanceof Float32Array)||payload.water.length%9!==0||payload.water.length&&!waterMaterial))throw TypeError('Invalid Wild Engine water payload');
  let geometry,mesh,waterGeometry,water,chunkMaterial;
  try{geometry=nativeTerrainBuffer(terrain);chunkMaterial=materialFactory?.(payload)??material;if(!chunkMaterial?.isMaterial)throw TypeError('Invalid chunk material');mesh=new THREE.Mesh(geometry,chunkMaterial);mesh.position.set(payload.cx*48,0,payload.cz*48);mesh.receiveShadow=true;mesh.userData.ground=true;mesh.userData.spatialAuthority=payload.authority;mesh.userData.spatialTerrainRevision=revision;mesh.userData.checkpointGroundMask=payload.groundMask?.slice()??null;if(payload.water?.length){waterGeometry=nativeWaterBuffer(payload.water);water=new THREE.Mesh(waterGeometry,waterMaterial);water.position.copy(mesh.position);water.receiveShadow=true;water.userData.nativeFluid='chunk';water.userData.spatialTerrainRevision=revision;}if(!publisher){scene.add(mesh);if(water)scene.add(water);}}
  catch(error){if(mesh?.parent===scene)scene.remove(mesh);if(water?.parent===scene)scene.remove(water);geometry?.dispose();if(chunkMaterial&&chunkMaterial!==material)chunkMaterial.dispose();waterGeometry?.dispose();throw error;}
  const old=entries.get(key);entries.set(key,mesh);versions.set(key,revision);epochs.set(key,epoch);surfaceView.install(payload);
  if(publisher){const group=new THREE.Group();group.add(mesh);if(water)group.add(water);publisher.publish(key,group,water?[mesh,water]:[mesh],()=>{geometry.dispose();if(chunkMaterial!==material)chunkMaterial.dispose();waterGeometry?.dispose();});waters.delete(key);}else{if(old){scene.remove(old);old.geometry.dispose();if(old.material!==material)old.material.dispose();}releaseWater(key);}if(water)waters.set(key,water);onRevision?.({cx:payload.cx,cz:payload.cz,revision,epoch,kind:'replace'});return true;
 }
 function remove(cx,cz,revision){
  const key=check(cx,cz,revision),previous=versions.get(key);if(previous!==undefined&&revision<=previous)return false;
  versions.set(key,revision);epochs.delete(key);const old=entries.get(key);if(old){entries.delete(key);surfaceView.remove(cx,cz);if(!publisher){scene.remove(old);old.geometry.dispose();if(old.material!==material)old.material.dispose();}}if(publisher){publisher.remove(key);waters.delete(key);}else releaseWater(key);onRevision?.({cx,cz,revision,epoch:null,kind:'remove'});return true;
 }
 function dispose(){if(closed)return;closed=true;if(publisher){publisher.dispose();waters.clear();}else{for(const mesh of entries.values()){scene.remove(mesh);mesh.geometry.dispose();if(mesh.material!==material)mesh.material.dispose();}for(const key of waters.keys())releaseWater(key);}entries.clear();versions.clear();epochs.clear();surfaceView.clear();}
 return {replace,visualReady(){return !closed&&(!publisher||publisher.isReady());},visualRayReady(ray,limit){return !closed&&(!publisher||publisher.isRayReady(ray,limit));},matchesCheckpoint(payload,metadata){const key=`${payload?.cx},${payload?.cz}`,mesh=entries.get(key),equal=(a,b)=>a==null&&b==null||!!a&&!!b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));if(!mesh||versions.get(key)!==metadata?.revision||epochs.get(key)!==metadata?.epoch)return false;return equal(mesh.geometry.attributes.position.array,payload.terrain.positions)&&equal(mesh.geometry.attributes.color.array,payload.terrain.colors)&&equal(mesh.geometry.index.array,payload.terrain.indices)&&equal(waters.get(key)?.geometry.attributes.position.array??null,payload.water?.length?payload.water:null)&&equal(mesh.userData.checkpointGroundMask,payload.groundMask??null);},matchesManifest(manifest){if(closed||!manifest||typeof manifest.epoch!=='string'||!manifest.epoch||!Array.isArray(manifest.chunks)||!manifest.chunks.length)return false;const seen=new Set();for(const chunk of manifest.chunks){if(!Number.isSafeInteger(chunk?.cx)||!Number.isSafeInteger(chunk.cz)||!Number.isSafeInteger(chunk.revision)||chunk.revision<1)return false;const key=`${chunk.cx},${chunk.cz}`;if(seen.has(key)||!entries.has(key)||publisher&&!publisher.isVisible(key,entries.get(key))||epochs.get(key)!==manifest.epoch||versions.get(key)!==chunk.revision)return false;seen.add(key);}return true;},restoreCheckpoint(payload,metadata=null){if(metadata)return replace(payload,metadata.revision,metadata.epoch);const key=check(payload?.cx,payload?.cz,0),old=versions.get(key)??0;const changed=replace(payload,old+1);versions.set(key,old);epochs.delete(key);return changed;},remove,dispose,surface(x,z){if(!Number.isFinite(x)||!Number.isFinite(z)||!entries.has(`${Math.floor((x+24)/48)},${Math.floor((z+24)/48)}`))return null;return surfaceView.surface(x,z)??null;},get groundMaterialCount(){let count=0;for(const mesh of entries.values())if(mesh.material!==material)count++;return count;},get size(){return entries.size;},get waterSize(){return waters.size;},get(cx,cz){return entries.get(`${cx},${cz}`)??null;},getWater(cx,cz){return waters.get(`${cx},${cz}`)??null;}};
}
