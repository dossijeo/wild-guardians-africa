import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/hierarchical-wasm/spatial-world.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;

test('native unknown connectivity identifies the actual missing frontier sector',
  {skip:!binary},()=>{
    const module=new WebAssembly.Module(readFileSync(binary));
    const core=createSpatialWorld(module);
    core.generate(712,0,0,'sabana');core.addChunk(2,0);
    assert(core.buildNavigationProfile(0,1.1,false)>0);
    const wasm=core.wasm;
    assert.equal(wasm.lazy_connected(0,0,96,0),-1);
    assert.equal(wasm.lazy_connected_reason(),8);
    assert.equal(wasm.lazy_connected_frontier_valid(),1);
    const frontier={x:wasm.lazy_connected_frontier_x(),
      z:wasm.lazy_connected_frontier_z()};
    assert.deepEqual({cx:Math.floor((frontier.x+24)/48),
      cz:Math.floor((frontier.z+24)/48)},{cx:1,cz:0});
    core.addChunk(1,0);
    assert(core.buildNavigationProfile(0,1.1,false)>0);
    assert.equal(wasm.lazy_connected(0,0,96,0),1);
  });
