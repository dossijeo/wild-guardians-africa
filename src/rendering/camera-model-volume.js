import * as THREE from 'three';

// Model bounds are local, including their authored offset from the pivot.
// Current houses use only Y rotation, translation and independent axis scales.
// Fail explicitly on tilted/sheared transforms instead of silently inventing
// a yaw box that does not enclose the asset.
export function cameraModelVolume(id,bounds,matrix,margin=0){
 const e=matrix.elements;
 if(!Number.isFinite(margin)||margin<0||e.some(x=>!Number.isFinite(x)))throw Error('Invalid camera model transform');
 const sx=Math.hypot(e[0],e[2]),sy=Math.abs(e[5]),sz=Math.hypot(e[8],e[10]);
 if(Math.min(sx,sy,sz)<=0||Math.abs(e[1])>1e-8*sx||Math.abs(e[4])>1e-8*sy||Math.abs(e[6])>1e-8*sy||Math.abs(e[9])>1e-8*sz||Math.abs(e[0]*e[8]+e[2]*e[10])>1e-8*sx*sz||Math.abs(e[3])+Math.abs(e[7])+Math.abs(e[11])+Math.abs(e[15]-1)>1e-8)throw Error('Camera model requires a finite yaw-only transform');
 if(bounds.isEmpty()||[...bounds.min.toArray(),...bounds.max.toArray()].some(x=>!Number.isFinite(x)))throw Error('Invalid camera model bounds');
 const center=bounds.getCenter(new THREE.Vector3()).applyMatrix4(matrix),half=bounds.getSize(new THREE.Vector3()).multiply(new THREE.Vector3(sx,sy,sz)).multiplyScalar(.5).addScalar(margin);
 return {id,min:center.clone().sub(half).toArray(),max:center.clone().add(half).toArray(),yaw:Math.atan2(-e[2],e[0])};
}
