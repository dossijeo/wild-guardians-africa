import test from 'node:test';
import assert from 'node:assert/strict';
import {indexConfirmedGrassWater,nearGrassWater} from '../src/rendering/grass-water.js';

test('confirmed water triangles exclude grass across chunk boundaries',()=>{
 const left=indexConfirmedGrassWater({cx:0,cz:0,water:new Float32Array()},.6),right=indexConfirmedGrassWater({cx:1,cz:0,water:new Float32Array([-23.9,0,0,-22,0,0,-23.9,0,2])},.6),chunks=new Map([['0,0',left],['1,0',right]]);
 assert.equal(right.waterTriangleCount,1);assert.equal(nearGrassWater(chunks,left,23.9,.5,.6),true);assert.equal(nearGrassWater(chunks,right,24.2,.5,.6),true);assert.equal(nearGrassWater(chunks,left,22,.5,.6),false);chunks.delete('1,0');assert.equal(nearGrassWater(chunks,left,23.9,.5,.6),false);
});

test('confirmed water ignores degenerate triangles and rejects malformed buffers',()=>{
 const result=indexConfirmedGrassWater({cx:0,cz:0,water:new Float32Array(9)},.6);assert.equal(result.waterTriangleCount,0);assert.equal(result.waterTriangles.size,0);assert.throws(()=>indexConfirmedGrassWater({cx:0,cz:0,water:new Float32Array(1)},.6),/Invalid/);
});
