import * as THREE from 'three';
// CPU-only fit of the actual posed, natively visible rig. No visibility changes.
export function deriveWorkerQaFrame(model,camera,pose){
 model.updateWorldMatrix(true,true);const bounds=new THREE.Box3();model.traverseVisible(mesh=>{if(mesh.isMesh)bounds.union(new THREE.Box3().setFromObject(mesh,true));});
 if(bounds.isEmpty()||[...bounds.min.toArray(),...bounds.max.toArray()].some(v=>!Number.isFinite(v)))throw Error('Invalid native worker framing bounds');
 const center=bounds.getCenter(new THREE.Vector3()),radius=bounds.getSize(new THREE.Vector3()).length()/2,vertical=THREE.MathUtils.degToRad(camera.getEffectiveFOV())/2,horizontal=Math.atan(Math.tan(vertical)*camera.aspect),distance=Math.max(4,radius/Math.sin(Math.min(vertical,horizontal))*1.15),az=THREE.MathUtils.degToRad(pose.azimuth),el=THREE.MathUtils.degToRad(pose.elevation);
 return {target:center.toArray(),eye:center.clone().add(new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(distance)).toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},distance};
}
export function workerQaFrameFits(frame,camera){camera.updateMatrixWorld();const p=new THREE.Vector3();let fits=true;for(const x of [frame.bounds.min[0],frame.bounds.max[0]])for(const y of [frame.bounds.min[1],frame.bounds.max[1]])for(const z of [frame.bounds.min[2],frame.bounds.max[2]]){p.set(x,y,z).project(camera);fits&&=Number.isFinite(p.x)&&Math.abs(p.x)<=.98&&Math.abs(p.y)<=.98&&p.z>=-1&&p.z<=1;}return fits;}
