import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {probeSpatialStart,findSpatialStart} from '../src/world/hierarchical-wasm/spatial-initial-site.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const packs=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'));

test('native Sabana start probe checks buildings, entry and twelve routed farm sites',async()=>{
  for(const pack of packs)for(const seed of [712,123,2026]){
    const culture=pack.id==='saheliano'?'saheliana':pack.id;
    const state=Game.newGame({seed,biome:'sabana',culture,slotId:'native-start'});
    const before=structuredClone(state);
    const result=await probeSpatialStart(module,state,pack);
    assert.equal(result.valid,true,`${seed}: ${JSON.stringify(result)}`);
    assert.equal(result.farm.length,12);
    assert(result.loadedChunks>0);
    assert(result.site.entry);
    assert.deepEqual(state,before,'the candidate probe must not mutate gameplay');
  }
});

test('native start search is deterministic, cancellation-aware and expands missing chunks',async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',slotId:'native-search'});
  const first=await findSpatialStart(module,state,packs[0]);
  const second=await findSpatialStart(module,state,packs[0]);
  assert.equal(first.attempts,1);
  assert.deepEqual(first,second);
  const narrow=await probeSpatialStart(module,state,packs[0],{chunkMargin:0});
  assert.equal(narrow.valid,true,JSON.stringify(narrow));
  assert.deepEqual(narrow.site,first.site);
  const edgeCases=[];
  for(const x of [42,48,54,66,72,78]){
    const result=await probeSpatialStart(module,state,packs[0],
      {x,chunkMargin:0});
    edgeCases.push({x,valid:result.valid,expansions:result.chunkExpansions??0});
    if(result.chunkExpansions>0)break;
  }
  assert(edgeCases.some(item=>item.expansions>0),JSON.stringify(edgeCases));
  const controller=new AbortController();controller.abort();
  await assert.rejects(findSpatialStart(module,state,packs[0],
    {signal:controller.signal}),{name:'AbortError'});
});

test('five non-canyon biomes evaluate their first settlement with one native world',async()=>{
  for(const biome of ['sabana','gran-rio','manglares','volcanes','desierto'])
    for(const pack of packs)for(const seed of [712,123]){
      const culture=pack.id==='saheliano'?'saheliana':pack.id;
      const state=Game.newGame({seed,biome,culture,slotId:'native-biome-start'});
      let result;
      try{result=await probeSpatialStart(module,state,pack);}
      catch(error){throw Error(`${biome}/${culture}/${seed}: ${error.stack??error} ${JSON.stringify({start:error.start,end:error.end,missing:error.missing})}`);}
      assert.equal(result.valid,true,`${biome}/${culture}/${seed}: ${JSON.stringify(result)}`);
      assert.equal(result.farm.length,12);
    }
});
