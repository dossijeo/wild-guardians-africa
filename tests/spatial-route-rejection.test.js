import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM??new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url);
const module=new WebAssembly.Module(readFileSync(binary));

function openWorld(){
  const core=createSpatialWorld(module);
  core.generate(123,0,0,'savanna');
  core.setSettlement(0,0,20,20);
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)
    if(core.selectChunk(x,z)<0)core.addChunk(x,z);
  return core;
}

test('a wall crossing between grid samples blocks the graph edge and continuous segment',()=>{
  const core=openWorld();
  core.addOrientedBarrier(0,.5833333,.7682954,.22,-2.2794226,0);
  core.buildNavigationProfile(3,.97,false);
  // Both endpoints are legal, but the buffalo intersects the angled wall
  // around z=.05. The old 0.2 m samples missed this thin interval.
  assert.equal(core.wasm.spatial_walkable(2,1),1);
  assert.equal(core.wasm.spatial_walkable(2,0),1);
  assert.equal(core.wasm.spatial_edge(2,1,2,0),0);
  assert.equal(core.localClear({x:2,z:1},{x:2,z:0}),false);
  const route=core.routeWorldNative({x:2,z:3},{x:2,z:-3});
  assert.equal(route.status,'found');
  let before={x:2,z:3};
  for(const point of route.points){
    assert(core.localClear(before,point),`invalid segment ${JSON.stringify([before,point])}`);
    before=point;
  }
});

for(const [name,index,radius,worker] of [
  ['buffalo',3,.97,false],['worker',1,.28,true]])
  test(`rejecting a ${name} route edge yields a different native route`,()=>{
    const core=openWorld();core.buildNavigationProfile(index,radius,worker);
    const start={x:0,z:0},destination={x:0,z:5};
    const first=core.routeWorldNative(start,destination);
    assert.equal(first.status,'found');
    assert.deepEqual(first.points[0],{x:0,z:1});
    const revision=core.wasm.lazy_route_revision();
    assert.equal(core.wasm.lazy_reject_route_edge(0,0,0,1),1);
    assert(core.wasm.lazy_route_revision()>revision);
    assert.equal(core.wasm.lazy_reject_route_edge(0,0,0,1),0);
    assert.equal(core.wasm.spatial_edge(0,0,0,1),1);
    const replacement=core.routeWorldNative(start,destination,{cached:true});
    assert.equal(replacement.status,'found');
    assert.notDeepEqual(replacement.points,first.points);
    assert.notDeepEqual(replacement.points[0],first.points[0]);
    let before=start;
    for(const point of replacement.points){
      assert(core.localClear(before,point));before=point;
    }
  });
