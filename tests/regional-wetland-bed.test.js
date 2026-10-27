import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegionalWetlandBed} from '../tools/experiments/regional-wetland-bed.js';
test('regional bed preserves native optical depth and shore distance in the near-water encoding',()=>{
 const encoder=createRegionalWetlandBed({minX:-432,maxX:432,minZ:-432,maxZ:432},2,2,3.34),samples=[{mask:0,shore:0,inside:false},{mask:.61,shore:.1,inside:false},{mask:.8,shore:2,inside:true},{mask:1,shore:10,inside:true}];
 const coverage=samples.map(p=>encoder.sample(p));[0,.5,.69,.89].forEach((v,i)=>assert.ok(Math.abs(coverage[i]-v)<1e-12));const b=encoder.finish();
 for(let i=0;i<4;i++){const h=b.lo+(b.bytes[i*4]*256+b.bytes[i*4+1])/65535*b.span;assert(Math.abs(h-(3.34-Math.max(0,samples[i].mask-.61)*3))<=b.span/65535);assert(Math.abs(b.bytes[i*4+3]/255*4-Math.min(4,samples[i].shore))<=4/255);}
 assert.equal(b.width,864);assert.equal(b.minX,-432);assert.equal(b.bytes.byteLength,16);
});
test('regional bed rejects incomplete buffers instead of publishing uninitialized shore data',()=>{
 const e=createRegionalWetlandBed({minX:0,maxX:1,minZ:0,maxZ:1},2,2,3.34);assert.throws(()=>e.finish(),/Incomplete/);assert.throws(()=>e.sample({mask:NaN,shore:0}),/Invalid/);
});

test('physical bank distance is independent of sediment mask and respects anisotropic cells',()=>{
 const e=createRegionalWetlandBed({minX:0,maxX:8,minZ:0,maxZ:4},5,5,3.34);
 for(let z=0;z<5;z++)for(let x=0;x<5;x++)e.sample({mask:.61+(x*2-3)*.05,shore:4,inside:x*2>3});
 const b=e.finish();for(let z=0;z<5;z++)for(let x=0;x<5;x++){
  const i=(z*5+x)*4;assert.ok(Math.abs(b.bytes[i+2]/255*4-Math.min(4,Math.abs(x*2-3)))<.02);assert.equal(b.bytes[i+3],255);
 }
});
test('fully wet regions have no artificial shore along their rectangle',()=>{
 const e=createRegionalWetlandBed({minX:0,maxX:8,minZ:0,maxZ:8},3,3,3.34);
 for(let i=0;i<9;i++)e.sample({mask:1,shore:4,inside:true});
 const b=e.finish();for(let i=0;i<9;i++)assert.equal(b.bytes[i*4+2],255);
});

test('continuous coverage preserves an off-centre contour instead of moving it to half a cell',()=>{
 const encoder=createRegionalWetlandBed({minX:0,minZ:0,maxX:4,maxZ:4},2,2,3.34);
 const samples=[.59,.67,.59,.67].map(mask=>encoder.sample({mask,inside:mask>.61,shore:Math.abs(mask-.61)*52}));encoder.finish();
 const bytes=samples.map(v=>Math.round(v*255)),crossing=4*(127.5-bytes[0])/(bytes[1]-bytes[0]);
 assert.ok(Math.abs(crossing-1)<.1,'Expected contour at one metre, not binary midpoint at two metres');
});
