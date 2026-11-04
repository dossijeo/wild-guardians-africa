import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuTerrainResidency} from './webgpu-terrain-residency.js';
import {createConfirmedTerrainReceiver} from './confirmed-terrain-receiver.js';
import {createConfirmedPresentationStream} from './confirmed-presentation-stream.js';
import {deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {createWebGpuAnimalBank} from './webgpu-animal-bank.js';
import {createWebGpuAnimalRoster} from './webgpu-animal-roster.js';
import {createWebGpuWorkerBank} from './webgpu-worker-bank.js';
import {createWebGpuWorkerRoster} from './webgpu-worker-roster.js';
import {createWebGpuSettlements} from './webgpu-settlements.js';
import {createWebGpuCropRoster} from './webgpu-crop-roster.js';
import {createWebGpuBiomeProps} from './webgpu-biome-props.js';
import {createConfirmedMotionFeed} from './confirmed-motion-feed.js';
import {syncWebGpuWorldLighting} from './webgpu-world-lighting.js';

// Worker-owned foundation for the WebGPU world. The simulation supplies state
// and terrain; this surface owns GPU resources, never the authoritative state.
// The terrain material is provisional until the world material is migrated.
export async function createWebGpuWorldSurface({canvas,session,terrainPort,presentationPort=null,snapshot=null,experimentalActorId=null,experimentalAllActors=false,experimentalActorPackageUrl=null,experimentalMotionFeed=false,width=512,height=512,onError=()=>{},onConfirmed=()=>{},onActorReady=()=>{},onActorTextured=()=>{},onActorTextureError=()=>{},onSettlementTextureError=()=>{}}={}){
 if(typeof document!=='undefined'||!canvas||!terrainPort||typeof session!=='string'||!session||!Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1||typeof onError!=='function'||typeof onConfirmed!=='function'||typeof onActorReady!=='function'||Boolean(presentationPort)!==Boolean(snapshot))throw TypeError('Invalid WebGPU world surface');
 let renderer,scene,material,waterMaterial,residency,terrain,stream,roster,workers,settlements,crops,biomeProps,motionFeed,lightingNight=0,closed=false;
 try{
  renderer=new WebGPURenderer({canvas,antialias:false});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU backend unavailable');renderer.backend.device.lost.then(info=>{if(!closed)onError(Error('WebGPU device lost: '+(info?.message||info?.reason||'unknown')));});renderer.setSize(width,height,false);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  scene=new THREE.Scene();scene.background=new THREE.Color('#9eb3b0');const ambient=new THREE.HemisphereLight('#ebf1d9','#765b3b',2);scene.add(ambient);const sun=new THREE.DirectionalLight('#ffe2a8',3);sun.position.set(-30,55,25);scene.add(sun);material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});waterMaterial=new THREE.MeshBasicMaterial({color:'#366f75',side:THREE.DoubleSide,toneMapped:false});residency=createWebGpuTerrainResidency({scene,material,waterMaterial});terrain=createConfirmedTerrainReceiver({port:terrainPort,session,residency,onError,onApplied:(payload,revision)=>{biomeProps?.replace(payload,revision);roster?.sync();workers?.sync();settlements?.terrainChanged();crops?.terrainChanged();}});
  const state=presentationPort?deserializeConfirmedState(snapshot):null;if(state)lightingNight=syncWebGpuWorldLighting(state,sun,ambient);if(experimentalMotionFeed){if(!state)throw Error('Motion feed requires confirmed state');motionFeed=createConfirmedMotionFeed();}
  if(state)biomeProps=createWebGpuBiomeProps({scene,state,onError});
  if(state){settlements=createWebGpuSettlements({scene,state,residency,renderer,onError,onTextureError:onSettlementTextureError});settlements.sync();}
  if(state){crops=createWebGpuCropRoster({scene,state,residency,renderer,onError});crops.sync();}
  if(experimentalActorId!==null||experimentalAllActors){if(!state)throw Error('Animal requires confirmed state');const chosen=state.raid?.animals.find(item=>item.id===experimentalActorId),packages=experimentalAllActors?{buffalo:'/content/character-preview/buffalo/package.json'}:{};if(experimentalActorPackageUrl&&chosen)packages[chosen.species]=experimentalActorPackageUrl;const assetBank=createWebGpuAnimalBank({renderer,packages,onTextured:onActorTextured,onTextureError:onActorTextureError});roster=createWebGpuAnimalRoster({scene,residency,state,renderer,assetBank,onlyActorId:experimentalAllActors?null:experimentalActorId,onError,onReady:onActorReady});roster.sync();}
  if(experimentalAllActors){const assetBank=createWebGpuWorkerBank({renderer});workers=createWebGpuWorkerRoster({scene,residency,state,assetBank,onError});workers.sync();}
  if(state)stream=createConfirmedPresentationStream({port:presentationPort,session,state,terrain,onError,onMotion:motionFeed?event=>motionFeed.accept(event):null,onPhysics:roster?poses=>roster.setPoses(poses):null,validatePhysics:roster?poses=>roster.validatePoses(poses):null,onConfirmed:message=>{lightingNight=syncWebGpuWorldLighting(state,sun,ambient);biomeProps?.sync();roster?.sync();workers?.sync();settlements?.sync();crops?.sync();onConfirmed(message);}});
  const camera=new THREE.PerspectiveCamera(45,width/height,.1,500);camera.coordinateSystem=renderer.coordinateSystem;
  function setCamera({x,y,z,targetX,targetY,targetZ,fov=camera.fov,near=camera.near,far=camera.far}){if(closed)throw Error('World surface disposed');if(![x,y,z,targetX,targetY,targetZ,fov,near,far].every(Number.isFinite)||fov<=0||fov>=180||near<=0||far<=near)throw TypeError('Invalid camera');camera.position.set(x,y,z);camera.fov=fov;camera.near=near;camera.far=far;camera.lookAt(targetX,targetY,targetZ);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
  return {renderer,scene,camera,residency,terrain,stream,state,motionFeed,get lighting(){return {night:lightingNight,sun:sun.intensity,ambient:ambient.intensity};},get biomeProps(){return biomeProps??null;},get animal(){return roster?.first()??null;},get animalRoster(){return roster??null;},get workerRoster(){return workers??null;},get settlements(){return settlements??null;},get crops(){return crops??null;},setCamera,resize(w,h){if(closed)throw Error('World surface disposed');if(!Number.isInteger(w)||w<1||!Number.isInteger(h)||h<1)throw TypeError('Invalid surface size');camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);},render(){if(closed)throw Error('World surface disposed');const now=performance.now();roster?.tick(now);settlements?.tick(now);renderer.render(scene,camera);},dispose(){if(closed)return;closed=true;stream?.dispose();motionFeed?.dispose();terrain.dispose();roster?.dispose();workers?.dispose();settlements?.dispose();crops?.dispose();biomeProps?.dispose();residency.dispose();material.dispose();waterMaterial.dispose();renderer.dispose();}};
 }catch(error){closed=true;stream?.dispose();motionFeed?.dispose();terrain?.dispose();roster?.dispose();workers?.dispose();settlements?.dispose();crops?.dispose();biomeProps?.dispose();residency?.dispose();material?.dispose();waterMaterial?.dispose();renderer?.dispose();throw error;}
}
