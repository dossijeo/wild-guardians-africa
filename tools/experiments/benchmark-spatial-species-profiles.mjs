import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/wild-engine/spatial-savanna-adapter.js';
import {ANIMAL_SPATIAL_PROFILES,WORKER_SPATIAL_PROFILE} from '../../src/world/wild-engine/spatial-movement-profiles.js';

const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-species-profiles-abba.json';
const profiles=Object.values(ANIMAL_SPATIAL_PROFILES);
const time=fn=>{const start=performance.now(),value=fn();return {ms:performance.now()-start,value};};
function run(all){
  const core=createSpatialSavannaPrototype(module);
  const generation=time(()=>{core.generate(712,0,0,'savanna');core.addChunk(1,0);});
  const worker=time(()=>core.buildNavigationProfile(WORKER_SPATIAL_PROFILE.index,WORKER_SPATIAL_PROFILE.radius,true));
  const built=[];
  for(const {index,radius} of all?profiles:profiles.slice(0,1)){
    const result=time(()=>core.buildNavigationProfile(index,radius,false));
    built.push({index,radius,buildMs:result.ms,sectors:result.value});
  }
  const queries=time(()=>{
    let found=0;
    for(const {index} of built){
      core.selectNavigationProfile(index);
      for(let z=-18;z<=18;z+=3)
        if(core.route({x:7,z},{x:13,z}).status==='found')found++;
    }
    return found;
  });
  const wall=time(()=>core.addWall(10,0,.8,24));
  const remove=time(()=>core.removeWall(wall.value));
  return {profiles:built,generationMs:generation.ms,workerBuildMs:worker.ms,
    animalBuildMs:built.reduce((sum,entry)=>sum+entry.buildMs,0),
    queryMs:queries.ms,found:queries.value,wallMs:wall.ms,removeMs:remove.ms,
    memoryBytes:core.metrics().memoryBytes};
}
const rows=[run(false),run(true),run(true),run(false)];
const report={scope:'Same two Sabana chunks and seed, ABBA. One worker + one animal graph versus worker + all five native species radii. Isolated synchronous WASM; not a frame-time or full-game result.',rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(({animalBuildMs,queryMs,wallMs,removeMs,memoryBytes})=>({animalBuildMs,queryMs,wallMs,removeMs,memoryBytes}))));
