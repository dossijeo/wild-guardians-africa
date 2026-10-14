import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {probeSpatialSavannaStart} from '../src/world/hierarchical-wasm/spatial-initial-site.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const packs=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'));

test('native Sabana start probe checks buildings, entry and twelve routed farm sites',async()=>{
  for(const pack of packs)for(const seed of [712,123,2026]){
    const culture=pack.id==='saheliano'?'saheliana':pack.id;
    const state=Game.newGame({seed,biome:'sabana',culture,slotId:'native-start'});
    const before=structuredClone(state);
    const result=await probeSpatialSavannaStart(module,state,pack);
    assert.equal(result.valid,true,`${seed}: ${JSON.stringify(result)}`);
    assert.equal(result.farm.length,12);
    assert(result.loadedChunks>0);
    assert(result.site.entry);
    assert.deepEqual(state,before,'the candidate probe must not mutate gameplay');
  }
});
