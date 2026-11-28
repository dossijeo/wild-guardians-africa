import {createWebGpuResourceRegistry} from './webgpu-resource-registry.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {prepareAnimalClips} from './animal-actions.js';
import {openProgressiveWebGpuCharacter} from './webgpu-progressive-character.js';

// The Worker owns one source, geometry, materials and textures per species.
// Each actor gets its own skeleton and mixer; the source stays until disposal.
export function createWebGpuAnimalBank({renderer,packages={},onTextured=()=>{},onTextureError=()=>{},loadAsset=null,materialStyle=null,onSelectableChange=()=>{},maxIdleBytes=0,idleBudget=null,characterData=null,resourceRegistry=null}={}){
 if(characterData!==null&&typeof characterData?.open!=='function'||!renderer?.backend?.isWebGPUBackend||!packages||typeof packages!=='object'||typeof onTextured!=='function'||typeof onTextureError!=='function'||typeof onSelectableChange!=='function'||materialStyle!==null&&(typeof materialStyle.configure!=='function'||typeof materialStyle.convert!=='function'))throw TypeError('Invalid animal bank');

 function disposeOriginal(gltf){const resources=new Set(),images=new Set();gltf.scene.traverse(object=>{if(!object.isMesh)return;resources.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){resources.add(material);for(const value of Object.values(material))if(value?.isTexture){resources.add(value);if(typeof value.source?.data?.close==='function')images.add(value.source.data);}}});for(const resource of resources)resource.dispose();for(const image of images)image.close();}
 async function load(species,signal){
  const spec=ANIMAL_ACTIONS.animals[species];if(!spec)throw Error('Unknown species '+species);
  if(loadAsset)return loadAsset(species,signal);
  if(packages[species]){let textured=false;const progressive=await openProgressiveWebGpuCharacter({renderer,...(characterData?{openStream:(url,options)=>characterData.open(url,options)}:{}),packageUrl:packages[species],species,signal:signal,onSelectableChange,onTextured:()=>{textured=true;onTextured(species);},onError:error=>onTextureError(species,error),...(materialStyle?{configureMaterial:(material,object)=>materialStyle.configure(material,object),...(typeof materialStyle.prepareObject==='function'&&typeof materialStyle.materialVariant==='function'?{shareCompatibleMaterials:true,prepareObject:object=>materialStyle.prepareObject(object),materialVariant:object=>materialStyle.materialVariant(object)}:{})}:{shareCompatibleMaterials:true})});progressive.start();return {scene:progressive.preview.scene,clips:prepareAnimalClips(progressive.preview.animations),get retentionReady(){return textured;},tick:now=>progressive.tick(now),dispose:()=>progressive.dispose()};}
  const manager=new THREE.LoadingManager(),abort=()=>manager.abort();signal.addEventListener('abort',abort,{once:true});let gltf;
  try{gltf=await new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).loadAsync(spec.url);}finally{signal.removeEventListener('abort',abort);}
  let converted;try{converted=materialStyle?.convert(gltf.scene);}catch(error){disposeOriginal(gltf);throw error;}
  return {scene:gltf.scene,clips:prepareAnimalClips(gltf.animations),dispose(){disposeOriginal(gltf);for(const material of converted?.originals??[])material.dispose();}};
 }
 const registry=resourceRegistry??createWebGpuResourceRegistry({maxIdleBytes,idleBudget}),bank=registry.createBank({namespace:'animal',load,validate:asset=>asset?.scene?.isObject3D&&Array.isArray(asset.clips)&&typeof asset.dispose==='function'});
 return {async acquire(species){const lease=await bank.acquire(species),asset=lease.asset;let model;try{model=clone(asset.scene);model.traverse(object=>{if(object.isMesh)object.castShadow=object.receiveShadow=true;});}catch(error){lease.release();throw error;}let released=false;return {model,clips:asset.clips,release(){if(released)return;released=true;const skeletons=new Set();model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const skeleton of skeletons)skeleton.dispose();lease.release();}};},tick(now){bank.forEachReady(asset=>asset.tick?.(now));},status(){const value=bank.status();return {closed:value.closed,idle:value.idle,species:value.entries.map(item=>({species:item.key,ready:item.ready,refs:item.refs,pending:item.pending}))};},dispose(){bank.dispose();}};
}
