import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {prepareAnimalClips} from './animal-actions.js';
import {openProgressiveWebGpuCharacter} from './webgpu-progressive-character.js';

// The Worker owns one source, geometry, materials and textures per species.
// Each actor gets its own skeleton and mixer; the source stays until disposal.
export function createWebGpuAnimalBank({renderer,packages={},onTextured=()=>{},onTextureError=()=>{},loadAsset=null}={}){
 if(!renderer?.backend?.isWebGPUBackend||!packages||typeof packages!=='object'||typeof onTextured!=='function'||typeof onTextureError!=='function')throw TypeError('Invalid animal bank');
 const entries=new Map(),controller=new AbortController();let closed=false;
 function disposeOriginal(gltf){const resources=new Set(),images=new Set();gltf.scene.traverse(object=>{if(!object.isMesh)return;resources.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){resources.add(material);for(const value of Object.values(material))if(value?.isTexture){resources.add(value);if(typeof value.source?.data?.close==='function')images.add(value.source.data);}}});for(const resource of resources)resource.dispose();for(const image of images)image.close();}
 async function load(species){
  const spec=ANIMAL_ACTIONS.animals[species];if(!spec)throw Error('Unknown species '+species);
  if(loadAsset)return loadAsset(species,controller.signal);
  if(packages[species]){const progressive=await openProgressiveWebGpuCharacter({renderer,packageUrl:packages[species],species,signal:controller.signal,onTextured:()=>onTextured(species),onError:error=>onTextureError(species,error)});progressive.start();return {scene:progressive.preview.scene,clips:prepareAnimalClips(progressive.preview.animations),tick:now=>progressive.tick(now),dispose:()=>progressive.dispose()};}
  const manager=new THREE.LoadingManager(),abort=()=>manager.abort();controller.signal.addEventListener('abort',abort,{once:true});let gltf;
  try{gltf=await new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).loadAsync(spec.url);}finally{controller.signal.removeEventListener('abort',abort);}
  return {scene:gltf.scene,clips:prepareAnimalClips(gltf.animations),dispose:()=>disposeOriginal(gltf)};
 }
 function source(species){let entry=entries.get(species);if(!entry){entry={refs:0,pending:0,asset:null,promise:null};entry.promise=load(species).then(asset=>{if(!asset?.scene?.isObject3D||!Array.isArray(asset.clips)||typeof asset.dispose!=='function')throw TypeError('Invalid animal asset');if(closed){asset.dispose();throw new DOMException('Animal bank disposed','AbortError');}entry.asset=asset;return asset;}).catch(error=>{if(entries.get(species)===entry)entries.delete(species);throw error;});entries.set(species,entry);}return entry;}
 function releaseUnused(species,entry){if(!closed&&entry.refs===0&&entry.pending===0&&entry.asset&&entries.get(species)===entry){entries.delete(species);entry.asset.dispose();entry.asset=null;}}
 return {async acquire(species){if(closed)throw Error('Animal bank disposed');const entry=source(species);entry.pending++;let asset,model;try{asset=await entry.promise;if(closed)throw new DOMException('Animal bank disposed','AbortError');model=clone(asset.scene);entry.refs++;}finally{entry.pending--;releaseUnused(species,entry);}let released=false;return {model,clips:asset.clips,release(){if(released)return;released=true;entry.refs--;const skeletons=new Set();model.traverse(object=>{if(object.isSkinnedMesh)skeletons.add(object.skeleton);});for(const skeleton of skeletons)skeleton.dispose();releaseUnused(species,entry);}};},tick(now){if(closed)return;for(const entry of entries.values())entry.asset?.tick?.(now);},status(){return {closed,species:[...entries.entries()].map(([species,entry])=>({species,ready:!!entry.asset,refs:entry.refs,pending:entry.pending}))};},dispose(){if(closed)return;closed=true;controller.abort();for(const entry of entries.values())entry.asset?.dispose();entries.clear();}};
}
