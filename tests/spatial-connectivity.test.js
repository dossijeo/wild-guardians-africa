import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/hierarchical-wasm/spatial-world.js';
import {spatialWorldRoute} from '../src/world/hierarchical-wasm/spatial-local-route.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));

test('route diagnostics distinguish missing endpoint connectors from unknown native graph',()=>{
  const start={x:.2,z:.2},end={x:3.2,z:.2};
  const blocked={spatial_local_clear:()=>false,spatial_walkable:()=>true};
  assert.equal(spatialWorldRoute(blocked,()=>({status:'unknown',points:[]}),start,end).reason,
    'start-connector');
  const startOnly={spatial_local_clear:(x,z,tx,tz)=>x<2&&Math.hypot(x-tx,z-tz)<1.5,
    spatial_walkable:()=>true};
  assert.equal(spatialWorldRoute(startOnly,()=>({status:'unknown',points:[]}),start,end).reason,
    'end-connector');
  const both={spatial_local_clear:(x,z,tx,tz)=>Math.hypot(x-tx,z-tz)<1.5,
    spatial_walkable:()=>true};
  assert.equal(spatialWorldRoute(both,()=>({status:'unknown',points:[]}),start,end).reason,
    'native-graph');
});

test('native component connectivity rejects a sealed enclosure without requesting a route',()=>{
  const core=createSpatialWorld(module);core.generate(712,0,0,'savanna');
  core.setSettlement(0,0,7,6);core.buildNavigationProfile(0,1.1,false);
  const outside={x:12,z:0},inside={x:0,z:0};
  assert.equal(core.connected(outside,inside),'possible');
  const initialRegion=core.componentAt(inside);
  assert(initialRegion>=0);
  assert(core.componentsWorld({x:.2,z:.1}).ids.includes(initialRegion));
  assert.equal(core.connectedWorld({x:12.2,z:.1},{x:.2,z:.1}),'possible');
  const walls=[[-6,0,.5,6],[6,0,.5,6],[0,-6,6.5,.5],[0,6,6.5,.5]]
    .map(([x,z,hx,hz])=>core.addWall(x,z,hx,hz));
  assert(walls.every(id=>id>0));
  assert.equal(core.connected(outside,inside),'blocked');
  assert.notEqual(core.componentAt(outside),core.componentAt(inside));
  assert.equal(core.connectedWorld({x:12.2,z:.1},{x:.2,z:.1}),'blocked');
  assert.notEqual(core.route(outside,inside).status,'found');
  assert.equal(core.removeWall(walls[1]),1);
  assert.equal(core.connected(outside,inside),'possible');
  assert.equal(core.route(outside,inside).status,'found');
  assert.equal(core.connected(outside,{x:60,z:0}),'unknown',
    'unloaded terrain cannot be declared sealed');
  assert.deepEqual(core.componentsWorld({x:60,z:0}),{ids:[],unknown:true});
});

test('native batch region lookup matches scalar regions across walls and unloaded chunks',()=>{
  const core=createSpatialWorld(module);core.generate(712,0,0,'savanna');
  core.setSettlement(0,0,7,6);core.buildNavigationProfile(0,1.1,false);
  const points=[];
  for(let z=-18;z<=18;z+=3)for(let x=-18;x<=18;x+=3)
    points.push({x:x+.2,z:z-.3});
  points.push({x:60,z:0});
  const check=()=>assert.deepEqual(core.componentsWorldBatch(points),
    points.map(point=>core.componentsWorld(point)));
  check();
  const wall=core.addWall(8,0,.5,6);assert(wall>0);check();
  assert.equal(core.removeWall(wall),1);check();
  const longBatch=Array.from({length:4097},(_,i)=>points[i%points.length]);
  assert.deepEqual(core.componentsWorldBatch(longBatch).at(-1),
    core.componentsWorld(longBatch.at(-1)));
  assert.deepEqual(core.componentsWorldBatch([]),[]);
  assert.throws(()=>core.componentsWorldBatch([{x:Infinity,z:0}]),/finite/);
});
