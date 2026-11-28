import * as THREE from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';

// One admitted, non-interactive sprout is shared by all pending plant commands.
// It exists only until the authored crop batch can be displayed.
export function createWebGpuCropPreviewFallback({scene,capacity=256}={}){
 if(!scene?.isScene||!Number.isSafeInteger(capacity)||capacity<1)throw TypeError('Invalid crop preview fallback');
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([
  -.018,0,0,.018,0,0,0,.17,0,
  0,.08,0,-.12,.14,0,-.025,.19,0,
  0,.08,0,.12,.14,0,.025,.19,0,
  0,.08,0,0,.14,-.12,0,.19,-.025,
  0,.08,0,0,.14,.12,0,.19,.025
 ],3));geometry.computeVertexNormals();
 const material=new MeshBasicNodeMaterial({color:0x5c9c35,side:THREE.DoubleSide}),mesh=new THREE.InstancedMesh(geometry,material,capacity),matrix=new THREE.Object3D();mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.userData.wgCropFallback=true;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;mesh.raycast=()=>{};mesh.count=0;mesh.visible=false;scene.add(mesh);let closed=false,admitted=false;
 return {mesh,ready(){if(!closed)admitted=true;},update(plants){if(closed)return;let count=0;for(const plant of plants){if(count===capacity)break;matrix.position.set(plant.x,plant.y+.025,plant.z);matrix.rotation.set(0,0,0);matrix.scale.setScalar(1);matrix.updateMatrix();mesh.setMatrixAt(count++,matrix.matrix);}mesh.count=count;mesh.visible=admitted&&count>0;if(count)mesh.instanceMatrix.needsUpdate=true;},dispose(){if(closed)return;closed=true;mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();}};
}
