import test from 'node:test';
import assert from 'node:assert/strict';
import {downsamplePrelitLinear} from '../tools/experiments/downsample-prelit-linear.js';
test('transparent colored texels do not contaminate foliage edges',()=>{
 const r=downsamplePrelitLinear(new Uint8Array([255,0,0,255,0,255,0,0,0,0,255,0,255,255,255,0]),2,2);
 assert.deepEqual([...r.data],[137,0,0,64]);
});
test('opaque colors survive supersampling and alpha remains opaque',()=>{
 const r=downsamplePrelitLinear(new Uint8Array(Array(4).fill([81,125,32,255]).flat()),2,2);
 assert.deepEqual([...r.data],[81,125,32,255]);
});
test('invalid dimensions are rejected',()=>assert.throws(()=>downsamplePrelitLinear(new Uint8Array(16),2,2,3)));
