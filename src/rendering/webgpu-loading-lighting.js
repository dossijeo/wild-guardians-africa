import * as THREE from 'three';
import {skyNight} from './sky.js';
import {createWebGpuSharedShadow} from './webgpu-shared-shadow.js';

// The loading garden follows the authored camera-relative light direction.
// Three and the diffuse TSL graph share the same shadow node and target.
export function createWebGpuLoadingLighting({scene,renderer,camera,onError=()=>{}}={}){
 if(!scene?.isScene||!renderer?.shadowMap||!camera?.isPerspectiveCamera||typeof onError!=='function')throw TypeError('Invalid loading lighting');
 const sun=new THREE.DirectionalLight('#ffe2a8',3),ambient=new THREE.HemisphereLight('#ebf1d9','#765b3b',2),direction=new THREE.Vector3(.48,1,0).normalize(),worldDirection=new THREE.Vector3();
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:1,far:100});sun.shadow.camera.updateProjectionMatrix();scene.add(sun,sun.target,ambient);
 const shared=createWebGpuSharedShadow(sun,{onInvalidated:()=>onError(Error('Loading garden shadow invalidated'))});let closed=false;
 return {sun,ambient,visibility:shared.node.r,update(state){if(closed)throw Error('Loading lighting disposed');camera.updateMatrixWorld();worldDirection.copy(direction).applyQuaternion(camera.quaternion);sun.position.copy(sun.target.position).addScaledVector(worldDirection,60);const night=skyNight(state);sun.intensity=3-2.6*night;ambient.intensity=2-.9*night;},dispose(){if(closed)return;closed=true;shared.release();scene.remove(sun,sun.target,ambient);sun.shadow.dispose();}};
}
