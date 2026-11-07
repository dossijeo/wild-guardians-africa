import test from 'node:test';
import assert from 'node:assert/strict';
import {Float32BufferAttribute} from 'three';
import {buildingFacePolicy,buildingFaceShaders,buildingFacePolicyFromInterleaved} from '../src/rendering/building-face-policy.js';
test('opposite authored faces retain their own front; same winding duplicates are suppressed',()=>{
 const a=[0,0,0],b=[1,0,0],c=[0,1,0],d=[2,2,2];
 const p=new Float32BufferAttribute([a,b,c,c,b,a,b,c,a,a,b,d].flat(),3);
 assert.deepEqual([...buildingFacePolicy(p)],[1,1,1,1,1,1,2,2,2,0,0,0]);
});
test('single-sided duplicate groups keep one double-sided face and ignore collapsed triangles',()=>{
 const p=new Float32BufferAttribute([0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0],3);
 assert.deepEqual([...buildingFacePolicy(p)],[0,0,0,2,2,2,0,0,0]);
});
test('color and depth share discard; inner recession, ash and collapse retain original policy',()=>{
 const shader=buildingFaceShaders('void main(){}','void main(){}');
 assert.match(shader.vertex,/uMode==0&&uInner<.5&&uDamage<=.79/);
 assert.match(shader.fragment,/!gl_FrontFacing/);
});
test('worker interleaved preparation transfers identical classifications without renderer objects',()=>{
 const xyz=[0,0,0,1,0,0,0,1,0,0,1,0,1,0,0,0,0,0],data=new Float32Array(6*12);
 for(let i=0;i<6;i++)data.set(xyz.slice(i*3,i*3+3),i*12);
 const policy=buildingFacePolicyFromInterleaved(data),expected=buildingFacePolicy(new Float32BufferAttribute(xyz,3));
 const transferred=structuredClone(policy,{transfer:[policy.buffer]});
 assert.equal(policy.byteLength,0);assert.deepEqual(transferred,expected);
 assert.throws(()=>buildingFacePolicyFromInterleaved(new Float32Array(13)),/complete building triangles/);
});
