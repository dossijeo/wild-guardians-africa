import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import NodeFrame from '../node_modules/three/src/nodes/core/NodeFrame.js';
import {createWebGpuVfxGeometry,webGpuVfxGeometryGraph} from '../src/rendering/webgpu-vfx-geometry.js';

test('shield geometry shares its shader while retaining independent eye and time values',()=>{
 const root=new THREE.Group(),a=createWebGpuVfxGeometry(root),b=createWebGpuVfxGeometry(root),graph=webGpuVfxGeometryGraph(),frame=new NodeFrame();
 try{a.eye.value.set(1,2,3);b.eye.value.set(7,8,9);a.time.value=.2;b.time.value=1.7;a.update(new Float32Array(33));b.update(new Float32Array(33));assert.equal(a.mesh.material.outputNode,b.mesh.material.outputNode);assert.equal(a.mesh.material.customProgramCacheKey(),b.mesh.material.customProgramCacheKey());for(const item of [a,b]){frame.object=item.mesh;frame.material=item.mesh.material;frame.updateNode(graph.eye);assert.equal(graph.eye.node.value,item.eye.value);frame.updateNode(graph.time);assert.equal(graph.time.node.value,item.time.value);}a.time.value=2;assert.equal(b.time.value,1.7);assert.equal(a.mesh.material.customProgramCacheKey(),b.mesh.material.customProgramCacheKey());
 }finally{a.dispose();b.dispose();}
});
