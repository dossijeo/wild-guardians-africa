import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../src/world/hierarchical-wasm/spatial-world.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {buildSpatialHorizonData} from '../src/rendering/spatial-horizon-data.js';
import {makeCanyonHorizon,makeDesertHorizon} from '../src/rendering/horizon-source.js';

const wasm=new WebAssembly.Module(readFileSync(new URL('../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const report={kind:'isolated-horizon-cpu-abba',note:'Different procedural worlds; excludes GPU upload, browser worker, and gameplay frames.',cases:[]};
for(const biome of ['canyons','desert']){
  const seed=712,config={seed:String(seed),biome,relief:1,river:true};
  const profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${biome}.json`,import.meta.url))).profile;
  const region=activeChunkRegion({x:0,z:0},'media'),core=createSpatialWorld(wasm);
  core.generate(seed,0,0,biome);
  const old=()=>biome==='canyons'?makeCanyonHorizon(config,profile,0,0,region.bounds):
    makeDesertHorizon(config,profile,0,0,region.bounds);
  const current=()=>buildSpatialHorizonData(core,{config,profile,region});
  const timings=[];
  for(const implementation of ['js','wasm','wasm','js']){
    const start=performance.now(),result=(implementation==='js'?old:current)();
    timings.push({implementation,ms:+(performance.now()-start).toFixed(2),
      terrainBytes:result.terrain.byteLength,waterBytes:result.water.byteLength});
  }
  report.cases.push({biome,seed,region:region.bounds,timings,spatialMetrics:core.metrics()});
}
writeFileSync(new URL('../docs/qa/hierarchical-navigation/spatial-horizon-abba.json',import.meta.url),
  JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.cases.map(({biome,timings})=>({biome,timings})),null,2));
