import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {animalPose,prepareAnimalClips} from './animal-actions.js';

// Experimental single confirmed animal, owned entirely by the render Worker.
// This does not implement combat physics, expressions, or production grounding.
export async function createWebGpuConfirmedAnimal({scene,residency,state,actorId,signal}={}){
 if(!scene?.isScene||!residency||!state||typeof actorId!=='string'||!actorId||signal&&typeof signal.addEventListener!=='function')throw TypeError('Invalid confirmed animal');
 const animal=state.raid?.animals.find(item=>item.id===actorId),spec=animal&&ANIMAL_ACTIONS.animals[animal.species];if(!spec)throw Error('Confirmed animal unavailable');
 if(signal?.aborted)throw new DOMException('Character load cancelled','AbortError');const manager=new THREE.LoadingManager(),abort=()=>manager.abort();signal?.addEventListener('abort',abort,{once:true});let gltf;
 try{gltf=await new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).loadAsync(spec.url);}finally{signal?.removeEventListener('abort',abort);}
 const model=gltf.scene,clips=prepareAnimalClips(gltf.animations),mixer=new THREE.AnimationMixer(model),root=new THREE.Group(),ray=new THREE.Raycaster(),resources=new Set();let action=null,key=null,closed=false;
 model.traverse(object=>{if(!object.isMesh)return;resources.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){resources.add(material);for(const value of Object.values(material))if(value?.isTexture)resources.add(value);}});
 if(signal?.aborted){for(const resource of resources)resource.dispose();throw new DOMException('Character load cancelled','AbortError');}
 model.scale.setScalar(spec.presentation.scale);root.add(model);scene.add(root);
 function update(){
  if(closed)return;const entity=state.raid?.animals.find(item=>item.id===actorId);if(!entity||entity.status==='gone'){root.visible=false;return;}if(entity.species!==animal.species)throw Error('Confirmed animal species changed');
  root.visible=true;const mesh=residency.get(Math.floor((entity.x+24)/48),Math.floor((entity.z+24)/48));let height=0;
  if(mesh){mesh.updateWorldMatrix(true,false);ray.set(new THREE.Vector3(entity.x,1000,entity.z),new THREE.Vector3(0,-1,0));height=ray.intersectObject(mesh,false)[0]?.point.y??0;}
  root.position.set(entity.x,height,entity.z);root.rotation.y=entity.downHeading!==undefined&&(entity.fallRemaining>0||entity.recovery)?entity.downHeading:entity.path?.length?Math.atan2(entity.path[0].x-entity.x,entity.path[0].z-entity.z):entity.heading??0;
  const pose=animalPose(entity,state.elapsed),clip=clips.find(item=>item.name===pose.name);if(!clip)throw Error('Missing confirmed animal clip '+pose.name);
  if(key!==pose.key){action?.stop();action=mixer.clipAction(clip);action.reset().setLoop(pose.loop?THREE.LoopRepeat:THREE.LoopOnce,pose.loop?Infinity:1).play();action.paused=true;action.clampWhenFinished=true;key=pose.key;}
  action.time=pose.time;mixer.update(0);
 }
 try{update();}catch(error){scene.remove(root);for(const resource of resources)resource.dispose();throw error;}
 return {root,update,dispose(){if(closed)return;closed=true;scene.remove(root);mixer.stopAllAction();mixer.uncacheRoot(model);for(const resource of resources)resource.dispose();}};
}
