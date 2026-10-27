import test from 'node:test';import assert from 'node:assert/strict';
import {bakeFarTreeShadows} from '../tools/experiments/far-tree-shadow-bake.js';
const map=()=>({width:21,height:21,bounds:{minX:-10,minZ:-10,maxX:10,maxZ:10},data:Uint8Array.from({length:21*21*4},(_,i)=>i%4===3?0:200)});
test('regional shadow union is bounded, idempotent for duplicate casters and preserves water',()=>{
 const a=map(),b=map(),tree={x:0,z:0,sx:1,sy:1,sz:1};a.data[220*4+3]=255;b.data[220*4+3]=255;
 const before=a.data.slice(),result=bakeFarTreeShadows(a,[tree],{height:0});bakeFarTreeShadows(b,[tree,tree],{height:0});assert.deepEqual(a.data,b.data);assert.ok(result.affected>0);assert.equal(result.temporaryBytes,441);
 for(let i=0;i<441;i++){assert.equal(a.data[i*4+3],before[i*4+3]);for(let c=0;c<3;c++)assert.ok(a.data[i*4+c]>=140&&a.data[i*4+c]<=200);}assert.equal(a.data[220*4],200);
});
test('projected shadow moves opposite the light and does not wrap at region borders',()=>{
 const a=map();bakeFarTreeShadows(a,[{x:0,z:0}],{sun:[1,1,0],height:6,radius:1});assert.ok(a.data[(10*21+4)*4]<200);assert.equal(a.data[(10*21+16)*4],200);
 const b=map(),before=b.data.slice();bakeFarTreeShadows(b,[{x:1000,z:1000}]);assert.deepEqual(b.data,before);
});
