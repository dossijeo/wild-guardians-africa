import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHierarchicalWasmNavigator} from '../src/world/hierarchical-wasm-adapter.js';
import {HierarchicalNavigator} from '../src/world/hierarchical-navigation.js';

const wasm=readFileSync(new URL('../src/world/hierarchical-wasm/core.wasm',import.meta.url));
function fixture(){
  const blocked=new Set();for(let z=0;z<24;z++)blocked.add(`11,${z}`);
  const walkable=(x,z)=>x>=0&&x<24&&z>=0&&z<24&&!blocked.has(`${x},${z}`);
  const clear=(a,b)=>{
    for(let i=0;i<=12;i++)if(!walkable(Math.round(a.x+(b.x-a.x)*i/12),Math.round(a.z+(b.z-a.z)*i/12)))return false;
    return true;
  };
  return {blocked,walkable,clear,nav:{walkable,segmentClear:clear}};
}
test('C++ sectors reject closed wall and accept local breach after incremental refresh',async()=>{
  const f=fixture(),core=await createHierarchicalWasmNavigator(wasm,f.nav,{minX:0,minZ:0,maxX:23,maxZ:23,radius:.5,sectorSize:8});
  core.initialize();assert.equal(core.route({x:3,z:12},{x:19,z:12}),null);
  f.blocked.delete('11,12');core.syncRect(11,12,11,12);
  const route=core.route({x:3,z:12},{x:19,z:12});assert(route?.length>0);
  let previous={x:3,z:12};for(const point of route){assert(f.clear(previous,point));previous=point;}
  f.blocked.add('11,12');core.syncRect(11,12,11,12);
  assert.equal(core.route({x:3,z:12},{x:19,z:12}),null);
});
test('C++ and JavaScript prototypes agree on reachability under the same physical raster',async()=>{
  const f=fixture();f.blocked.delete('11,12');
  const core=await createHierarchicalWasmNavigator(wasm,f.nav,{minX:0,minZ:0,maxX:23,maxZ:23,radius:.5,sectorSize:8});core.initialize();
  const js=new HierarchicalNavigator({sectorSize:8,cellPassable:f.walkable,edgePassable:f.clear,connectorClear:f.clear});
  for(const [start,end] of [[{x:3,z:12},{x:19,z:12}],[{x:3,z:3},{x:6,z:17}],[{x:19,z:8},{x:3,z:22}]]){
    const cpp=core.route(start,end),javascript=js.path(start,end,'animal');
    assert.equal(!!cpp,!!javascript);
    let previous=start;for(const point of cpp??[]){assert(f.clear(previous,point));previous=point;}
  }
});

test('C++ flat A* baseline and hierarchy obey the same wall and breach',async()=>{
  const f=fixture();
  const core=await createHierarchicalWasmNavigator(wasm,f.nav,{minX:0,minZ:0,maxX:23,maxZ:23,radius:.5,sectorSize:8,diagonal:true});
  core.initialize();
  const start={x:3,z:12},end={x:19,z:12};
  assert.equal(core.route(start,end),null);
  assert.equal(core.flatRoute(start,end),null);
  f.blocked.delete('11,12');core.syncRect(11,12,11,12);
  for(const route of [core.route(start,end),core.flatRoute(start,end)]){
    assert(route?.length>0);
    let previous=start;
    for(const point of route){assert(f.clear(previous,point));previous=point;}
  }
  f.blocked.add('11,12');core.syncRect(11,12,11,12);
  assert.equal(core.route(start,end),null);
  assert.equal(core.flatRoute(start,end),null);
});

test('raster preparation samples each cell once and refreshes only a local rectangle',async()=>{
  const f=fixture();
  let samples=0;
  const nav={...f.nav,walkable(...args){samples++;return f.walkable(...args);}};
  const core=await createHierarchicalWasmNavigator(wasm,nav,{minX:0,minZ:0,maxX:23,maxZ:23,radius:.5,sectorSize:8,diagonal:true});
  core.initialize();
  assert.equal(samples,24*24);
  samples=0;
  f.blocked.delete('11,12');
  core.syncRect(11,12,11,12);
  assert.equal(samples,9);
  assert(core.flatRoute({x:3,z:12},{x:19,z:12})?.length>0);
});
