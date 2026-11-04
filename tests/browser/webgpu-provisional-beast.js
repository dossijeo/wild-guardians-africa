import * as THREE from 'three/webgpu';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {prepareAnimalClips} from '../../src/rendering/animal-actions.js';
import {createWebGpuConfirmedAnimal} from '../../src/rendering/webgpu-confirmed-animal.js';
import {ProvisionalBeastImpact} from '../../src/rendering/provisional-beast-impact.js';
import {loadBakedFalls} from '../../src/rendering/baked-beast-fallbacks.js';

try{
 const renderer=new THREE.WebGPURenderer({canvas:document.querySelector('#view'),antialias:true});await renderer.init();if(!renderer.backend.isWebGPUBackend)throw Error('WebGPU required');renderer.setSize(800,600,false);renderer.shadowMap.enabled=true;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,800/600,.1,100),floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#94aa8a'}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);scene.background=new THREE.Color('#a5b5bf');camera.position.set(3,2.4,6);camera.lookAt(0,.8,0);scene.add(new THREE.HemisphereLight(0xffffff,0x665544,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(4,8,5);light.castShadow=true;scene.add(light);
 const [gltf,falls]=await Promise.all([new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(ANIMAL_ACTIONS.animals.hyena.url),loadBakedFalls()]);gltf.scene.traverse(o=>{if(o.isMesh)o.castShadow=true;});const state={elapsed:1,raid:{animals:[{id:'hyena',species:'hyena',status:'walking',x:0,z:0,radius:.7,heading:0,motionPhase:.2}]}},manager=new ProvisionalBeastImpact({now:()=>window.qaClock??0}),assetBank={async acquire(){return {model:gltf.scene,clips:prepareAnimalClips(gltf.animations),release(){}};}};let physical=null;const actor=await createWebGpuConfirmedAnimal({scene,residency:{get:()=>null},state,actorId:'hyena',renderer,assetBank,getPose:()=>physical,getFalls:()=>falls,getProvisional:(animal,elapsed)=>manager.sample(animal,elapsed,{holdUntilPhysical:true})});
 const command={kind:'castAttack',id:'qa',targetId:'hyena',selection:{origin:{x:-3,y:2,z:-3},contact:{x:0,y:1,z:0}}};manager.begin(command,state,()=>0);
 window.qaProvisionalBeast={backend:renderer.backend.isWebGPUBackend,async frame(age){window.qaClock=age*1000;actor.update();await renderer.renderAsync(scene,camera);await renderer.backend.device.queue.onSubmittedWorkDone();return {age,falling:actor.isProvisionalFalling()};},async physical(pose,anchor){physical=structuredClone(pose);physical.actorId='hyena';physical.root[0]-=anchor.x;physical.root[2]-=anchor.z;physical.root[1]-=anchor.y;actor.update();await renderer.renderAsync(scene,camera);await renderer.backend.device.queue.onSubmittedWorkDone();},end(){manager.end('qa');actor.update();}};
 await window.qaProvisionalBeast.frame(0);window.qaProvisionalBeast.ready=true;
}catch(error){window.qaProvisionalBeast={error:String(error.stack??error)};}
