import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePackedShadow} from '../tools/lib/frontside-shadow-metrics.mjs';
const scale={near:.1,far:10.1,height:2};
test('packed clear versus caster distinguishes missing shadow from equal empty maps',()=>{
 const clear=Uint8Array.of(255,255,255,255),caster=Uint8Array.of(128,0,0,0);
 const empty=comparePackedShadow(clear,clear,scale);assert.equal(empty.alphaIoU,1);assert.equal(empty.passes,true);
 const missing=comparePackedShadow(caster,clear,scale);assert.equal(missing.alphaIoU,0);assert.equal(missing.missingTexels,1);assert.equal(missing.maxWorldDepthDelta,5);assert.equal(missing.passes,false);
});
test('depth threshold is world-scaled and cannot be rescued by identical coverage',()=>{
 const base=Uint8Array.of(128,0,0,0),tiny=Uint8Array.of(128,0,1,0),large=Uint8Array.of(128,2,0,0);
 assert.equal(comparePackedShadow(base,tiny,scale).passes,true);
 const bad=comparePackedShadow(base,large,scale);assert.equal(bad.alphaIoU,1);assert.equal(bad.passes,false);assert.ok(bad.maxWorldDepthDelta>.0002);
 assert.throws(()=>comparePackedShadow(base,large,{...scale,far:0}),/Invalid shadow world/);
});
