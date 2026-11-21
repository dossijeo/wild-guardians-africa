import * as THREE from 'three';
import {createWateringEmitter} from './watering-emitter.js';

// Same authored emitter and root-space transform as WorldScene.wateringSource.
export function createWebGpuWateringSource({state,surface,profiles,headings=null}){
 if(!state||typeof surface!=='function'||!profiles)throw TypeError('Invalid watering source');
 const samples=new Map(Object.entries(profiles).map(([id,path])=>[id,createWateringEmitter(path)])),mouth=new THREE.Vector3(),direction=new THREE.Vector3(),root=new THREE.Object3D(),inverse=new THREE.Matrix4();
 return (workerId,time,effectRoot)=>{const worker=state.workers.find(item=>item.id===workerId),sample=samples.get(worker?.profile);if(!worker||!sample||!effectRoot)return null;const height=surface(worker.x,worker.z);if(!Number.isFinite(height))return null;sample(time/4.3,mouth,direction);root.position.set(worker.x,height+.025,worker.z);root.rotation.set(0,headings?.get(workerId)??worker.heading??0,0);root.updateMatrixWorld(true);effectRoot.updateWorldMatrix(true,false);inverse.copy(effectRoot.matrixWorld).invert();mouth.applyMatrix4(root.matrixWorld).applyMatrix4(inverse);direction.transformDirection(root.matrixWorld).transformDirection(inverse);return {position:mouth.toArray(),direction:direction.toArray()};};
}
