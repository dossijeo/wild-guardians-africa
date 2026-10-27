import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialChunkPayload} from '../src/world/wild-engine/spatial-savanna-payload.js';

test('render payload survives WASM memory growth during deferred composition',()=>{
 const memory=new WebAssembly.Memory({initial:1,maximum:2});
 const previous=memory.buffer;let prepared=false;
 const wasm={memory,
  spatial_heights_ptr(){
   if(!prepared){memory.grow(1);prepared=true;new Float32Array(memory.buffer,0,49*49).fill(3);new Float32Array(memory.buffer,10000,49*49*3).fill(.5);new Uint8Array(memory.buffer,41000,35*35*4).fill(127);}
   return 0;
  },
  spatial_colors_ptr:()=>10000,spatial_water_triangles_ptr:()=>40000,
  spatial_water_vertex_count:()=>0,spatial_ground_mask_ptr:()=>41000,
  spatial_prop_count:()=>0,spatial_props_ptr:()=>0};
 const payload=spatialChunkPayload(wasm,2,-1);
 assert.equal(previous.byteLength,0,'The test must actually detach the old buffer');
 assert.equal(payload.terrain.positions[1],3);
 assert(payload.terrain.colors.every(v=>v===.5));
 assert(payload.groundMask.every(v=>v===127));
 assert.equal(payload.water.length,0);
 assert.equal(payload.cx,2);assert.equal(payload.cz,-1);
 // Returned renderer data owns copies and is not a view on mutable WASM data.
 new Float32Array(memory.buffer,10000,49*49*3).fill(0);
 assert(payload.terrain.colors.every(v=>v===.5));
});
