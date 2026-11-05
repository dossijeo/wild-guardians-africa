import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import NodeFrame from '../node_modules/three/src/nodes/core/NodeFrame.js';
import {createWebGpuVfxGeometry,createWebGpuVfxGeometryMaterial,webGpuVfxGeometryGraph} from '../src/rendering/webgpu-vfx-geometry.js';

test('shield geometry shares its shader while retaining independent eye and time values',()=>{
 const root=new THREE.Group(),material=createWebGpuVfxGeometryMaterial(),a=createWebGpuVfxGeometry(root,{material}),b=createWebGpuVfxGeometry(root,{material}),graph=webGpuVfxGeometryGraph(),frame=new NodeFrame();let disposed=0;material.addEventListener('dispose',()=>disposed++);
 try{a.eye.value.set(1,2,3);b.eye.value.set(7,8,9);a.time.value=.2;b.time.value=1.7;a.update(new Float32Array(33));b.update(new Float32Array(33));assert.equal(a.mesh.material,b.mesh.material);for(const item of [a,b]){frame.object=item.mesh;frame.material=item.mesh.material;frame.updateNode(graph.eye);assert.equal(graph.eye.node.value,item.eye.value);frame.updateNode(graph.time);assert.equal(graph.time.node.value,item.time.value);}a.time.value=2;assert.equal(b.time.value,1.7);a.dispose();assert.equal(disposed,0);
 }finally{a.dispose();b.dispose();material.dispose();}assert.equal(disposed,1);
});
