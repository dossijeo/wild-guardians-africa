import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/hierarchical-wasm/spatial-world.js';

const before=new WebAssembly.Module(execFileSync('git',['show','04bf61e8:src/world/hierarchical-wasm/spatial-savanna.wasm'],{maxBuffer:8*1024*1024}));
const after=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-resident-props-abba.json';
function run(module,version){
  const core=createSpatialWorld(module),times=[];
  core.generate(712,0,0);core.buildNavigation(.28,true);core.addChunk(1,0);
  for(let center=1;center<=80;center++){
    const started=performance.now();
    core.removeChunk(center-1,0);core.addChunk(center+1,0);
    times.push(performance.now()-started);
    if(core.metrics().loadedChunks!==2||core.metrics().loadedSectors!==32)
      throw Error('Chunk or sector residency grew during traversal');
  }
  const sorted=times.slice().sort((a,b)=>a-b);
  return {version,medianStepMs:sorted[40],p95StepMs:sorted[76],totalStepMs:times.reduce((a,b)=>a+b,0),
    memoryBytes:core.metrics().memoryBytes,loadedChunks:core.metrics().loadedChunks,
    residentPropRecords:version==='after'?core.metrics().residentPropRecords:null};
}
const rows=[run(before,'before'),run(after,'after'),run(after,'after'),run(before,'before')];
writeFileSync(output,JSON.stringify({scope:'ABBA, seed-712 Sabana, 80 two-chunk residency steps, worker profile. Before is committed 04bf61e8 WASM; after retains prop records per resident chunk. Isolated synchronous cost, no rendering or game tick.',rows},null,2)+'\n');
console.log(JSON.stringify(rows));
