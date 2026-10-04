import * as THREE from 'three';

// Bioma Lab V4: unrestricted X/Z, safe tilt, 4–65 distance and 2–20 clearance.
export const TERRAIN_CAMERA={minPhi:.065,maxPhi:1.47,minDistance:4,maxDistance:65,minClearance:2,maxClearance:20,targetLift:.18};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lastPose=new WeakMap();
const matches=(vector,array)=>array.every((v,i)=>Math.abs(vector.getComponent(i)-v)<1e-8);
function applyPose(camera,controls,field,pose,rawEye){
  controls.target.fromArray(pose.target);camera.position.fromArray(pose.eye);camera.lookAt(controls.target);camera.updateMatrixWorld();
  lastPose.set(camera,{field,pose,rawEye});return pose;
}

function cameraPose(field,target,theta,phi,distance){
  phi=clamp(phi,TERRAIN_CAMERA.minPhi,TERRAIN_CAMERA.maxPhi);
  distance=clamp(distance,4,Math.min(65,20/Math.max(.19,Math.cos(phi))));
  const aim=[target[0],field.surface(target[0],target[2])+.18,target[2]];
  const eye=[aim[0]+distance*Math.sin(phi)*Math.sin(theta),aim[1]+distance*Math.cos(phi),aim[2]+distance*Math.sin(phi)*Math.cos(theta)];
  const rawEye=eye.slice(),ground=field.surface(eye[0],eye[2]);eye[1]=clamp(eye[1],ground+2,ground+20);
  return {pose:{target:aim,eye,altitude:eye[1]-ground},rawEye};
}
export function nativeCameraPose(field,target,theta,phi,distance){return cameraPose(field,target,theta,phi,distance).pose;}

export function configureTerrainControls(controls){
  Object.assign(controls,{minPolarAngle:.065,maxPolarAngle:1.47,minDistance:4,maxDistance:65,screenSpacePanning:false});
}

export function protectTerrainCamera(camera,controls,field){
  if(!field)return;
  const previous=lastPose.get(camera);
  // OrbitControls reconstructs spherical coordinates from the corrected eye.
  // A static frame must not reinterpret the height correction as another orbit.
  if(previous?.field===field&&matches(camera.position,previous.pose.eye)&&matches(controls.target,previous.pose.target))return applyPose(camera,controls,field,previous.pose,previous.rawEye);
  const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);
  const {pose,rawEye}=cameraPose(field,controls.target.toArray(),spherical.theta,spherical.phi,spherical.radius);
  return applyPose(camera,controls,field,pose,rawEye);
}

export function updateTerrainCamera(camera,controls,field){
  const previous=lastPose.get(camera);
  // Feed the orbit intent, not the vertical terrain correction, back to controls.
  // Otherwise a cliff can change the inferred distance/tilt on every idle frame.
  if(previous?.field===field&&matches(camera.position,previous.pose.eye)&&matches(controls.target,previous.pose.target))camera.position.fromArray(previous.rawEye);
  controls.update();return protectTerrainCamera(camera,controls,field);
}

export function focusTerrainCamera(camera,controls,field,point){
  const damping=controls.enableDamping;controls.enableDamping=false;try{controls.update?.();}finally{controls.enableDamping=damping;}
  const {pose,rawEye}=cameraPose(field,[point.x,0,point.z],field.canyon?0:.50,field.canyon?1.18:1.16,field.canyon?34:38);
  return applyPose(camera,controls,field,pose,rawEye);
}

export function beginTerrainCameraTravel(camera,controls,field,duration=1.2){
  const damping=controls.enableDamping;controls.enableDamping=false;try{controls.update?.();}finally{controls.enableDamping=damping;}
  protectTerrainCamera(camera,controls,field);
  const previous=lastPose.get(camera),eye=previous?.rawEye??camera.position.toArray();
  const offset=new THREE.Vector3().fromArray(eye).sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);
  return {start:[controls.target.x,controls.target.z],theta:spherical.theta,phi:spherical.phi,distance:spherical.radius,age:0,duration};
}
export function stepTerrainCameraTravel(camera,controls,field,travel,point,seconds){
  travel.age=Math.min(travel.duration,travel.age+Math.max(0,seconds));
  const t=travel.age/travel.duration,ease=t*t*(3-2*t);
  const x=travel.start[0]+(point.x-travel.start[0])*ease,z=travel.start[1]+(point.z-travel.start[1])*ease;
  const {pose,rawEye}=cameraPose(field,[x,0,z],travel.theta,travel.phi,travel.distance);
  applyPose(camera,controls,field,pose,rawEye);return t>=1;
}
