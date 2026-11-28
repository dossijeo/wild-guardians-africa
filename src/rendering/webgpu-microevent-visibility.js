import {Raycaster,Vector3} from 'three';

// The interaction is rejected when the resident presentation is incomplete.
// All visible meshes are considered opaque, so alpha cutouts can produce a
// conservative rejection; no visual hit may mutate the simulation directly.
export function createWebGpuMicroeventVisibility({scene,camera,isReady}={}){
 if(!scene?.isScene||!camera?.isCamera||typeof isReady!=='function')throw TypeError('Invalid microevent visibility');
 const ray=new Raycaster(),point=new Vector3(),direction=new Vector3(),meshes=[];
 return {visible(position){if(!position||![position.x,position.y,position.z].every(Number.isFinite))throw TypeError('Invalid microevent position');scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);point.set(position.x,position.y,position.z);direction.copy(point).sub(camera.position);const distance=direction.length();if(distance<.1)return false;ray.ray.set(camera.position,direction.normalize());ray.near=.01;ray.far=distance-.08;try{if(isReady(ray.ray,ray.far)!==true)return false;meshes.length=0;let unknown=false;scene.traverseVisible(object=>{if(!object.isMesh||object.raycast===null)return;if(object.geometry?.isInstancedBufferGeometry&&!object.isInstancedMesh&&!Object.hasOwn(object,'raycast'))unknown=true;meshes.push(object);});if(unknown)return false;return ray.intersectObjects(meshes,false).length===0;}finally{meshes.length=0;ray.far=Infinity;}}};
}
