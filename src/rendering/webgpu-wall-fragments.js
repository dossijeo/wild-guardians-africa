import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {createVfxGeometries} from './vfx-native.js';

// Share the native rigid fragment shapes and material across wall impacts.
// Transforms and colors come directly from the existing VFX simulation.
export function createWebGpuWallFragmentAssets(){
 const shapes=createVfxGeometries(),geometries=new Map(),material=new MeshStandardNodeMaterial({roughness:.92,metalness:0,side:THREE.DoubleSide}),matrix=new THREE.Matrix4(),color=new THREE.Color();let closed=false;
 for(const kind of ['wood','adobe','stone']){const data=shapes[kind],buffer=new THREE.InterleavedBuffer(data,6),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(buffer,3,0));geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(buffer,3,3));geometries.set(kind,geometry);}
 return {instantiate(root){if(closed||!root?.isObject3D)throw TypeError('Invalid wall fragment root');const meshes=new Map();for(const [kind,geometry] of geometries){const mesh=new THREE.InstancedMesh(geometry,material,256);mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=true;mesh.raycast=()=>{};mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);meshes.set(kind,mesh);}let disposed=false;return {update(packed){if(disposed)return;for(const [kind,mesh] of meshes){const data=packed[kind],count=data?.count??0;for(let i=0;i<count;i++){const at=i*23;matrix.fromArray(data.data,at);mesh.setMatrixAt(i,matrix);color.setRGB(data.data[at+16],data.data[at+17],data.data[at+18]);mesh.setColorAt(i,color);}mesh.count=count;mesh.visible=count>0;if(count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;}}},count(){return [...meshes.values()].reduce((n,mesh)=>n+mesh.count,0);},dispose(){if(disposed)return;disposed=true;for(const mesh of meshes.values()){root.remove(mesh);mesh.dispose();}meshes.clear();}};},dispose(){if(closed)return;closed=true;for(const geometry of geometries.values())geometry.dispose();geometries.clear();material.dispose();}};
}
