import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLazySectorProbe,createLazySectorProbeSync} from '../src/world/wild-engine/lazy-sectors-adapter.js';
import {fixture} from '../tools/probe-raid-reservation-saturation.mjs';

const bytes=readFileSync(new URL('../src/world/wild-engine/lazy-sectors.wasm',import.meta.url));
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
  assert.equal(probe.route({x:3,z:12},{x:19,z:12}).status,'unknown');
  probe.ensureRect(0,0,23,23);
  assert.equal(probe.metrics().loaded,9);
  assert.equal(probe.connected({x:3,z:12},{x:19,z:12}),0);
  assert.equal(probe.route({x:3,z:12},{x:19,z:12}).status,'blocked');
  assert.equal(probe.connected({x:3,z:12},{x:5,z:12}),1);
  assert.deepEqual(probe.route({x:3,z:12},{x:5,z:12}).points,[{x:4,z:12},{x:5,z:12}]);
});

test('a local breach updates one sector and its neighboring graph edges',async()=>{
  const {nav,blocked}=wallFixture();
  const probe=await createLazySectorProbe(bytes,nav,{sectorSize:8});
  probe.ensureRect(0,0,23,23);
  assert.equal(probe.connected({x:3,z:12},{x:19,z:12}),0);
  const before=probe.metrics();
  blocked.delete('11,12');probe.loadSector(1,1);
  assert.equal(probe.connected({x:3,z:12},{x:19,z:12}),1);
  const path=probe.route({x:3,z:12},{x:19,z:12});
  assert.equal(path.status,'found');
  let previous={x:3,z:12};
  for(const point of path.points){assert(nav.segmentClear(previous,point));previous=point;}
  assert.deepEqual(previous,{x:19,z:12});
  assert.equal(probe.metrics().loaded,before.loaded);
  assert.equal(probe.metrics().updates,before.updates+1);
  blocked.add('11,12');probe.loadSector(1,1);
  assert.equal(probe.connected({x:3,z:12},{x:19,z:12}),0);
  assert.equal(probe.route({x:3,z:12},{x:19,z:12}).status,'blocked');
});

test('synchronous probe invalidates only loaded sectors touched by a topology edit',()=>{
  const {nav,blocked}=wallFixture();
  const probe=createLazySectorProbeSync(new WebAssembly.Module(bytes),nav,{sectorSize:8});
  probe.ensureRect(0,0,23,23);
  const before=probe.metrics();
  blocked.delete('11,12');probe.invalidateRect(11,12,11,12);
  assert.equal(probe.route({x:3,z:12},{x:19,z:12}).status,'found');
  assert.equal(probe.metrics().loaded,before.loaded);
  assert(probe.metrics().updates>before.updates);
  probe.clear();assert.equal(probe.metrics().loaded,0);
  assert.equal(probe.route({x:3,z:12},{x:19,z:12}).status,'unknown');
});

test('cross-sector connectivity preserves directional edges',async()=>{
  const walkable=(x,z)=>x>=0&&x<16&&z>=0&&z<8;
  const nav={walkable,segmentClear:(a,b)=>walkable(a.x,a.z)&&walkable(b.x,b.z)&&b.x>=a.x};
  const probe=await createLazySectorProbe(bytes,nav,{sectorSize:8});
  probe.ensureRect(0,0,15,7);
  assert.equal(probe.connected({x:2,z:3},{x:13,z:3}),1);
  assert.equal(probe.connected({x:13,z:3},{x:2,z:3}),0);
  assert.equal(probe.route({x:2,z:3},{x:13,z:3}).status,'found');
  assert.notEqual(probe.route({x:13,z:3},{x:2,z:3}).status,'found');
});

test('an unsampled one-way entrance cannot be certified as a sealed target',async()=>{
  const walkable=(x,z)=>x>=0&&x<24&&z>=0&&z<8;
  const nav={walkable,segmentClear:(a,b)=>walkable(a.x,a.z)&&walkable(b.x,b.z)&&b.x<=a.x};
  const probe=await createLazySectorProbe(bytes,nav,{sectorSize:8});
  probe.ensureSector(0,0);probe.ensureSector(2,0);
  assert.equal(probe.route({x:18,z:3},{x:5,z:3}).status,'unknown');
  probe.ensureSector(1,0);
  assert.equal(probe.route({x:18,z:3},{x:5,z:3}).status,'found');
});

test('native automatic gate is a worker portal and never an animal crossing',async()=>{
  const {s,nav}=fixture('closed-walls');
  const gate=s.structures.find(o=>o.id==='wall-2-5');gate.gate=true;gate.gateOpen=true;nav.setState(s);
  const outside={x:15,z:29},inside={x:15,z:7};
  const worker=await createLazySectorProbe(bytes,nav,{sectorSize:12,radius:.28,worker:true});
  worker.ensureRect(-12,-18,42,38);
  const result=worker.route(outside,inside);
  assert.equal(result.status,'found');
  let previous=outside;
  for(const point of result.points){assert(nav.segmentClear(previous,point,.28,null,true));previous=point;}
  assert.deepEqual(previous,inside);
  const animal=await createLazySectorProbe(bytes,nav,{sectorSize:12,radius:1.1,worker:false});
  animal.ensureRect(-12,-18,42,38);
  assert.equal(animal.route(outside,inside).status,'blocked');
  gate.gate=false;gate.gateOpen=false;nav.setState(s);
  worker.refreshPortals();
  worker.loadSector(Math.floor(gate.x/12),Math.floor(gate.z/12));
  assert.notEqual(worker.route(outside,inside).status,'found');
});
