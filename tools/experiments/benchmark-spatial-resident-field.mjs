import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/hierarchical-wasm/spatial-world.js';

const before=new WebAssembly.Module(execFileSync('git',['show','0578f168:src/world/hierarchical-wasm/spatial-savanna.wasm'],{maxBuffer:8*1024*1024}));
const after=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-resident-field-abba.json';
function run(module,version){
  const core=createSpatialWorld(module),times=[];
  core.generate(712,0,0,'savanna');core.buildNavigation(1.1,false);core.addChunk(1,0);
  const earlier={x:-15.3,z:1.7},otherResidentBefore=core.surface(earlier.x,earlier.z);
  for(let center=1;center<=80;center++){
    const start=performance.now();
    if(core.removeChunk(center-1,0)!==1||core.addChunk(center+1,0)<0)
      throw Error('Resident traversal failed');
    times.push(performance.now()-start);
    if(core.metrics().loadedChunks!==2||core.metrics().loadedSectors!==32)
      throw Error('Spatial residency grew during traversal');
  }
  const sorted=times.slice().sort((a,b)=>a-b);
  return {version,otherResidentSurface:Number.isFinite(otherResidentBefore)?otherResidentBefore:null,
    medianStepMs:sorted[40],p95StepMs:sorted[76],totalStepMs:times.reduce((a,b)=>a+b,0),
    memoryBytes:core.metrics().memoryBytes,loadedChunks:core.metrics().loadedChunks,
    loadedSectors:core.metrics().loadedSectors};
}
const rows=[run(before,'before'),run(after,'after'),run(after,'after'),run(before,'before')];
const report={scope:'ABBA, same Sabana seed and 80-step two-chunk residency. Compares committed 0578f168 WASM with resident field samples; excludes compilation, visual upload and game simulation.',rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows));
