import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {probeSpatialStart,findSpatialStart} from '../src/world/wild-engine/spatial-initial-site.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {centerFootprint} from '../src/world/centers.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const packs=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'));

test('native start accepts a real-world timestamp seed after WASM normalization',async()=>{
  const seed=1792340768268;
  const state=Game.newGame({seed,biome:'gran-canon',culture:'mapungubwe',
    slotId:'native-timestamp-seed'});
  const result=await probeSpatialStart(module,state,packs[0],{x:0,z:-30});
  assert.equal(typeof result.valid,'boolean');
});

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

test('native Gran Cañón start keeps the river and proves hostile land access',async(t)=>{
  for(const pack of packs)for(const seed of [712,123]){
    const culture=pack.id==='saheliano'?'saheliana':pack.id;
    const state=Game.newGame({seed,biome:'gran-canon',
      culture,slotId:'native-canyon-start'});
    const result=await findSpatialStart(module,state,pack);
    assert.equal(result.valid,true,`${culture}/${seed}: ${JSON.stringify(result)}`);
    assert.equal(result.farm.length,12);
    assert(result.landAccess?.path.length>0);
    assert(result.site.buildings.some(building=>building.x<result.site.x));
    assert(result.site.buildings.some(building=>building.x>result.site.x));
    t.diagnostic(`${culture}/${seed}: ${result.attempts} candidates, ${result.loadedChunks} chunks`);
  }
});

test('planned center levels the same native terrain before and after purchase',async()=>{
  for(const [biome,seed] of [['sabana',712],['gran-canon',123]]){
    const state=Game.newGame({seed,biome,culture:'mapungubwe',
      slotId:'native-center-terrain'});
    const start=await findSpatialStart(module,state,packs[0]);
    const planned=structuredClone(state);
    Object.assign(planned.villages[0],start.site);
    const purchased=structuredClone(planned);
    purchased.structures.push({id:'center-1',villageId:'village-1',
      ...start.site.center,status:'intact',hp:600,maxHp:600});
    const options=()=>({loaded:()=>new Map(),onData:()=>{}});
    const before=createSpatialGameSession(module,planned,options());
    const after=createSpatialGameSession(module,purchased,options());
    try{
      assert.deepEqual(before.core.snapshot().settlements,
        after.core.snapshot().settlements,`${biome}: center purchase changed terrain sites`);
      assert.equal(after.core.snapshot().polygons.length,
        before.core.snapshot().polygons.length+1,
        `${biome}: planned center must not exist as a physical building`);
      const points=[...centerFootprint(start.site.center,planned).footprint,...start.farm];
      for(const point of points)
        assert.equal(before.field.surface(point.x,point.z),
          after.field.surface(point.x,point.z),`${biome}: terrain changed at ${JSON.stringify(point)}`);
    }finally{before.dispose();after.dispose();}
  }
});

test('estuarine starts retain twelve usable farm plots and worker routes across seeds and cultures',async()=>{
 for(const pack of packs)for(const seed of [1,37,712,4096]){
  const culture=pack.id==='saheliano'?'saheliana':pack.id;
  const state=Game.newGame({seed,biome:'manglares',culture,slotId:'estuary-start'});state.mangroveNetwork=true;
  const result=await findSpatialStart(module,state,pack);
  assert.equal(result.valid,true,`${seed}/${culture}`);assert.equal(result.farm.length,12);assert(result.site.entry);assert(result.landAccess?.path.length>0);
 }
});
