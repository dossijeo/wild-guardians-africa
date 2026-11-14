import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {CharacterLod,prepareCharacterLodAppearance} from './character-lod.js';
import {prepareWorkerMaterials} from './worker-materials.js';

// Temporary drawable rigs. Geometry and source textures remain owned by Assets;
// LOD materials may be retained independently after the instances are removed.
export async function prepareCharacterPreload({assets,staging,animalRigs,workerLibraries,create=fn=>fn(),nextFrame=()=>new Promise(requestAnimationFrame),cancelled=()=>false}){
 const lods=[],workers=[],materials=[];let closed=false;
 const check=()=>{if(cancelled())throw Error('Character preload cancelled');};
 const release=retain=>{if(closed)return;closed=true;for(const lod of lods){if(retain)materials.push(...lod.materials.splice(0));lod.dispose();}for(const model of workers){model.removeFromParent();const skeletons=new Set();model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const skeleton of skeletons)skeleton.dispose();}};
 try{
  const actors=animalRigs.map(rig=>({id:rig.model.userData.beastSpecies,model:rig.model,profile:null}));
  for(const [profile,library] of Object.entries(workerLibraries)){check();await nextFrame();check();const gltf=await assets.model(library.url);check();const model=await create(()=>{const value=clone(gltf.scene);prepareWorkerMaterials(value,profile);value.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}});staging.add(value);return value;});workers.push(model);actors.push({id:profile,profile,model});}
  for(const actor of actors){check();await nextFrame();check();const template=await assets.model('/content/character-lod/'+actor.id+'.glb');check();const lod=await create(()=>new CharacterLod(actor.model,template.scene,{prepareRoot:root=>prepareCharacterLodAppearance(root,actor.id,actor.profile)}));lod.root.visible=true;lod.root.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});lods.push(lod);}
  check();return {actors:actors.length,lods:lods.length,materials,release};
 }catch(error){release(false);throw error;}
}
