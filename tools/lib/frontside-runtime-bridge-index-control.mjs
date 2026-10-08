// Explicit QA control only. Restore this control before disposing/rebuilding
// the native batch; this module never changes production materials or assets.
import * as THREE from 'three';
import {indexedBridgeControl} from './frontside-indexed-bridge-control.mjs';
export function installBridgeIndexQaControl(mesh){
 if(!mesh?.isInstancedMesh||Array.isArray(mesh.material)||mesh.material?.side!==THREE.DoubleSide||mesh.customDepthMaterial?.side!==THREE.DoubleSide)throw Error('Expected native DoubleSide bridge mesh and shadow recipe');
 const source=mesh.geometry,result=indexedBridgeControl(source),geometry=result.geometry,material=mesh.material,shadow=mesh.customDepthMaterial,instanceMatrix=mesh.instanceMatrix;let closed=false;
 mesh.geometry=geometry;
 return{
  snapshot(){return{status:'ORIGINAL_BRIDGE_INDEXED_DOUBLE_QA_NOT_APPROVED',closed,mesh:mesh.name,sourceCorners:result.originalCorners,indexedVertices:result.uniqueVertices,indexCount:geometry.index.count,sourceStaticBytes:result.originalStaticBytes,indexedStaticBytes:result.indexedStaticBytes,liveBridgeShared:!closed&&geometry.getAttribute('iBridge')===source.getAttribute('iBridge'),instanceMatrixShared:mesh.instanceMatrix===instanceMatrix,materialUnchanged:mesh.material===material,shadowUnchanged:mesh.customDepthMaterial===shadow};},
  dispose(){if(closed)return;if(mesh.geometry!==geometry)throw Error('Restore indexed control before native geometry replacement');mesh.geometry=source;for(const [name,attribute] of Object.entries(geometry.attributes))if(attribute===source.getAttribute(name))geometry.deleteAttribute(name);geometry.dispose();closed=true;}
 };
}
