import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import factory from '../../public/wild-engine/spatial-threaded.mjs';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';
const module=await WebAssembly.compile(await readFile('src/world/wild-engine/spatial-savanna.wasm'));
const profiles=[WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)],rows=[];
for(const biome of ['sabana','desierto','gran-rio','volcanes','manglares','gran-canon']){
 const handle=await createThreadedSpatialWorld(factory),a=createSpatialWorld(module),b=handle.core,p=b.preparation;
 const stages=[];
 const compare=(stage,offset=0)=>{
  let queries=0,successful=0;
  for(const profile of profiles){a.selectNavigationProfile(profile.index);b.selectNavigationProfile(profile.index);
   for(let z=-12;z<=12;z+=6)for(let x=-12;x<=12;x+=6){const start={x:x+offset,z},end={x:x+offset+4,z:z+2};
    const expected=a.routeWorld(start,end),actual=b.routeWorld(start,end);
    assert.deepEqual(actual,expected,`${biome}/${stage}/${profile.index}/${x}/${z}`);queries++;
    if(actual.status==='found')successful++;
   }
  }
  assert(successful>0,`${biome}/${stage} had no successful routes`);stages.push({stage,queries,successful});
 };
 const wait=async target=>{const deadline=performance.now()+30000;while(p.status()!==target){assert(performance.now()<deadline,'Worker deadline');if(target===2)assert(p.status()<3,'Missed running job');await new Promise(r=>setTimeout(r,0));}};
 try{
  for(const core of [a,b]){core.generate(712,0,0,biome);for(const profile of profiles)core.buildNavigationProfile(profile.index,profile.radius,profile.worker);}
  compare('initial');
  let id=p.start(1,0);assert(id>0);await wait(2);const editStatus=p.status();
  const polygon=[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:-2,z:2}],pa=a.addPolygon(polygon),pb=b.addPolygon(polygon);assert(pa>0&&pb>0);
  compare('obstacle-added-during-generation');await wait(3);assert.equal(p.publish(id,1,0),-2);p.release();
  id=p.start(1,0);await wait(3);assert(p.publish(id,1,0)>0);p.release();a.addChunk(1,0);
  compare('published-with-obstacle');compare('published-neighbor',36);
  a.removePolygon(pa);b.removePolygon(pb);compare('obstacle-removed');
  a.removeChunk(1,0);b.removeChunk(1,0);compare('neighbor-removed');
  rows.push({biome,editStatus,stages});
 }finally{await handle.dispose();}
}
await writeFile('docs/qa/wild-engine-pthreads/thread-route-differential.json',JSON.stringify({scope:'Native route differential against standalone for all six actor profiles; no live actor movement or raid simulation',rows},null,2)+'\n');
console.log(JSON.stringify(rows));
