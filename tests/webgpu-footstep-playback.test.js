import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { createWebGpuFootstepGraph,createWebGpuFootstepTexture,bindWebGpuFootstepSamples } from '../src/rendering/webgpu-footstep-playback.js';
import { createWebGpuVfxSpriteGraph,createWebGpuVfxSpriteMaterial,bindWebGpuVfxSpriteObject } from '../src/rendering/webgpu-vfx-sprite-material.js';
import { createWebGpuWallFragmentAssets } from '../src/rendering/webgpu-wall-fragments.js';

test('sampled sprite and rigid graphs compile with stable shared material programs',()=>{
 const renderer=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});renderer.hasFeature=()=>true;
 const scene=new THREE.Scene(),playback=createWebGpuFootstepGraph(uniform(0)),atlas=new THREE.DataTexture(new Uint8Array(4),1,1),samples=createWebGpuFootstepTexture();
 const material=createWebGpuVfxSpriteMaterial(createWebGpuVfxSpriteGraph(atlas,null,playback.sprite));
 const geometry=new THREE.InstancedBufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3));geometry.setAttribute('aCorner',new THREE.Float32BufferAttribute([0,0],2));
 for(const [name,size] of [['iPos',3],['iSize',2],['iAngle',1],['iRect',4],['iNext',4],['iColor',4],['iParams',4],['iDirection',3]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(4*size),size));
 const mesh=new THREE.Mesh(geometry,material);bindWebGpuVfxSpriteObject(mesh);bindWebGpuFootstepSamples(mesh,samples,3);scene.add(mesh);
 const build=object=>{const builder=renderer.backend.createNodeBuilder(object,renderer);builder.scene=scene;builder.camera=new THREE.PerspectiveCamera();builder.build();return builder.vertexShader;};
 try {const first=build(mesh);assert.match(first,/textureLoad/);assert.match(first,/wgFootstepSlot/);mesh._wgFootstepBirth=4;assert.equal(build(mesh),first);
  const assets=createWebGpuWallFragmentAssets({kinds:['soil'],sampled:playback.rigid}),root=new THREE.Group();scene.add(root);const rigid=assets.instantiate(root);for(const object of root.children)bindWebGpuFootstepSamples(object,samples,3);assert.match(build(root.children[0]),/textureLoad/);rigid.dispose();assets.dispose();
 }finally{geometry.dispose();material.dispose();samples.dispose();atlas.dispose();playback.dispose();}
});
