import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/wild-engine/spatial-savanna-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-dual-profile-streaming.json';
const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const profiles=[{name:'animal-only',worker:false},{name:'worker-and-animal',worker:true}];
function measure({name,worker}){
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);
  const coldStart=performance.now();
  if(core.buildNavigation(1.1,false)!==16)throw Error('Animal graph failed');
  if(worker&&core.buildNavigation(.28,true)!==16)throw Error('Worker graph failed');
  const coldBuildMs=performance.now()-coldStart;
  core.addChunk(1,0);
  const rows=[];
  for(let center=1;center<=80;center++){
    const before=performance.now();
    if(core.removeChunk(center-1,0)!==1)throw Error(`Cannot remove chunk ${center-1}`);
    const removed=performance.now();
    if(core.addChunk(center+1,0)<0)throw Error(`Cannot add chunk ${center+1}`);
    const added=performance.now();
    const metrics=core.metrics();
    if(metrics.loadedChunks!==2||metrics.loadedSectors!==32||metrics.sectorSlots!==32)
      throw Error(`Unbounded graph at ${center}: ${JSON.stringify(metrics)}`);
    if(worker){
      if(core.selectNavigation(true)!==32||core.selectNavigation(false)!==32)
        throw Error(`Lost a movement profile at ${center}`);
    }
    rows.push({center,removeMs:removed-before,addMs:added-removed,
      memoryBytes:metrics.memoryBytes,sectorSlots:metrics.sectorSlots});
  }
  const sorted=rows.map(row=>row.removeMs+row.addMs).sort((a,b)=>a-b);
  return {name,coldBuildMs,stepMedianMs:sorted[Math.floor(sorted.length/2)],
    stepP95Ms:sorted[Math.floor(sorted.length*.95)],stepTotalMs:sorted.reduce((a,b)=>a+b,0),
    maxMemoryBytes:Math.max(...rows.map(row=>row.memoryBytes)),rows};
}
const runs=[];
for(const order of [[0,1],[1,0],[0,1],[1,0]])
  for(const index of order)runs.push(measure(profiles[index]));
const report={scope:'QA-only 80-step straight Sabana traversal, two resident chunks, seed 712; four ABBA pairs compare one versus two resident movement profiles.',runs};
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(runs.map(({name,coldBuildMs,stepMedianMs,stepP95Ms,stepTotalMs,maxMemoryBytes})=>({name,coldBuildMs,stepMedianMs,stepP95Ms,stepTotalMs,maxMemoryBytes}))));
