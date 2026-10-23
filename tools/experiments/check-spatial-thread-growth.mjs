import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import factory from '../../public/wild-engine/spatial-threaded.mjs';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';
const handle=await createThreadedSpatialWorld(factory),{core,memory}=handle;
const report={scope:'Native Mangroves allocation pressure with all six navigation profiles. No renderer, not frame/GPU benchmark; linear capacity is not live allocation or peak RSS.',passes:[],growth:[]};
try{
 core.generate(712,0,0,'manglares');
 for(const p of [WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)])core.buildNavigationProfile(p.index,p.radius,p.worker);
 report.initialBytes=memory.buffer.byteLength;
 const coordinates=[];for(let z=0;z<12;z++)for(let x=0;x<12;x++)if(x||z)coordinates.push([x,z]);
 for(let pass=0;pass<3;pass++){
  const initial=memory.buffer.byteLength;let queries=0;
  const region=coordinates.map(([x,z])=>[x+(pass===2?24:0),z]);
  for(const [cx,cz] of region){
   const before=memory.buffer.byteLength,id=core.preparation.start(cx,cz);assert(id>0);
   const deadline=performance.now()+30000;
   while(core.preparation.status()!==3){
    assert(performance.now()<deadline,'Worker deadline');
    assert(Number.isFinite(core.surfaceAnywhere(0,0)));queries++;
    await new Promise(resolve=>setTimeout(resolve,1));
   }
   const prepared=memory.buffer.byteLength;
   assert.equal(core.preparation.metric(0),1);
   assert(core.preparation.publish(id,cx,cz)>0);core.preparation.release();
   const payload=core.chunkPayload();
   assert.equal(payload.terrain.positions[(24*49+24)*3+1],Math.fround(core.surface(cx*48,cz*48)));
   if(prepared!==before||memory.buffer.byteLength!==prepared)report.growth.push({pass,cx,cz,before,prepared,published:memory.buffer.byteLength});
  }
  const peak=memory.buffer.byteLength;
  assert.equal(core.metrics().loadedChunks,coordinates.length+1);
  // Write via fresh JS views after allocator-driven growth, then read natively.
  const id=core.addPolygon([{x:1,z:1},{x:3,z:1},{x:3,z:3},{x:1,z:3}]);
  assert(id>0);assert.equal(core.snapshot().polygons.length,1);core.removePolygon(id);
  for(const [cx,cz] of region)core.removeChunk(cx,cz);
  assert.equal(core.metrics().loadedChunks,1);
  report.passes.push({pass,regionOffsetX:pass===2?24:0,initial,peak,afterRemoval:memory.buffer.byteLength,queries,chunks:region.length,metrics:core.metrics()});
 }
 assert(report.growth.length,'Allocation pressure did not exercise growth');
 report.finalBytes=memory.buffer.byteLength;
}finally{await handle.dispose();}
await writeFile('docs/qa/wild-engine-pthreads/thread-growth.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
