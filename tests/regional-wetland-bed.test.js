import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegionalWetlandBed} from '../tools/experiments/regional-wetland-bed.js';
test('regional bed preserves native optical depth and shore distance in the near-water encoding',()=>{
 const encoder=createRegionalWetlandBed({minX:-432,maxX:432,minZ:-432,maxZ:432},2,2,3.34),samples=[{mask:0,shore:0,inside:false},{mask:.61,shore:.1,inside:false},{mask:.8,shore:2,inside:true},{mask:1,shore:10,inside:true}];
 assert.deepEqual(samples.map(p=>encoder.sample(p)),[0,0,1,1]);const b=encoder.finish();
 for(let i=0;i<4;i++){const h=b.lo+(b.bytes[i*4]*256+b.bytes[i*4+1])/65535*b.span;assert(Math.abs(h-(3.34-Math.max(0,samples[i].mask-.61)*3))<=b.span/65535);assert(Math.abs(b.bytes[i*4+2]/255*4-Math.min(4,samples[i].shore))<=4/255);}
 assert.equal(b.width,864);assert.equal(b.minX,-432);assert.equal(b.bytes.byteLength,16);
});
test('regional bed rejects incomplete buffers instead of publishing uninitialized shore data',()=>{
 const e=createRegionalWetlandBed({minX:0,maxX:1,minZ:0,maxZ:1},2,2,3.34);assert.throws(()=>e.finish(),/Incomplete/);assert.throws(()=>e.sample({mask:NaN,shore:0}),/Invalid/);
});
