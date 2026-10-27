import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFarWaterPredicate} from '../tools/experiments/verify-far-water-predicate.js';
const mesh=(value,seam=false)=>({userData:{farGround:true,farGroundSeam:seam},geometry:{attributes:{position:{array:new Float32Array([1,2,3])},aFarWater:{array:new Float32Array([value])}}}});
const world=meshes=>({scene:{getObjectsByProperty:()=>meshes},nav:{field:{waterInfo:()=>({inside:true}),fluidInside:()=>true}}});
test('verifier checks real sampled attributes and separately checks zero-valued seam',()=>{
 const result=verifyFarWaterPredicate(world([mesh(1),mesh(0,true)]));assert.equal(result.vertices,1);assert.equal(result.seamVertices,1);assert.equal(result.mismatches,0);
 assert.throws(()=>verifyFarWaterPredicate(world([mesh(0),mesh(0,true)])),/equivalence failed/);
 assert.throws(()=>verifyFarWaterPredicate(world([mesh(1),mesh(1,true)])),/equivalence failed/);
 assert.throws(()=>verifyFarWaterPredicate(world([mesh(0,true)])),/equivalence failed/);
});
