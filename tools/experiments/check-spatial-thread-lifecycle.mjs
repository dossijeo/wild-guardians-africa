import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import factory from '../../public/wild-engine/spatial-threaded.mjs';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
const rows=[];
for(const biome of ['sabana','desierto','gran-rio','volcanes','manglares','gran-canon']){
 const handle=await createThreadedSpatialWorld(factory),{core,memory}=handle;
 let queries=0;
 const ready=async()=>{
  const deadline=performance.now()+30000;
  while(core.preparation.status()!==3){
   assert(performance.now()<deadline,'Worker timeout');
   assert(Number.isFinite(core.surfaceAnywhere(0,0)));
   core.routeWorld({x:0,z:0},{x:5,z:5});queries++;
   await new Promise(resolve=>setTimeout(resolve,1));
  }
 };
 try{
  core.generate(712,0,0,biome);core.buildNavigationProfile(1,.28,true);
  const initial=core.snapshot();
  // Main-thread world reset while the worker owns an independent input snapshot.
  let id=core.preparation.start(1,0);assert(id>0);
  core.restoreState(initial);core.buildNavigationProfile(1,.28,true);
  await ready();assert.equal(core.preparation.publish(id,1,0),-2);
  core.preparation.release();assert.equal(core.selectChunk(1,0),-1);
  for(let iteration=0;iteration<8;iteration++){
   id=core.preparation.start(1,0);assert(id>0);
   const polygon=core.addPolygon([{x:2,z:2},{x:4,z:2},{x:4,z:4},{x:2,z:4}]);
   assert(polygon>0);core.removePolygon(polygon);
   await ready();assert.equal(core.preparation.publish(id,1,0),-2);
   core.preparation.release();
   id=core.preparation.start(1,0);assert(id>0);await ready();
   assert(core.preparation.publish(id,1,0)>0);core.preparation.release();
   assert.equal(core.metrics().loadedChunks,2);
   core.removeChunk(1,0);assert.equal(core.metrics().loadedChunks,1);
  }
  assert.deepEqual(core.snapshot(),{...initial,nextPolygonId:initial.nextPolygonId+8},'Only allocated polygon IDs may advance');
  rows.push({biome,queries,cycles:8,resetRejected:true,transientEditsPreserved:true,bytes:memory.buffer.byteLength});
 }finally{await handle.dispose();}
}
await writeFile(process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-lifecycle.json',JSON.stringify({scope:'Native shared runtime reset, edit/retry, publish/remove cycles with concurrent main-thread queries; not active game actor or frame benchmark',rows},null,2)+'\n');
console.log('Six-biome lifecycle cycles passed');
