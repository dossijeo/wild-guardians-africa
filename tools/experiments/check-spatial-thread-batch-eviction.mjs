import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const runtimePath=resolve(process.env.WG_THREAD_RUNTIME??'public/wild-engine/spatial-threaded.mjs');
const {default:factory}=await import(pathToFileURL(runtimePath).href);
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';
const module=await WebAssembly.compile(await readFile('src/world/wild-engine/spatial-savanna.wasm'));
const profiles=[WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)],rows=[];
const cases=['sabana','desierto','gran-rio','volcanes','manglares','gran-canon'].map(biome=>({biome,options:{}}));
cases.push({biome:'manglares',options:{mangroveChannels:true}},{biome:'manglares',options:{mangroveNetwork:true}},{biome:'gran-canon',options:{canyonOpenRight:true}});
for(const {biome,options} of cases){
 const handle=await createThreadedSpatialWorld(factory),a=createSpatialWorld(module),b=handle.core,p=b.preparation;
 assert.equal(typeof b.wasm.spatial_remove_chunks,'function');
 const coordinates=[];for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)coordinates.push([x,z]);
 const compare=stage=>{
  let queries=0,found=0;
  for(const profile of profiles){a.selectNavigationProfile(profile.index);b.selectNavigationProfile(profile.index);
   for(let z=-36;z<=36;z+=12)for(let x=-36;x<=36;x+=12){
    const from={x,z},to={x:x+3,z:z+2};
    const expected=a.routeWorld(from,to),actual=b.routeWorld(from,to);
    assert.deepEqual(actual,expected,`${biome}/${stage}/${profile.index}/${x}/${z}`);queries++;found+=actual.status==='found';
   }
  }
  assert(found>0);assert.equal(b.metrics().loadedChunks,a.metrics().loadedChunks);
  assert.equal(b.metrics().loadedSectors,a.metrics().loadedSectors);
  assert.equal(b.metrics().residentVisiblePropRecords,a.metrics().residentVisiblePropRecords);
  assert.deepEqual(b.currentChunk(),a.currentChunk());return {stage,queries,found};
 };
 const wait=async status=>{const deadline=performance.now()+30000;while(p.status()!==status){assert(performance.now()<deadline,'Worker timeout');if(status===2)assert(p.status()<3,'Missed running worker');await new Promise(r=>setTimeout(r,0));}};
 try{
  for(const core of [a,b]){
   core.generate(712,0,0,biome,options);for(const profile of profiles)core.buildNavigationProfile(profile.index,profile.radius,profile.worker);
   for(const [x,z] of coordinates)if(x||z)core.addChunk(x,z);
   assert(core.addBarrier(0,-3,3,.3,1)>0);
   assert(core.addPolygon([{x:-2,z:2},{x:2,z:2},{x:2,z:5},{x:-2,z:5}])>0);
   assert.equal(core.snapshot().barriers.length,1);
  }
  const stages=[compare('initial')];
  for(const invalid of [null,[[1]],[[NaN,0]],[[2**32,0]]])assert.throws(()=>b.removeChunks(invalid),TypeError);
  assert.equal(b.removeChunks([]),0);
  let id=p.start(2,0);assert(id>0);await wait(2);
  const removed=[[1,-1],[1,0],[1,1],[0,1],[-1,1],[1,0],[99,99]];
  for(const [x,z] of removed)a.removeChunk(x,z);
  assert.equal(b.removeChunks(removed),5);stages.push(compare('batch-with-obstacles'));
  await wait(3);assert.equal(p.publish(id,2,0),-2,'Eviction must invalidate in-flight residency snapshot');p.release();
  id=p.start(2,0);await wait(3);assert.equal(p.metric(0),1);assert(p.publish(id,2,0)>0);p.release();a.addChunk(2,0);
  stages.push(compare('retry-after-eviction'));
  // Capture authoritative save state before consuming the deferred visual payload.
  assert.equal(a.removeChunk(2,0),1);assert.equal(b.removeChunks([[2,0]]),1);
  const saved=a.snapshot();assert.deepEqual(b.snapshot(),saved,'Pending visuals must not alter serialized world');
  for(const core of [a,b]){core.addSettlement(3,4,4,3);core.addBarrier(6,4,.5,3,0);}
  assert.deepEqual(b.snapshot(),a.snapshot(),'World edits survive pending visuals');
  stages.push(compare('edits-after-selected-eviction'));
  for(const core of [a,b]){
   core.restoreState(saved,0,0);
   for(const profile of profiles)core.buildNavigationProfile(profile.index,profile.radius,profile.worker);
   for(const [x,z] of coordinates)if(x||z)core.addChunk(x,z);
  }
  assert.deepEqual(b.snapshot(),a.snapshot(),'Save restoration remains exact');
  stages.push(compare('save-restore-after-pending-visuals'));
  const rest=[...coordinates,[2,0]];let count=0;for(const [x,z] of rest)count+=a.removeChunk(x,z);
  assert.equal(b.removeChunks(rest),count);assert.equal(b.metrics().loadedChunks,0);assert.equal(b.metrics().loadedSectors,0);assert.equal(b.currentChunk(),null);
  assert.equal(b.removeChunks(rest),0);
  rows.push({biome,options,stages,removed:5,finalChunks:0});console.log(`${biome}: batch eviction, stale rejection and retry pass`);
 }finally{await handle.dispose();}
}
await writeFile(process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-batch-eviction.json',JSON.stringify({runtimePath,scope:'Native differential: six profiles, retained/removed boundaries, obstacles, duplicate/missing requests, running job invalidation, retry and complete eviction. Not rendered performance.',rows},null,2)+'\n');
