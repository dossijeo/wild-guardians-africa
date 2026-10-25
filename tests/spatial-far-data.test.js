import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createFarSpatialReplica,collectSpatialFarTrees} from '../src/rendering/spatial-far-data.js';
const module=await WebAssembly.compile(await readFile(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
for(const biome of ['savanna','grand_river','mangrove','desert','volcanoes','canyons'])test('far replica preserves native instances: '+biome,()=>{
 const live=createSpatialWorld(module);live.generate(712,0,0,biome);live.setSettlement(0,0,8,8);
 const before=live.terrainState(),expected=live.instances().slice(0,4).flat().filter(t=>t.x>=-24&&t.x<24&&t.z>=-24&&t.z<24).sort((a,b)=>a.id.localeCompare(b.id));
 const replica=createFarSpatialReplica(module,before),bounds={minX:-24,maxX:24,minZ:-24,maxZ:24};
 const actual=collectSpatialFarTrees(replica,bounds);
 assert.deepEqual(actual,expected);assert.equal(replica.metrics().loadedChunks,0);
 assert.deepEqual(live.terrainState(),before);assert.equal(live.metrics().loadedChunks,1);
 if(actual.length)assert.equal(collectSpatialFarTrees(replica,bounds,{suppressed:[actual[0].id]}).length,actual.length-1);
});
