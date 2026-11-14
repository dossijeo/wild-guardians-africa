import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import NodeFrame from '../node_modules/three/src/nodes/core/NodeFrame.js';
import {createWebGpuVfxGeometry,createWebGpuVfxGeometryMaterial,webGpuVfxGeometryGraph} from '../src/rendering/webgpu-vfx-geometry.js';

test('growing VFX publishes a new geometry generation and retires old bindings after admission',()=>{
 const releases=[],fx=createWebGpuVfxGeometry(new THREE.Group(),{deferRelease:release=>releases.push(release)});
 try{
  fx.update(new Float32Array(102*11));const firstMesh=fx.mesh,first=firstMesh.geometry,buffer=first.attributes.position.data;let disposed=0;first.addEventListener('dispose',()=>disposed++);
  const content=new Float32Array(432*11).fill(.25);assert.equal(fx.update(content),true);
  assert.notEqual(fx.mesh,firstMesh);assert.equal(firstMesh.geometry,first,'old render object retains its own geometry until disposal');assert.notEqual(fx.mesh.geometry,first);assert.equal(first.attributes.position.data,buffer,'in-flight geometry remains immutable');
  assert.equal(buffer.count,128);assert.equal(fx.mesh.geometry.attributes.position.count,512);assert.equal(fx.mesh.geometry.drawRange.count,432);
  assert.deepEqual(fx.mesh.geometry.attributes.position.data.array.subarray(0,content.length),content);assert.equal(disposed,0);
  const stable=fx.mesh.geometry;assert.equal(fx.update(new Float32Array(450*11)),false);assert.equal(fx.mesh.geometry,stable);
  for(const release of releases.splice(0))release();assert.equal(disposed,1);
 }finally{fx.dispose();for(const release of releases)release();}
});

test('shield geometry shares its shader while retaining independent eye and time values',()=>{
 const root=new THREE.Group(),material=createWebGpuVfxGeometryMaterial(),a=createWebGpuVfxGeometry(root,{material}),b=createWebGpuVfxGeometry(root,{material}),graph=webGpuVfxGeometryGraph(),frame=new NodeFrame();let disposed=0;material.addEventListener('dispose',()=>disposed++);
 try{a.eye.value.set(1,2,3);b.eye.value.set(7,8,9);a.time.value=.2;b.time.value=1.7;a.update(new Float32Array(33));b.update(new Float32Array(33));assert.equal(a.mesh.material,b.mesh.material);for(const item of [a,b]){frame.object=item.mesh;frame.material=item.mesh.material;frame.updateNode(graph.eye);assert.equal(graph.eye.node.value,item.eye.value);frame.updateNode(graph.time);assert.equal(graph.time.node.value,item.time.value);}a.time.value=2;assert.equal(b.time.value,1.7);a.dispose();assert.equal(disposed,0);
 }finally{a.dispose();b.dispose();material.dispose();}assert.equal(disposed,1);
});
