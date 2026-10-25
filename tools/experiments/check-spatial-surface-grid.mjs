import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import factory from '../../public/wild-engine/spatial-threaded.mjs';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';
const handle=await createThreadedSpatialWorld(factory),core=handle.core,rows=[];
try{
 for(const seed of [712,1907]){
  core.generate(seed,0,0,'gran-canon');for(const profile of [WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)])core.buildNavigationProfile(profile.index,profile.radius,profile.worker);core.addChunk(1,0);core.addChunk(-1,-1);assert(core.addSettlement(150,-60,12,9)>0);
  const p=core.preparation,id=p.start(4,0);assert(id>0);
  while(p.status()===1)await new Promise(r=>setTimeout(r,0));assert.equal(p.status(),2);
  for(const bounds of [[-48,-48,144,144,129,129],[-250.3,-190.7,510.8,380.9,513,513],[23.999,-24.001,48.002,48.002,97,97]]){
   const before=core.snapshot(),selected=core.currentChunk();
   const start=performance.now(),actual=core.surfaceGrid(...bounds).slice(),gridMs=performance.now()-start;
   const [x,z,w,h,nx,nz]=bounds;let mismatches=0,maxError=0;const scalarStart=performance.now();
   for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
    const expected=core.surfaceAnywhere(x+i/(nx-1)*w,z+j/(nz-1)*h),error=Math.abs(actual[j*nx+i]-expected);
    if(error!==0){mismatches++;maxError=Math.max(maxError,error);}
   }
   const scalarMs=performance.now()-scalarStart;
   assert.deepEqual(core.snapshot(),before);assert.deepEqual(core.currentChunk(),selected);
   rows.push({seed,bounds,gridMs,scalarMs,mismatches,maxError});console.log(rows.at(-1));
   assert.equal(mismatches,0,'Grid must preserve every scalar height');
  }
  while(p.status()!==3)await new Promise(r=>setTimeout(r,1));assert.equal(p.metric(0),1);assert(p.publish(id,4,0)>0);p.release();
 }
 assert.equal(core.surfaceGrid(0,0,4096,4096,513,513),null);
 assert.equal(core.surfaceGrid(0,0,10,10,1,5),null);
 core.generate(712,0,0,'manglares');assert.equal(core.surfaceGrid(0,0,10,10,5,5),null);
}finally{await handle.dispose();await writeFile('docs/qa/wild-engine-pthreads/surface-grid-differential.json',JSON.stringify({rows},null,2)+'\n');}
