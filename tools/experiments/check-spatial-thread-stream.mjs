import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import factory from './spatial-threaded.mjs';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialChunkStream} from '../../src/world/wild-engine/spatial-chunk-stream.js';
const rows=[];
for(const biome of ['sabana','desierto','gran-rio','volcanes','manglares','gran-canon']){
 const h=await createThreadedSpatialWorld(factory),{core}=h,installed=new Map(),errors=[];
 let stream;
 try{
  core.generate(712,0,0,biome);core.buildNavigationProfile(1,.28,true);
  stream=createSpatialChunkStream(core,{loaded:()=>installed,onData:d=>installed.set(`${d.cx},${d.cz}`,d),onError:e=>errors.push(String(e))});
  stream.plan(new Map([['1,0',{cx:1,cz:0,score:1}],['2,0',{cx:2,cz:0,score:2}]]));
  await Promise.resolve();assert([1,2,3].includes(core.preparation.status()),'Native job must have been dispatched');
  // Change topology during generation, requiring stale-input rejection/retry.
  core.wasm.spatial_add_oriented_barrier(24,0,1,8,.2,0);
  await stream.whenIdle();assert.deepEqual(errors,[]);assert.equal(installed.size,2);
  assert.equal(core.metrics().loadedChunks,3);
  assert.equal(core.preparation.status(),0);
  stream.plan(new Map([['3,0',{cx:3,cz:0,score:1}]]));
  await Promise.resolve();assert([1,2,3].includes(core.preparation.status()),'Native job must have been dispatched');
  stream.plan(new Map([['-1,0',{cx:-1,cz:0,score:1}]]));
  await stream.whenIdle();assert.equal(installed.has('3,0'),false);
  assert.equal(installed.has('-1,0'),true);assert.equal(core.selectChunk(3,0),-1);
  assert.equal(core.metrics().loadedChunks,4);assert.deepEqual(errors,[]);
  stream.plan(new Map([['4,0',{cx:4,cz:0,score:0}]]));await Promise.resolve();
  stream.dispose();await h.dispose();assert.equal(installed.has('4,0'),false);
  rows.push({biome,summary:stream.summary(),obsoleteNotPublished:true,topologyEditSurvived:core.wasm.spatial_barrier_state_count()===1});
 }finally{stream?.dispose();await h.dispose();}
}
await writeFile('docs/qa/wild-engine-pthreads/thread-stream.json',JSON.stringify({scope:'Node native pthread stream integration with topology changes and camera reprioritization, six biomes. Application loader and browser/frame benchmarks still pending.',rows},null,2)+'\n');
console.log('Six biome pthread streams, topology retry and obsolete publication rejection passed.');
