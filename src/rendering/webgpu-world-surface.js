import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuTerrainResidency} from './webgpu-terrain-residency.js';
import {createConfirmedTerrainReceiver} from './confirmed-terrain-receiver.js';
import {createConfirmedPresentationStream} from './confirmed-presentation-stream.js';
import {deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {createWebGpuConfirmedAnimal} from './webgpu-confirmed-animal.js';

// Worker-owned foundation for the WebGPU world. The simulation supplies state
// and terrain; this surface owns GPU resources, never the authoritative state.
// The terrain material is provisional until the world material is migrated.
export async function createWebGpuWorldSurface({canvas,session,terrainPort,presentationPort=null,snapshot=null,experimentalActorId=null,experimentalActorPackageUrl=null,width=512,height=512,onError=()=>{},onConfirmed=()=>{},onActorReady=()=>{},onActorTextured=()=>{},onActorTextureError=()=>{}}={}){
 if(typeof document!=='undefined'||!canvas||!terrainPort||typeof session!=='string'||!session||!Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1||typeof onError!=='function'||typeof onConfirmed!=='function'||typeof onActorReady!=='function'||Boolean(presentationPort)!==Boolean(snapshot))throw TypeError('Invalid WebGPU world surface');
 let renderer,scene,material,waterMaterial,residency,terrain,stream,animal,closed=false;const characterLoad=new AbortController();
 try{
  renderer=new WebGPURenderer({canvas,antialias:false});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU backend unavailable');renderer.setSize(width,height,false);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  scene=new THREE.Scene();scene.background=new THREE.Color('#9eb3b0');material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});waterMaterial=new THREE.MeshBasicMaterial({color:'#366f75',side:THREE.DoubleSide,toneMapped:false});residency=createWebGpuTerrainResidency({scene,material,waterMaterial});terrain=createConfirmedTerrainReceiver({port:terrainPort,session,residency,onError,onApplied:()=>animal?.update()});
  const state=presentationPort?deserializeConfirmedState(snapshot):null;if(state)stream=createConfirmedPresentationStream({port:presentationPort,session,state,terrain,onError,onConfirmed:message=>{animal?.update();onConfirmed(message);}});
  if(experimentalActorId!==null){if(!state)throw Error('Animal requires confirmed state');scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-6,12,9);scene.add(sun);createWebGpuConfirmedAnimal({scene,residency,state,renderer,packageUrl:experimentalActorPackageUrl,actorId:experimentalActorId,signal:characterLoad.signal,onTextured:onActorTextured,onTextureError:onActorTextureError}).then(created=>{if(closed){created.dispose();return;}animal=created;onActorReady(experimentalActorId);}).catch(error=>{if(!closed)onError(error);});}
  const camera=new THREE.PerspectiveCamera(45,width/height,.1,500);camera.coordinateSystem=renderer.coordinateSystem;
  function setCamera({x,y,z,targetX,targetY,targetZ}){if(closed)throw Error('World surface disposed');if(![x,y,z,targetX,targetY,targetZ].every(Number.isFinite))throw TypeError('Invalid camera');camera.position.set(x,y,z);camera.lookAt(targetX,targetY,targetZ);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
  return {renderer,scene,camera,residency,terrain,stream,state,get animal(){return animal??null;},setCamera,resize(w,h){if(closed)throw Error('World surface disposed');if(!Number.isInteger(w)||w<1||!Number.isInteger(h)||h<1)throw TypeError('Invalid surface size');camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);},render(){if(closed)throw Error('World surface disposed');animal?.tick(performance.now());renderer.render(scene,camera);},dispose(){if(closed)return;closed=true;characterLoad.abort();stream?.dispose();terrain.dispose();animal?.dispose();residency.dispose();material.dispose();waterMaterial.dispose();renderer.dispose();}};
 }catch(error){closed=true;characterLoad.abort();stream?.dispose();terrain?.dispose();animal?.dispose();residency?.dispose();material?.dispose();waterMaterial?.dispose();renderer?.dispose();throw error;}
}
