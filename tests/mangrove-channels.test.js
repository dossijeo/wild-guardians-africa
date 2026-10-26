import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createFarSpatialReplica} from '../src/rendering/spatial-far-data.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import factory from '../public/wild-engine/spatial-threaded.mjs';
const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));

test('new Mangrove channels bound flooding across 100 seeds; legacy lakes remain reproducible',()=>{
 const legacy=createSpatialWorld(module),modern=createSpatialWorld(module);
 for(let seed=1;seed<=100;seed++){
  legacy.generate(seed,1,0,'mangrove');modern.generate(seed,1,0,'mangrove',{mangroveChannels:true});
  let oldWet=0,newWet=0,total=0;
  for(let z=-50;z<=50;z+=4)for(let x=10;x<=110;x+=4){
   oldWet+=legacy.fluidLevelAnywhere(x,z)>0;newWet+=modern.fluidLevelAnywhere(x,z)>0;total++;
   assert.equal(modern.surfaceAnywhere(x,z),legacy.surfaceAnywhere(x,z));
  }
  assert(newWet/total<.25,`Seed ${seed}: unbounded water area`);
  if(seed===37){assert(oldWet/total>.8);assert(newWet/total<.15);}
 }
});

test('variant survives snapshots, far replicas, settlement edits and chunk regeneration',()=>{
 const core=createSpatialWorld(module);core.generate(37,1,0,'mangrove',{mangroveChannels:true});
 core.addSettlement(60,0,14,12);core.addChunk(2,0);core.selectChunk(2,0);
 const payload=structuredClone(core.chunkPayload()),state=core.snapshot(),terrain=core.terrainState();
 assert.equal(state.mangroveChannels,true);assert.equal(terrain.biome,'mangrove');
 const restored=createSpatialWorld(module);restored.restoreState(state,2,0);
 assert.deepEqual(restored.snapshot(),state);assert.deepEqual(restored.chunkPayload().water,payload.water);
 const far=createFarSpatialReplica(module,terrain);
 for(let z=-90;z<=90;z+=3)for(let x=-90;x<=150;x+=3)assert.equal(far.fluidLevelAnywhere(x,z),core.fluidLevelAnywhere(x,z));
 core.removeChunk(2,0);core.addChunk(2,0);assert.deepEqual(core.chunkPayload().water,payload.water);
 core.generate(37,1,0,'mangrove');assert.equal(core.snapshot().mangroveChannels,undefined);
});

test('pthread preparation uses the same channel recipe as the authoritative main thread',async()=>{
 const handle=await createThreadedSpatialWorld(factory),core=handle.core;
 try{
  core.generate(37,0,0,'mangrove',{mangroveChannels:true});core.addSettlement(60,0,14,12);
  core.buildNavigationProfile(1,.28,true);
  const expected=createSpatialWorld(module);expected.generate(37,0,0,'mangrove',{mangroveChannels:true});expected.addSettlement(60,0,14,12);
  for(const [cx,cz] of [[1,0],[2,0],[1,1]]){
   const id=core.preparation.start(cx,cz),start=performance.now();assert(id>0);
   while(core.preparation.status()!==3){assert(performance.now()-start<15000);assert(Number.isFinite(core.surfaceAnywhere(60,0)));await new Promise(r=>setTimeout(r,1));}
   assert.equal(core.preparation.metric(0),1);assert(core.preparation.publish(id,cx,cz)>0);
   expected.addChunk(cx,cz);assert.deepEqual(core.chunkPayload().water,expected.chunkPayload().water);
   assert.deepEqual(core.chunkPayload().terrain.positions,expected.chunkPayload().terrain.positions);
   core.preparation.release();
  }
 }finally{await handle.dispose();}
});
