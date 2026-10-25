import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import factory from './spatial-threaded.mjs';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
const rows=[];
for(const biome of ['sabana','desierto','gran-rio','volcanes','manglares','gran-canon']){
 const handle=await createThreadedSpatialWorld(factory),{core,memory}=handle;
 try{
  assert.equal(handle.runtime.HEAPU8.buffer,memory.buffer);
  core.generate(712,0,0,biome);core.buildNavigationProfile(1,.28,true);
  const polygon=core.addPolygon([{x:1,z:1},{x:3,z:1},{x:3,z:3},{x:1,z:3}]);
  assert(polygon>0);assert.equal(core.snapshot().polygons.length,1);
  const revision=core.chunkRevision(),id=core.preparation.start(1,0),start=performance.now();
  assert(id>0);
  while(core.preparation.status()!==3){
   assert(performance.now()-start<15000,'Preparation timed out');
   assert(Number.isFinite(core.surfaceAnywhere(0,0)));
   await new Promise(resolve=>setTimeout(resolve,1));
  }
  assert.equal(core.preparation.metric(0),1);
  assert(core.preparation.publish(id,1,0)>0);
  assert.equal(core.chunkRevision(),revision+1);
  assert.equal(core.currentChunk().cx,1);
  const payload=core.chunkPayload();assert.equal(payload.cx,1);
  assert.equal(payload.terrain.positions[(24*49+24)*3+1],Math.fround(core.surface(48,0)));
  assert.equal(core.metrics().loadedChunks,2);
  assert(memory.buffer instanceof SharedArrayBuffer);
  core.preparation.release();
  // Teardown must also work with a pending native job, without killing it
  // while it owns memory allocator or job state.
  assert(core.preparation.start(2,0)>0);
  rows.push({biome,published:true,shared:true,payloadSelected:true});
 }finally{
  const a=handle.dispose(),b=handle.dispose();assert.equal(a,b);await a;
  assert.equal(core.preparation.status(),5);
 }
}
await writeFile('docs/qa/wild-engine-pthreads/thread-adapter.json',JSON.stringify({scope:'Node Emscripten adapter, six biomes, one shared world, publication metadata/payload and teardown with pending job. Not browser packaging or game frametime acceptance.',rows},null,2)+'\n');
console.log('Six biome runtime adapters and busy teardown passed.');
