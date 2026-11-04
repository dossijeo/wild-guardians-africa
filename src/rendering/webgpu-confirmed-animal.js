import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {animalPose,prepareAnimalClips} from './animal-actions.js';
import {openProgressiveWebGpuCharacter} from './webgpu-progressive-character.js';
import {applyConfirmedAnimalPose,validateConfirmedAnimalPose} from './confirmed-animal-pose.js';
import {createBakedWalkPresentation} from './webgpu-baked-walk.js';

// Experimental single confirmed animal, owned entirely by the render Worker.
// This does not implement combat physics, expressions, or production grounding.
export async function createWebGpuConfirmedAnimal({scene,residency,state,actorId,signal,renderer=null,packageUrl=null,assetBank=null,bakedWalk=null,getPose=()=>null,onTextured=()=>{},onTextureError=()=>{},configureMaterial=()=>{}}={}){
 if(!scene?.isScene||!residency||!state||typeof actorId!=='string'||!actorId||signal&&typeof signal.addEventListener!=='function')throw TypeError('Invalid confirmed animal');
 const animal=state.raid?.animals.find(item=>item.id===actorId),species=animal?.species,spec=animal&&ANIMAL_ACTIONS.animals[species];if(!spec)throw Error('Confirmed animal unavailable');
 if(signal?.aborted)throw new DOMException('Character load cancelled','AbortError');const manager=new THREE.LoadingManager(),abort=()=>manager.abort();signal?.addEventListener('abort',abort,{once:true});let gltf,progressive,shared;
 try{if(assetBank)shared=await assetBank.acquire(species);else if(packageUrl){progressive=await openProgressiveWebGpuCharacter({renderer,packageUrl,species,signal,onTextured,onError:onTextureError,configureMaterial});gltf=progressive.preview;}else gltf=await new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).loadAsync(spec.url);}finally{signal?.removeEventListener('abort',abort);}
 const model=shared?.model??gltf.scene,clips=shared?.clips??prepareAnimalClips(gltf.animations),mixer=new THREE.AnimationMixer(model),root=new THREE.Group(),ray=new THREE.Raycaster(),resources=new Set();let action=null,key=null,closed=false,wasPhysical=false;
 if(!progressive&&!shared)model.traverse(object=>{if(!object.isMesh)return;resources.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){resources.add(material);for(const value of Object.values(material))if(value?.isTexture)resources.add(value);}});
 if(signal?.aborted){shared?.release();progressive?.dispose();for(const resource of resources)resource.dispose();throw new DOMException('Character load cancelled','AbortError');}
 model.scale.setScalar(spec.presentation.scale);root.add(model);scene.add(root);const rest=[],visualBoneNames=new Set();model.traverse(node=>{if(node===model||node.isBone)rest.push({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()});if(node.isBone)visualBoneNames.add(node.name);});
 let baked=null;if(species==='hyena'&&bakedWalk){try{baked=createBakedWalkPresentation({model,root,renderer,bake:bakedWalk});}catch(error){onTextureError(error);}}
 // The physics binding creates up to two toe endpoints for collision fitting.
 // They are not skin joints and need not exist in the visual GLB. All actual
 // rig bones still pass the strict identity/order validation unchanged.
 function visualPose(pose){if(!Array.isArray(pose?.bones))return pose;let changed=false;const extras=new Set(),bones=[];for(const bone of pose.bones){if(!visualBoneNames.has(bone?.name)&&(bone?.name==='LeftToeBase'||bone?.name==='RightToeBase')){if(extras.has(bone.name))throw Error('Duplicate auxiliary physics bone');extras.add(bone.name);changed=true;}else bones.push(bone);}return changed?{...pose,bones}:pose;}
 function update(){
  if(closed)return;const entity=state.raid?.animals.find(item=>item.id===actorId);if(!entity||entity.status==='gone'){root.visible=false;return;}if(entity.species!==species)throw Error('Confirmed animal species changed');
  root.visible=true;const physical=getPose();if(physical){baked?.disable();if(physical.actorId!==actorId)throw Error('Confirmed animal pose belongs to another actor');applyConfirmedAnimalPose(root,model,visualPose(physical));wasPhysical=true;return;}
  if(wasPhysical){action?.stop();key=null;root.quaternion.identity();root.scale.set(1,1,1);for(const item of rest){item.node.position.copy(item.position);item.node.quaternion.copy(item.quaternion);item.node.scale.copy(item.scale);}wasPhysical=false;}
  const mesh=residency.get(Math.floor((entity.x+24)/48),Math.floor((entity.z+24)/48));let height=0;
  if(mesh){mesh.updateWorldMatrix(true,false);ray.set(new THREE.Vector3(entity.x,1000,entity.z),new THREE.Vector3(0,-1,0));height=ray.intersectObject(mesh,false)[0]?.point.y??0;}
  root.position.set(entity.x,height,entity.z);root.rotation.y=entity.downHeading!==undefined&&(entity.fallRemaining>0||entity.recovery)?entity.downHeading:entity.path?.length?Math.atan2(entity.path[0].x-entity.x,entity.path[0].z-entity.z):entity.heading??0;
  const pose=animalPose(entity,state.elapsed),clip=clips.find(item=>item.name===pose.name);if(!clip)throw Error('Missing confirmed animal clip '+pose.name);
  if(baked&&pose.name==='Walking'&&entity.status==='walking'&&!entity.recovery&&!entity.fallRemaining){baked.set(pose.time);return;}baked?.disable();
  if(key!==pose.key){action?.stop();action=mixer.clipAction(clip);action.reset().setLoop(pose.loop?THREE.LoopRepeat:THREE.LoopOnce,pose.loop?Infinity:1).play();action.paused=true;action.clampWhenFinished=true;key=pose.key;}
  action.time=pose.time;mixer.update(0);
 }
 try{update();progressive?.start();}catch(error){baked?.dispose();scene.remove(root);shared?.release();progressive?.dispose();for(const resource of resources)resource.dispose();throw error;}
 return {root,update,validatePose(pose){validateConfirmedAnimalPose(model,visualPose(pose));},isPhysical(){return wasPhysical;},isBakedWalking(){return baked?.isEnabled()??false;},tick(now){progressive?.tick(now);},dispose(){if(closed)return;closed=true;baked?.dispose();scene.remove(root);mixer.stopAllAction();mixer.uncacheRoot(model);shared?.release();progressive?.dispose();for(const resource of resources)resource.dispose();}};
}
