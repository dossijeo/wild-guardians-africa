import * as THREE from 'three';
import {nativeCameraPose,TERRAIN_CAMERA} from './terrain-camera.js';
// CPU-only bounded fit through the actual native terrain pose, never around it.
export function deriveWorkerQaFrame(model,camera,pose,field){
 if(!field?.surface)throw Error('Missing native terrain field for worker framing');
 model.updateWorldMatrix(true,true);const bounds=new THREE.Box3();model.traverseVisible(mesh=>{if(mesh.isMesh)bounds.union(new THREE.Box3().setFromObject(mesh,true));});
 if(bounds.isEmpty()||[...bounds.min.toArray(),...bounds.max.toArray()].some(v=>!Number.isFinite(v)))throw Error('Invalid native worker framing bounds');
 const center=bounds.getCenter(new THREE.Vector3()),az=THREE.MathUtils.degToRad(pose.azimuth),phi=Math.PI/2-THREE.MathUtils.degToRad(pose.elevation),probe=camera.clone(),record={bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},rigCenter:center.toArray(),azimuth:pose.azimuth,elevation:pose.elevation,search:{minDistance:TERRAIN_CAMERA.minDistance,maxDistance:TERRAIN_CAMERA.maxDistance,step:.25,attempts:0}};
 for(let distance=TERRAIN_CAMERA.minDistance;distance<=TERRAIN_CAMERA.maxDistance;distance+=.25){
  const native=nativeCameraPose(field,center.toArray(),az,phi,distance);probe.position.fromArray(native.eye);probe.lookAt(new THREE.Vector3().fromArray(native.target));probe.updateMatrixWorld();record.search.attempts++;record.lastNativePose=native;
  if(workerQaFrameFits(record,probe))return {...record,target:native.target,eye:native.eye,distance:new THREE.Vector3().fromArray(native.eye).distanceTo(new THREE.Vector3().fromArray(native.target)),requestedDistance:distance};
 }
 const error=Error('No legal native terrain pose can frame the full worker rig');error.framing=record;throw error;
}
export function workerQaFrameFits(frame,camera){camera.updateMatrixWorld();const p=new THREE.Vector3();let fits=true;for(const x of [frame.bounds.min[0],frame.bounds.max[0]])for(const y of [frame.bounds.min[1],frame.bounds.max[1]])for(const z of [frame.bounds.min[2],frame.bounds.max[2]]){p.set(x,y,z).project(camera);fits&&=Number.isFinite(p.x)&&Math.abs(p.x)<=.98&&Math.abs(p.y)<=.98&&p.z>=-1&&p.z<=1;}return fits;}
