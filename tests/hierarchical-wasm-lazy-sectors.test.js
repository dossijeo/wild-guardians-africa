import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLazySectorProbe} from '../src/world/hierarchical-wasm/lazy-sectors-adapter.js';

const bytes=readFileSync(new URL('../src/world/hierarchical-wasm/lazy-sectors.wasm',import.meta.url));
function wallFixture(){
  const blocked=new Set();for(let z=0;z<24;z++)blocked.add(`11,${z}`);
  const walkable=(x,z)=>x>=0&&x<24&&z>=0&&z<24&&!blocked.has(`${x},${z}`);
  return {blocked,nav:{walkable,segmentClear:(a,b)=>walkable(a.x,a.z)&&walkable(b.x,b.z)}};
}

test('unloaded sectors stay unknown; a closed barrier becomes certified after coverage',async()=>{
  const {nav}=wallFixture();
  const probe=await createLazySectorProbe(bytes,nav,{sectorSize:8});
  probe.ensureSector(0,1);
  assert.equal(probe.connected({x:3,z:12},{x:19,z:12}),-1);
  probe.ensureRect(0,0,23,23);
  assert.equal(probe.metrics().loaded,9);
  assert.equal(probe.connected({x:3,z:12},{x:19,z:12}),0);
  assert.equal(probe.connected({x:3,z:12},{x:5,z:12}),1);
});

test('a local breach updates one sector and its neighboring graph edges',async()=>{
  const {nav,blocked}=wallFixture();
  const probe=await createLazySectorProbe(bytes,nav,{sectorSize:8});
  probe.ensureRect(0,0,23,23);
  assert.equal(probe.connected({x:3,z:12},{x:19,z:12}),0);
  const before=probe.metrics();
  blocked.delete('11,12');probe.loadSector(1,1);
  assert.equal(probe.connected({x:3,z:12},{x:19,z:12}),1);
  assert.equal(probe.metrics().loaded,before.loaded);
  assert.equal(probe.metrics().updates,before.updates+1);
  blocked.add('11,12');probe.loadSector(1,1);
  assert.equal(probe.connected({x:3,z:12},{x:19,z:12}),0);
});

test('cross-sector connectivity preserves directional edges',async()=>{
  const walkable=(x,z)=>x>=0&&x<16&&z>=0&&z<8;
  const nav={walkable,segmentClear:(a,b)=>walkable(a.x,a.z)&&walkable(b.x,b.z)&&b.x>=a.x};
  const probe=await createLazySectorProbe(bytes,nav,{sectorSize:8});
  probe.ensureRect(0,0,15,7);
  assert.equal(probe.connected({x:2,z:3},{x:13,z:3}),1);
  assert.equal(probe.connected({x:13,z:3},{x:2,z:3}),0);
});
