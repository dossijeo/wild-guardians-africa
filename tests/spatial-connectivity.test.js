import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/hierarchical-wasm/spatial-world.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));

test('native component connectivity rejects a sealed enclosure without requesting a route',()=>{
  const core=createSpatialWorld(module);core.generate(712,0,0,'savanna');
  core.setSettlement(0,0,7,6);core.buildNavigationProfile(0,1.1,false);
  const outside={x:12,z:0},inside={x:0,z:0};
  assert.equal(core.connected(outside,inside),'possible');
  assert.equal(core.connectedWorld({x:12.2,z:.1},{x:.2,z:.1}),'possible');
  const walls=[[-6,0,.5,6],[6,0,.5,6],[0,-6,6.5,.5],[0,6,6.5,.5]]
    .map(([x,z,hx,hz])=>core.addWall(x,z,hx,hz));
  assert(walls.every(id=>id>0));
  assert.equal(core.connected(outside,inside),'blocked');
  assert.equal(core.connectedWorld({x:12.2,z:.1},{x:.2,z:.1}),'blocked');
  assert.notEqual(core.route(outside,inside).status,'found');
  assert.equal(core.removeWall(walls[1]),1);
  assert.equal(core.connected(outside,inside),'possible');
  assert.equal(core.route(outside,inside).status,'found');
  assert.equal(core.connected(outside,{x:60,z:0}),'unknown',
    'unloaded terrain cannot be declared sealed');
});
