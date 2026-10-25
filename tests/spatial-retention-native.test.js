import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createSpatialChunkStream} from '../src/world/wild-engine/spatial-chunk-stream.js';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
test('retained native chunks receive settlement updates without graphical residency',()=>{
  const core=createSpatialWorld(module),loaded=new Map();
  core.generate(712,0,0);core.addChunk(1,0);core.buildNavigation(.28,true);
  const stream=createSpatialChunkStream(core,{loaded:()=>loaded,onData:()=>{throw Error('Unexpected graphics');}});
  stream.retention.setDemand(['1,0']);stream.releaseChunk(1,0);
  const before=Array.from(core.heights());
  core.addSettlement(48,0,10,10);
  assert(core.changedChunks().some(p=>p.cx===1&&p.cz===0));
  assert(core.selectChunk(1,0)>=0);
  const updated=Array.from(core.heights()),props=core.instances();
  assert.notDeepEqual(updated,before);
  const fresh=createSpatialWorld(module);
  fresh.restoreState(core.snapshot(),1,0);
  assert.deepEqual(updated,Array.from(fresh.heights()));
  assert.deepEqual(props,fresh.instances());
  assert.equal(loaded.size,0);assert.equal(core.metrics().loadedChunks,2);
  stream.retention.setDemand([]);
  assert.equal(core.selectChunk(1,0),-1);assert.equal(core.metrics().loadedChunks,1);
  stream.dispose();
});
