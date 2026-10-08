import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {partitionCropGeometry} from '../tools/lib/frontside-crop-partition.mjs';
test('stable partition preserves corners, UV lanes, live instance buffers and source provenance',()=>{
 const source=new THREE.InstancedBufferGeometry();
 source.setAttribute('position',new THREE.Float32BufferAttribute(Array.from({length:27},(_,i)=>i/10),3));
 source.setAttribute('uv',new THREE.Float32BufferAttribute(Array.from({length:18},(_,i)=>i/20),2));
 source.setAttribute('iGrowth',new THREE.InstancedBufferAttribute(new Float32Array([.3,.7]),1));
 source.setIndex([0,1,2,3,4,5,6,7,8]);source.userData.qaTriangleSourceFaces=[12,16,20];
 const original=Array.from(source.index.array),out=partitionCropGeometry(source,[2,1,3]);
 assert.deepEqual(out.sourceFaceOrder,[1,0,2]);assert.deepEqual(out.geometry.userData.qaTriangleSourceFaces,[16,12,20]);
 for(const key of Object.keys(source.attributes))assert.equal(out.geometry.getAttribute(key),source.getAttribute(key));
 assert.deepEqual(Array.from(source.index.array),original);assert.equal(source.groups.length,0);
 out.sourceFaceOrder.forEach((face,newFace)=>assert.deepEqual(Array.from(out.geometry.index.array.slice(newFace*3,newFace*3+3)),original.slice(face*3,face*3+3)));
 assert.equal(out.additionalActiveIndexBytes,0);source.attributes.iGrowth.array[0]=.8;assert.equal(out.geometry.attributes.iGrowth.array[0],source.attributes.iGrowth.array[0]);
});
test('unindexed bridge adds only sequential-partition indices and rejects incomplete labels',()=>{
 const source=new THREE.BufferGeometry();source.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(18),3));
 const out=partitionCropGeometry(source,[4,0]);assert.deepEqual(Array.from(out.geometry.index.array),[3,4,5,0,1,2]);assert.equal(out.additionalActiveIndexBytes,12);
 assert.throws(()=>partitionCropGeometry(source,[0]),/Invalid face labels/);assert.equal(source.index,null);
});

test('stem-only subset keeps soil and leaves in the Double group with exact driver correspondence',()=>{
 const source=new THREE.InstancedBufferGeometry();source.setAttribute('position',new THREE.Float32BufferAttribute(Array.from({length:27},(_,i)=>i),3));
 source.setAttribute('aRoot',new THREE.Float32BufferAttribute(Array.from({length:27},(_,i)=>100+i),3));source.setIndex([0,1,2,3,4,5,6,7,8]);
 const out=partitionCropGeometry(source,[0,1,5],[1]);assert.equal(out.frontFaces,1);assert.equal(out.doubleFaces,2);
 assert.deepEqual(out.sourceFaceOrder,[1,0,2]);assert.deepEqual(out.geometry.userData.qaFaceLabels,[1,0,5]);
 assert.deepEqual(out.geometry.groups,[{start:0,count:3,materialIndex:0},{start:3,count:6,materialIndex:1}]);
 assert.equal(out.geometry.attributes.aRoot,source.attributes.aRoot);assert.deepEqual(Array.from(out.geometry.index.array),[3,4,5,0,1,2,6,7,8]);
 assert.throws(()=>partitionCropGeometry(source,[0,1,5],[1,1]),/Invalid Front regional subset/);
});
