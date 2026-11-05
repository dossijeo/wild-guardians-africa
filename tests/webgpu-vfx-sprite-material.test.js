import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import NodeFrame from '../node_modules/three/src/nodes/core/NodeFrame.js';
import {createWebGpuVfxSpriteGraph,createWebGpuVfxSpriteMaterial} from '../src/rendering/webgpu-vfx-sprite-material.js';

test('sprite effects share shader graphs while material references remain independent',()=>{
 const atlas=new THREE.Texture(),graph=createWebGpuVfxSpriteGraph(atlas),a=createWebGpuVfxSpriteMaterial(graph),b=createWebGpuVfxSpriteMaterial(graph),frame=new NodeFrame();
 try{assert.notEqual(a.material,b.material);assert.equal(a.material.vertexNode,b.material.vertexNode);assert.equal(a.material.outputNode,b.material.outputNode);assert.equal(a.material.customProgramCacheKey(),b.material.customProgramCacheKey());a.uEye.value.set(1,2,3);b.uEye.value.set(7,8,9);a.lightCol[0].value.set(.1,.2,.3);b.lightCol[0].value.set(.4,.5,.6);
  for(const item of [a,b]){frame.material=item.material;frame.object=new THREE.Mesh(new THREE.BufferGeometry(),item.material);for(const ref of Object.values(graph.references)){frame.updateNode(ref);assert.equal(ref.node.value,item.material[ref.property]);}frame.object.geometry.dispose();}
  a.uEye.value.x=15;assert.equal(b.uEye.value.x,7);assert.equal(a.material.customProgramCacheKey(),b.material.customProgramCacheKey());
 }finally{a.material.dispose();b.material.dispose();atlas.dispose();}
});
