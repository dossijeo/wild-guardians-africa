import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../tools/probe-raid-reservation-saturation.mjs';
import {createHierarchicalNavigationAdapter} from '../src/world/hierarchical-navigation-adapter.js';
import {createHierarchicalWasmNavigator,createHierarchicalWasmNavigatorSync} from '../src/world/hierarchical-wasm-adapter.js';
import {readFileSync} from 'node:fs';

const wasm=readFileSync(new URL('../src/world/hierarchical-wasm/core.wasm',import.meta.url));

test('new sector graph respects a native closed wall and its physical breach',()=>{
  const {s,nav}=fixture('closed-walls'),adapter=createHierarchicalNavigationAdapter(nav);
  const outside={x:15,z:29},inside={x:15,z:7},radius=1.1;
  assert.equal(adapter.path(outside,inside,radius,null,false,24),null);
  for(const id of ['wall-2-4','wall-2-5']){
    const wall=s.structures.find(t=>t.id===id);wall.status='ruined';wall.hp=0;
  }
  nav.setState(s);adapter.invalidateRect(11,16,19,21);
  const route=adapter.path(outside,inside,radius,null,false,24);
  assert(route?.length>0,'a two-module opening must be usable');
  let previous=outside;
  for(const point of route){assert(nav.segmentClear(previous,point,radius,null,false));previous=point;}
});

test('a native open gate becomes a worker portal but never an animal crossing',()=>{
  const {s,nav}=fixture('closed-walls');
  const wall=s.structures.find(t=>t.id==='wall-2-5');wall.gate=true;wall.gateOpen=true;nav.setState(s);
  const adapter=createHierarchicalNavigationAdapter(nav),outside={x:15,z:29},inside={x:15,z:7};
  const worker=adapter.path(outside,inside,.28,null,true,24);
  assert(worker?.length>0);
  let previous=outside;
  for(const point of worker){assert(nav.segmentClear(previous,point,.28,null,true));previous=point;}
  assert.equal(adapter.path(outside,inside,1.1,null,false,24),null);
});

test('C++ worker graph uses the physical gate portal and excludes animals',async()=>{
  const {s,nav}=fixture('closed-walls');
  const wall=s.structures.find(t=>t.id==='wall-2-5');wall.gate=true;wall.gateOpen=true;nav.setState(s);
  const bounds={minX:-12,minZ:-18,maxX:42,maxZ:38,sectorSize:12};
  const worker=await createHierarchicalWasmNavigator(wasm,nav,{...bounds,radius:.28,worker:true,diagonal:true});worker.initialize();
  const outside={x:15,z:29},inside={x:15,z:7};
  for(const route of [worker.route(outside,inside),worker.flatRoute(outside,inside)]){
    assert(route?.length>0);
    let previous=outside;
    for(const point of route){assert(point&&nav.segmentClear(previous,point,.28,null,true));previous=point;}
  }
  assert.equal(worker.region(outside)?.key,worker.region(inside)?.key,'the open gate joins worker regions');
  const animal=await createHierarchicalWasmNavigator(wasm,nav,{...bounds,radius:1.1,worker:false});animal.initialize();
  assert.equal(animal.route(outside,inside),null);
  assert.notEqual(animal.region(outside)?.key,animal.region(inside)?.key);
  wall.gate=false;wall.gateOpen=false;nav.setState(s);
  worker.syncRect(wall.x-5,wall.z-5,wall.x+5,wall.z+5);
  assert.equal(worker.route(outside,inside),null,'removing the gate must remove its graph portal');
  assert.equal(worker.flatRoute(outside,inside),null);
  assert.notEqual(worker.region(outside)?.key,worker.region(inside)?.key);
});

test('synchronous WASM facade keeps fractional worker endpoints physically valid',()=>{
  const {s,nav}=fixture('closed-walls');
  const wall=s.structures.find(t=>t.id==='wall-2-5');wall.gate=true;wall.gateOpen=true;nav.setState(s);
  const module=new WebAssembly.Module(wasm);
  const core=createHierarchicalWasmNavigatorSync(module,nav,{minX:-12,minZ:-18,maxX:42,maxZ:38,radius:.28,worker:true,diagonal:true});
  core.initialize();
  const start={x:15.2,z:29.1},end={x:15.2,z:7.1};
  for(const route of [core.path(start,end),core.path(start,end,{flat:true})]){
    assert(route?.length>0);
    assert.deepEqual(route.at(-1),end);
    let previous=start;
    for(const point of route){assert(nav.segmentClear(previous,point,.28,null,true));previous=point;}
  }
});
