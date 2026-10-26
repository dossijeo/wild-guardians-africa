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

test('estuarine variant persists independently and pthread chunks match its authoritative terrain',async()=>{
 const core=createSpatialWorld(module);core.generate(37,0,0,'mangrove',{mangroveNetwork:true});core.addSettlement(60,0,14,12);
 const saved=core.snapshot();assert.equal(saved.mangroveNetwork,true);assert.equal(saved.mangroveChannels,undefined);
 const restored=createSpatialWorld(module);restored.restoreState(saved);const far=createFarSpatialReplica(module,core.terrainState());
 for(let z=-180;z<=180;z+=7)for(let x=-180;x<=180;x+=7){assert.equal(restored.wetlandMaskAnywhere(x,z),core.wetlandMaskAnywhere(x,z));assert.equal(far.fluidLevelAnywhere(x,z),core.fluidLevelAnywhere(x,z));}
 const handle=await createThreadedSpatialWorld(factory),thread=handle.core;
 try{
  thread.generate(37,0,0,'mangrove',{mangroveNetwork:true});thread.addSettlement(60,0,14,12);
  const id=thread.preparation.start(2,1),start=performance.now();assert(id>0);
  while(thread.preparation.status()!==3){assert(performance.now()-start<15000);await new Promise(r=>setTimeout(r,1));}
  assert(thread.preparation.publish(id,2,1)>0);thread.preparation.release();thread.selectChunk(2,1);core.addChunk(2,1);core.selectChunk(2,1);
  assert.deepEqual(thread.chunkPayload().water,core.chunkPayload().water);
  assert.deepEqual(thread.chunkPayload().terrain.positions,core.chunkPayload().terrain.positions);
  assert.deepEqual(thread.chunkPayload().instances,core.chunkPayload().instances);
  assert.deepEqual(thread.props(),core.props());
 }finally{await handle.dispose();}
});

test('dense estuary adjacent chunks agree across seeds, pthreads and saved reloads',async()=>{
 const handle=await createThreadedSpatialWorld(factory);
 try{
  for(const seed of [1,37,712,4096]){
   const sync=createSpatialWorld(module),thread=handle.core;
   for(const core of [sync,thread]){core.generate(seed,0,0,'mangrove',{mangroveNetwork:true});core.addSettlement(60,0,14,12);}
   for(const [cx,cz] of [[2,1],[3,1],[2,2],[3,2]]){
    sync.addChunk(cx,cz);sync.selectChunk(cx,cz);const expected=structuredClone(sync.chunkPayload());
    const id=thread.preparation.start(cx,cz),started=performance.now();assert(id>0);
    while(thread.preparation.status()!==3){assert(performance.now()-started<15000);assert(Number.isFinite(thread.surfaceAnywhere(60,0)));await new Promise(r=>setTimeout(r,1));}
    assert(thread.preparation.publish(id,cx,cz)>0);thread.preparation.release();thread.selectChunk(cx,cz);
    const actual=thread.chunkPayload();
    for(const key of ['water','instances'])assert.deepEqual(actual[key],expected[key],`${seed}:${cx},${cz}:${key}`);
    assert.deepEqual(actual.terrain.positions,expected.terrain.positions);
    assert.deepEqual(thread.props(),sync.props());
    const restored=createSpatialWorld(module);restored.restoreState(sync.snapshot(),cx,cz);restored.selectChunk(cx,cz);
    assert.deepEqual(restored.chunkPayload().water,expected.water);
    assert.deepEqual(restored.chunkPayload().instances,expected.instances);
   }
  }
 }finally{await handle.dispose();}
});


test('current estuary recipe retains distributed channels and dry land across 100 seeds',()=>{
 const core=createSpatialWorld(module);
 for(let seed=1;seed<=100;seed++){
  core.generate(seed,0,0,'mangrove',{mangroveNetwork:true});
  // Sample separate regions, including far from the original village. Broad
  // bounds detect a return to empty waterways or giant lakes, not artistic taste.
  for(const [ox,oz] of [[60,0],[1200,-1600]]){
   let wet=0,total=0;
   for(let z=-240;z<=240;z+=12)for(let x=-240;x<=240;x+=12){
    wet+=core.fluidLevelAnywhere(ox+x,oz+z)>0;total++;
   }
   const fraction=wet/total;
   assert(fraction>.05&&fraction<.45,`Estuary seed ${seed} region ${ox},${oz}: wet fraction ${fraction}`);
  }
 }
});
