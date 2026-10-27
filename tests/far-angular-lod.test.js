import test from 'node:test';
import assert from 'node:assert/strict';
import {horizonCardWeight,angularLodMix} from '../tools/experiments/far-impostor-math.js';
test('distant horizontal view retains cards while overhead uses geometry',()=>{
 assert.equal(horizonCardWeight(200,20),1);
 assert.equal(angularLodMix(200,20,90,120),1);
 assert.equal(angularLodMix(200,200,90,120),0);
 assert.equal(angularLodMix(0,30,90,120),0);
});
test('unprepared geometry never hides its fallback; preparation converges',()=>{
 assert.equal(angularLodMix(200,200,90,120,0),1);
 assert.equal(angularLodMix(200,200,90,120,.5),.5);
 assert.equal(angularLodMix(200,200,90,120,1),0);
});
test('angular band is continuous and monotonic',()=>{
 let previous=1;for(let y=0;y<200;y++){const value=angularLodMix(200,y,90,120);assert.ok(value<=previous);assert.ok(previous-value<.03);previous=value;}
 assert.equal(previous,0);
});
