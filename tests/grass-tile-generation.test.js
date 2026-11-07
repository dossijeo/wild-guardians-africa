import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {grassChunkFromConfirmedPayload} from '../src/rendering/grass-terrain-sampling.js';
import {generateGrassTile} from '../src/rendering/grass-tile-generation.js';

test('confirmed mangrove terrain produces deterministic grass and respects water and obstacles',()=>{
 const wasm=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),core=createSpatialWorld(wasm);core.generate(123,0,0,'mangrove',{mangroveNetwork:true});const before=core.snapshot(),payload=core.chunkPayload(),chunk=grassChunkFromConfirmedPayload(payload);
 const options={spacing:.65,seed:123,varied:false,river:false,mangrove:true,fern:true,edgePadding:.6,blockers:new Map(),nearWater:()=>false,stats:{candidates:0,masked:0}};
 const first=generateGrassTile(chunk,0,0,options);assert.deepEqual(first,generateGrassTile(chunk,0,0,{...options,stats:{candidates:0,masked:0}}));assert.ok(first.items.length>0);assert.equal(generateGrassTile(chunk,0,0,{...options,nearWater:()=>true,stats:{candidates:0,masked:0}}).items.length,0);assert.equal(generateGrassTile(chunk,0,0,{...options,blockers:new Map([-1,0,1].flatMap(x=>[-1,0,1].map(z=>[`${x},${z}`,[{x:4,z:4,r:20}]]))),stats:{candidates:0,masked:0}}).items.length,0);assert.deepEqual(core.snapshot(),before);
});

test('confirmed grass input rejects missing and malformed terrain',()=>{
 assert.throws(()=>grassChunkFromConfirmedPayload({authority:'spatial-wasm',cx:0,cz:0,terrain:{positions:new Float32Array(3)},groundMask:new Uint8Array(4)}),/Invalid confirmed/);
});
