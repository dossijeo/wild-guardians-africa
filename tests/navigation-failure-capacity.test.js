import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLazySectorProbeSync} from '../src/world/hierarchical-wasm/lazy-sectors-adapter.js';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/hierarchical-wasm/lazy-sectors.wasm',import.meta.url)));
function fixture(){
  const blocked=new Set();for(let z=0;z<24;z++)blocked.add(`11,${z}`);
  const walkable=(x,z)=>x>=0&&x<24&&z>=0&&z<24&&!blocked.has(`${x},${z}`);
  const nav={walkable,segmentClear:(a,b)=>walkable(a.x,a.z)&&walkable(b.x,b.z)};
  const probe=createLazySectorProbeSync(module,nav,{sectorSize:8});
  return {blocked,probe};
}

test('many failed destinations reuse resident sectors without growing a per-target cache',()=>{
  const {probe}=fixture(),start={x:3,z:12};probe.ensureRect(0,0,23,23);
  assert.equal(probe.route(start,{x:19,z:12}).status,'blocked');
  const before=probe.metrics();
  for(let i=0;i<1000;i++){
    const end={x:12+i%12,z:Math.floor(i/12)%24};
    assert.equal(probe.route(start,end).status,'blocked');
  }
  assert.deepEqual(probe.metrics(),before);
});

test('an inconclusive route is never cached as blocked across coverage and a later breach',()=>{
  const {blocked,probe}=fixture(),start={x:3,z:12},end={x:19,z:12};
  probe.ensureSector(0,1);
  for(let i=0;i<100;i++)assert.equal(probe.route(start,end).status,'unknown');
  probe.ensureRect(0,0,23,23);
  assert.equal(probe.route(start,end).status,'blocked');
  const before=probe.metrics();
  blocked.delete('11,12');probe.invalidateRect(11,12,11,12);
  const opened=probe.route(start,end);
  assert.equal(opened.status,'found');assert(opened.points.length>0);
  assert.equal(probe.metrics().loaded,before.loaded);
  blocked.add('11,12');probe.invalidateRect(11,12,11,12);
  assert.equal(probe.route(start,end).status,'blocked');
});
