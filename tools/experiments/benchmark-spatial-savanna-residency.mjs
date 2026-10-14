import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/hierarchical-wasm/spatial-savanna-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-savanna-residency.json';
const module=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
const core=createSpatialSavannaPrototype(module);
core.generate(712,0,0);core.buildNavigation(1.1,false);core.addChunk(1,0);
const initial=core.metrics(),iterations=[];
for(let center=1;center<=80;center++){
  const before=performance.now();
  if(core.removeChunk(center-1,0)!==1)throw Error(`Could not evict chunk ${center-1}`);
  const removedAt=performance.now();
  if(core.addChunk(center+1,0)<0)throw Error(`Could not add chunk ${center+1}`);
  const addedAt=performance.now();
  const metrics=core.metrics();
  if(metrics.loadedChunks!==2||metrics.loadedSectors!==32||metrics.sectorSlots!==32)
    throw Error(`Unbounded sector residency at chunk ${center}: ${JSON.stringify(metrics)}`);
  iterations.push({center,removeMs:removedAt-before,addMs:addedAt-removedAt,
    memoryBytes:metrics.memoryBytes,sectorSlots:metrics.sectorSlots});
}
const ordered=iterations.map(row=>row.addMs).sort((a,b)=>a-b);
const report={scope:'QA-only 80-chunk straight-line traversal, two resident chunks, Sabana seed 712.',
  initial,final:core.metrics(),maxMemoryBytes:Math.max(...iterations.map(row=>row.memoryBytes)),
  addMedianMs:ordered[Math.floor(ordered.length/2)],addP95Ms:ordered[Math.floor(ordered.length*.95)],iterations};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({initial:report.initial,final:report.final,maxMemoryBytes:report.maxMemoryBytes,
  addMedianMs:report.addMedianMs,addP95Ms:report.addP95Ms,iterations:iterations.length}));
