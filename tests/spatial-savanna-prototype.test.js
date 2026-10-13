import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialSavannaPrototype} from '../src/world/hierarchical-wasm/spatial-savanna-adapter.js';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
function validRoute(core,start,result){
  assert.equal(result.status,'found');
  let point=start;
  for(const next of result.points){assert(core.edge(point.x,point.z,next.x,next.z));point=next;}
}
function crossing(core){
  for(let z=-19;z<20;z++){
    const start={x:7,z},end={x:13,z};
    if(core.walkable(start.x,start.z)&&core.walkable(end.x,end.z)&&core.route(start,end).status==='found')return {start,end};
  }
  throw Error('No unblocked test crossing found');
}
test('one C++ source generates visual data and valid worker/animal routes',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);
  const first=Float32Array.from(core.heights()),objects=core.props();
  assert.equal(first.length,2401);assert.equal(core.colors().length,7203);
  assert(objects.length>0&&objects.every(o=>o.x>=-24&&o.x<24&&o.z>=-24&&o.z<24));
  const lists=core.instances();
  assert.equal(lists.length,20);assert.equal(lists.reduce((n,list)=>n+list.length,0),objects.length);
  assert(lists.flat().every(p=>p.id&&p.slot>=0&&p.slot<20&&p.sx===p.scale));
  const geometry=core.geometry();
  assert.equal(geometry.getAttribute('position').count,2401);assert.equal(geometry.index.count,13824);geometry.dispose();
  for(const [radius,worker] of [[.28,true],[1.1,false]]){
    assert.equal(core.buildNavigation(radius,worker),16);
    const {start,end}=crossing(core);
    validRoute(core,start,core.route(start,end));
  }
  core.generate(712,0,0);
  assert.deepEqual(Array.from(core.heights()),Array.from(first));assert.deepEqual(core.props(),objects);
});
test('placing and destroying a wall updates local sectors and restores a route',()=>{
  const core=createSpatialSavannaPrototype(module);core.generate(123,0,0);
  core.buildNavigation(1.1,false);
  const {start,end}=crossing(core),before=core.metrics().sectorUpdates;
  const wall=core.addWall(10,0,.8,24);assert(wall>0);
  assert.equal(core.route(start,end).status,'blocked');
  assert(core.metrics().sectorUpdates>before);
  assert(core.metrics().sectorUpdates-before<16);
  assert.equal(core.removeWall(wall),1);
  validRoute(core,start,core.route(start,end));
});
test('neighboring chunks share their terrain seam and seed-dependent props',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(2026,0,0);
  const west=Float32Array.from(core.heights()),westProps=core.props();
  core.generate(2026,1,0);
  const east=Float32Array.from(core.heights());
  for(let z=0;z<49;z++)assert.equal(west[z*49+48],east[z*49]);
  core.generate(2027,0,0);
  assert.notDeepEqual(core.props(),westProps);
});
test('a visible solid prop occupies its logical collision point',()=>{
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);core.buildNavigation(1.1,false);
  const prop=core.props().find(p=>(p.slot<=3||p.slot>=10&&p.slot<=12||p.slot>=18)&&
    Math.round(p.x)>=-24&&Math.round(p.x)<24&&Math.round(p.z)>=-24&&Math.round(p.z)<24);
  assert(prop);
  assert.equal(core.walkable(Math.round(prop.x),Math.round(prop.z)),false);
});
