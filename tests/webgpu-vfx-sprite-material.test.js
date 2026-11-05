import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import NodeFrame from '../node_modules/three/src/nodes/core/NodeFrame.js';
import {createWebGpuVfxSpriteGraph,createWebGpuVfxSpriteMaterial,bindWebGpuVfxSpriteObject} from '../src/rendering/webgpu-vfx-sprite-material.js';

test('sprite effects share shader graphs while material references remain independent',()=>{
 const atlas=new THREE.Texture(),graph=createWebGpuVfxSpriteGraph(atlas),material=createWebGpuVfxSpriteMaterial(graph),meshes=[new THREE.Mesh(new THREE.BufferGeometry(),material),new THREE.Mesh(new THREE.BufferGeometry(),material)],a=bindWebGpuVfxSpriteObject(meshes[0]),b=bindWebGpuVfxSpriteObject(meshes[1]),frame=new NodeFrame();
 try{assert.equal(meshes[0].material,meshes[1].material);a.uEye.value.set(1,2,3);b.uEye.value.set(7,8,9);a.lightCol[0].value.set(.1,.2,.3);b.lightCol[0].value.set(.4,.5,.6);const key=material.customProgramCacheKey();
  for(const mesh of meshes){frame.material=material;frame.object=mesh;for(const ref of Object.values(graph.references)){frame.updateNode(ref);assert.equal(ref.node.value,mesh[ref.property]);}}
  a.uEye.value.x=15;assert.equal(b.uEye.value.x,7);assert.equal(material.customProgramCacheKey(),key);
 }finally{material.dispose();for(const mesh of meshes)mesh.geometry.dispose();atlas.dispose();}
});
