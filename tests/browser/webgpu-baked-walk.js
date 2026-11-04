import * as THREE from 'three/webgpu';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {prepareAnimalClips,prepareAnimalModel,animalGroundSamples,applyAnimalPose} from '../../src/rendering/animal-actions.js';
import {createBakedWalkTexture,createBakedWalkPresentation} from '../../src/rendering/webgpu-baked-walk.js';

try{
 const renderer=new THREE.WebGPURenderer({canvas:document.querySelector('#view'),antialias:false});await renderer.init();if(!renderer.backend.isWebGPUBackend)throw Error('WebGPU backend unavailable');renderer.setSize(800,600,false);renderer.shadowMap.enabled=true;
 const [meta,buffer,gltf]=await Promise.all([fetch('/qa/gpu-bake/walking.json').then(r=>r.json()),fetch('/qa/gpu-bake/walking.bin').then(r=>r.arrayBuffer()),new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(ANIMAL_ACTIONS.animals.hyena.url)]);
 const bake=createBakedWalkTexture(meta,buffer),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,800/600,.1,100),root=new THREE.Group(),model=prepareAnimalModel(gltf.scene,'hyena');root.add(model);scene.add(root);model.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.background=new THREE.Color('#a5b5bf');camera.position.set(4,2.2,7);camera.lookAt(0,1,0);scene.add(new THREE.HemisphereLight(0xffffff,0x665544,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(4,8,5);light.castShadow=true;scene.add(light);const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#a5b5bf'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor);
 const actor={model,mixer:new THREE.AnimationMixer(model),clips:prepareAnimalClips(gltf.animations),groundSamples:animalGroundSamples(model),cachedSkinning:2},animal={species:'hyena',status:'walking',motionPhase:0},candidate=createBakedWalkPresentation({model,root,renderer,bake});
 const adapter=await navigator.gpu.requestAdapter();window.qaBakedWalk={backend:renderer.backend.isWebGPUBackend,adapter:adapter?.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description}:null,async draw(mode,time){if(mode==='original'){candidate.disable();animal.motionPhase=time;applyAnimalPose(actor,animal,time);}else if(mode==='baked'){model.position.y=0;candidate.set(time);}else throw Error('Invalid mode');const device=renderer.backend.device;device.pushErrorScope('validation');await renderer.renderAsync(scene,camera);await device.queue.onSubmittedWorkDone();const error=await device.popErrorScope();if(error)throw Error(error.message);return {mode,time};}};
 await window.qaBakedWalk.draw('baked',.25);window.qaBakedWalk.ready=true;
}catch(error){window.qaBakedWalk={error:String(error.stack??error)};}
