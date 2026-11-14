// Pure camera pose shared by bootstrap workers and the interactive camera.
export const TERRAIN_CAMERA={minPhi:.065,maxPhi:1.47,minDistance:4,maxDistance:65,minClearance:2,maxClearance:20,targetLift:.18};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function calculateTerrainCameraPose(field,target,theta,phi,distance,maxClearance=20,minDistance=4){
 phi=clamp(phi,TERRAIN_CAMERA.minPhi,TERRAIN_CAMERA.maxPhi);
 distance=clamp(distance,minDistance,Math.max(minDistance,Math.min(Math.max(65,maxClearance+4),maxClearance/Math.max(.19,Math.cos(phi)))));
 const aim=[target[0],field.surface(target[0],target[2])+.18,target[2]];
 const eye=[aim[0]+distance*Math.sin(phi)*Math.sin(theta),aim[1]+distance*Math.cos(phi),aim[2]+distance*Math.sin(phi)*Math.cos(theta)];
 const rawEye=eye.slice(),ground=field.surface(eye[0],eye[2]);eye[1]=clamp(eye[1],ground+2,ground+maxClearance);
 return {pose:{target:aim,eye,altitude:eye[1]-ground},rawEye};
}
export function nativeCameraPose(field,target,theta,phi,distance){return calculateTerrainCameraPose(field,target,theta,phi,distance).pose;}
