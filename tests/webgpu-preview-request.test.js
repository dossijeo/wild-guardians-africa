import test from 'node:test';
import assert from 'node:assert/strict';
import {runWebGpuPreview} from '../src/rendering/webgpu-preview-request.js';

test('a failed provisional presentation reports its own resource without stopping later work',()=>{
 const notices=[],report=value=>notices.push(value);
 assert.equal(runWebGpuPreview({resource:'crop-preview',begin:()=>false,report}),false);
 assert.equal(runWebGpuPreview({resource:'structure-preview',begin:()=>{throw Error('terrain missing');},report}),false);
 assert.equal(runWebGpuPreview({resource:'crop-preview',begin:()=>true,report}),true);
 assert.deepEqual(notices,[{resource:'crop-preview',message:'Preview unavailable'},{resource:'structure-preview',message:'terrain missing'}]);
});

test('a missing presentation surface cannot report a successful preview',()=>{
 const notices=[];assert.equal(runWebGpuPreview({resource:'crop-preview',begin:()=>undefined,report:value=>notices.push(value)}),false);assert.equal(notices.length,1);
});
