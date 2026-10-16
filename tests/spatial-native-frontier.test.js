import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLazySectorProbeSync} from '../src/world/hierarchical-wasm/lazy-sectors-adapter.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;

test('native unknown connectivity identifies the actual missing frontier sector',
  {skip:!binary},()=>{
    const module=new WebAssembly.Module(readFileSync(binary));
    const walkable=(x,z)=>x>=0&&x<24&&z>=0&&z<8;
    const nav={walkable,segmentClear:(a,b)=>walkable(a.x,a.z)&&walkable(b.x,b.z)};
    const probe=createLazySectorProbeSync(module,nav,{sectorSize:8});
    probe.ensureSector(0,0);probe.ensureSector(2,0);
    assert.equal(probe.connected({x:3,z:3},{x:19,z:3}),-1);
    assert.equal(probe.wasm.lazy_connected_reason(),8);
    assert.equal(probe.wasm.lazy_connected_frontier_valid(),1);
    assert.deepEqual({x:probe.wasm.lazy_connected_frontier_x(),
      z:probe.wasm.lazy_connected_frontier_z()},{x:12,z:4});
    probe.ensureSector(1,0);
    assert.equal(probe.connected({x:3,z:3},{x:19,z:3}),1);
  });
