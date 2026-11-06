import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import NodeFrame from '../node_modules/three/src/nodes/core/NodeFrame.js';
import {createWebGpuStructureColorMaterial,setWebGpuStructureColorTexture,setWebGpuStructureColorBlend,webGpuStructureColorGraph} from '../src/rendering/webgpu-structure-color.js';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import {NativeWall} from '../src/rendering/walls.js';

test('walls and villages reuse a graph per color layout with independent material parameters',()=>{
 const textures=[new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1),new THREE.DataTexture(new Uint8Array([10,20,30,255]),1,1)],wallA=createWebGpuStructureColorMaterial(textures[0],3),wallB=createWebGpuStructureColorMaterial(textures[1],3),villageA=createWebGpuStructureColorMaterial(textures[0],4),villageB=createWebGpuStructureColorMaterial(textures[1],4),frame=new NodeFrame(),meshes=[];
 try{
  assert.equal(wallA.colorNode,wallB.colorNode);assert.equal(villageA.colorNode,villageB.colorNode);assert.notEqual(wallA.colorNode,villageA.colorNode);assert.equal(wallA.customProgramCacheKey(),wallB.customProgramCacheKey());assert.equal(villageA.customProgramCacheKey(),villageB.customProgramCacheKey());
  for(const [material,weight] of [[wallA,.1],[wallB,.7],[villageA,.3],[villageB,.9]]){material._wgTextureBlend=weight;const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material);meshes.push(mesh);frame.object=mesh;frame.material=material;const graph=webGpuStructureColorGraph(material===wallA||material===wallB?3:4);frame.updateNode(graph.map);frame.updateNode(graph.blend);assert.equal(graph.map.node.value,material.map);assert.equal(graph.blend.node.value,weight);}
  const key=wallA.customProgramCacheKey();setWebGpuStructureColorTexture(wallA,textures[1]);wallA._wgTextureBlend=.9;assert.equal(wallA.customProgramCacheKey(),key);assert.equal(wallB._wgTextureBlend,.7);assert.throws(()=>webGpuStructureColorGraph(2),/layout/);
 }finally{for(const material of [wallA,wallB,villageA,villageB])material.dispose();for(const mesh of meshes)mesh.geometry.dispose();for(const texture of textures)texture.dispose();}
});
test('placeholder sampler matches the loaded texture and incompatible bindings are rejected',()=>{
 const placeholder=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1),loaded=new THREE.Texture(),material=createWebGpuStructureColorMaterial(placeholder,4);placeholder.colorSpace=loaded.colorSpace=THREE.SRGBColorSpace;placeholder.flipY=loaded.flipY=false;
 try{assert.equal(placeholder.minFilter,loaded.minFilter);assert.equal(placeholder.magFilter,loaded.magFilter);assert.equal(placeholder.generateMipmaps,true);setWebGpuStructureColorTexture(material,loaded);assert.equal(material.map,loaded);const incompatible=new THREE.Texture();incompatible.colorSpace=THREE.SRGBColorSpace;incompatible.wrapS=THREE.RepeatWrapping;assert.throws(()=>setWebGpuStructureColorTexture(material,incompatible),/binding mismatch/);assert.equal(material.map,loaded);incompatible.dispose();}finally{material.dispose();placeholder.dispose();loaded.dispose();}
});
test('a compatible texture arriving during admission does not require a new graph preparation',async()=>{
 const placeholder=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1),loaded=new THREE.Texture(),material=createWebGpuStructureColorMaterial(placeholder,4),geometry=new THREE.BoxGeometry(),mesh=new THREE.Mesh(geometry,material),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();placeholder.colorSpace=loaded.colorSpace=THREE.SRGBColorSpace;placeholder.flipY=loaded.flipY=false;let finish,calls=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){calls++;return new Promise(resolve=>{finish=resolve;});}},admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 try{const pending=admission.prepare(mesh);await Promise.resolve();setWebGpuStructureColorTexture(material,loaded);finish();await pending;assert.equal(calls,1);}finally{admission.dispose();material.dispose();geometry.dispose();placeholder.dispose();loaded.dispose();}
});
test('native wall replicas receive texture transitions and unregister on disposal',()=>{
 const placeholder=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1),loaded=new THREE.Texture(),material=createWebGpuStructureColorMaterial(placeholder,3),prototype=new THREE.Mesh(new THREE.BufferGeometry(),material);placeholder.colorSpace=loaded.colorSpace=THREE.SRGBColorSpace;
 prototype.userData.nativePiece={p:new Float32Array([0,0,0,1,0,0,0,1,0]),n:new Float32Array([0,0,1,0,0,1,0,0,1]),uv:new Float32Array([0,0,1,0,0,1]),i:new Uint16Array([0,1,2]),faceRegions:new Uint16Array([0]),regions:[],morph:{},color:new Uint8Array([1,2,3,4,5,6,7,8,9])};
 const entity={id:'w',material:'zarzas',gate:false,hp:100,maxHp:100,status:'intact'},prototypes={zarzas_intacto:prototype},first=new NativeWall(prototypes,entity,0),second=new NativeWall(prototypes,{...entity,id:'v'},0),a=first.parts[0].mesh.material,b=second.parts[0].mesh.material;
 try{assert.notEqual(a,b);assert.equal(a.colorNode,material.colorNode);assert.equal(b.colorNode,material.colorNode);setWebGpuStructureColorTexture(material,loaded);setWebGpuStructureColorBlend(material,.4);assert.equal(a.map,loaded);assert.equal(b.map,loaded);assert.equal(a._wgTextureBlend,.4);assert.equal(b._wgTextureBlend,.4);first.dispose();setWebGpuStructureColorBlend(material,.8);assert.equal(a._wgTextureBlend,.4);assert.equal(b._wgTextureBlend,.8);second.dispose();setWebGpuStructureColorBlend(material,1);assert.equal(b._wgTextureBlend,.8);}finally{first.dispose();second.dispose();material.dispose();prototype.geometry.dispose();placeholder.dispose();loaded.dispose();}
});
