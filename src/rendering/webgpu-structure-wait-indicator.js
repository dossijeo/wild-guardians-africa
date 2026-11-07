import * as THREE from 'three';
import {structureWaitIndicatorRecipe} from './webgpu-material-graph-catalog.js';

// One admitted mesh serves every pending placement. Slot contents change, but
// the pipeline, geometry and instance buffer never change after preparation.
export function createStructureWaitIndicator({scene,own,capacity=256}={}){
 if(!scene?.isScene||typeof own!=='function'||!Number.isSafeInteger(capacity)||capacity<1)throw TypeError('Invalid structure indicator');
 const geometry=own(new THREE.RingGeometry(.72,1,32).rotateX(-Math.PI/2));
 const material=own(new THREE.MeshBasicMaterial({...structureWaitIndicatorRecipe().structural.state,color:0xc6df9d,opacity:.55}));
 const mesh=own(new THREE.InstancedMesh(geometry,material,capacity));mesh.frustumCulled=false;mesh.visible=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
 const slots=new Map(),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),empty=new THREE.Matrix4().makeScale(0,0,0);
 for(let i=0;i<capacity;i++)mesh.setMatrixAt(i,empty);mesh.instanceMatrix.needsUpdate=true;
 let ready=false,closed=false;
 return {mesh,ready(){if(closed)return;ready=true;mesh.visible=slots.size>0;},show(id,{x,y,z,width=2,depth=2}){if(closed||slots.has(id)||slots.size>=capacity||typeof id!=='string'||!id||![x,y,z,width,depth].every(Number.isFinite)||width<=0||depth<=0)return false;let slot=0;while([...slots.values()].includes(slot))slot++;slots.set(id,slot);position.set(x,y+.1,z);scale.set(width,1,depth);matrix.compose(position,rotation,scale);mesh.setMatrixAt(slot,matrix);mesh.instanceMatrix.needsUpdate=true;mesh.visible=ready;return true;},remove(id){const slot=slots.get(id);if(slot===undefined)return;slots.delete(id);mesh.setMatrixAt(slot,empty);mesh.instanceMatrix.needsUpdate=true;mesh.visible=ready&&slots.size>0;},tick(now){if(slots.size)material.opacity=.5+.1*Math.sin(now*.004);},dispose(){closed=true;slots.clear();mesh.visible=false;mesh.removeFromParent();}};
}
