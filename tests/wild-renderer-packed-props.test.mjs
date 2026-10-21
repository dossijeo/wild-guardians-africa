import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePackedProps} from '../src/rendering/wild-renderer/packed-props.js';

test('packed Engine export survives selection changes and WASM memory growth',()=>{
 const memory=new WebAssembly.Memory({initial:1,maximum:2});
 const bytes=new Uint8Array(memory.buffer,128,80);bytes.fill(37);
 let reads=0;
 const engine={memory,spatial_prop_count:()=>{reads++;return 2;},spatial_props_ptr:()=>128};
 const snapshot=capturePackedProps(engine,3,-2);
 assert.equal(reads,1);assert.equal(snapshot.records.length,80);
 bytes.fill(99);memory.grow(1);
 assert.ok(snapshot.records.every(v=>v===37));
 assert.deepEqual([snapshot.cx,snapshot.cz],[3,-2]);
 assert.throws(()=>capturePackedProps({...engine,spatial_prop_count:()=>1e12},0,0),RangeError);
 assert.equal(capturePackedProps({...engine,spatial_prop_count:()=>0},0,0).records.length,0);
});
