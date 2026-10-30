import test from 'node:test';
import assert from 'node:assert/strict';
import {Float32BufferAttribute} from 'three';
import {buildingFacePolicy,buildingFaceShaders} from '../src/rendering/building-face-policy.js';
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
