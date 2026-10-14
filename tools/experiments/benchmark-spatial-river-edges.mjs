import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/hierarchical-wasm/spatial-world.js';

const module=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-river-edges.json';
const rows=[];
for(const biome of ['sabana','gran-rio','volcanes','gran-canon']){
  const core=createSpatialWorld(module);core.generate(712,0,0,biome);
  core.setSettlement(0,0,15,12);
  const samples=[];let checksum=0;
  for(let repeat=0;repeat<5;repeat++){
    const started=performance.now();let sum=0;
    for(let z=-384;z<384;z++)sum+=core.riverEdge(z,-1)+core.riverEdge(z,1);
    samples.push(performance.now()-started);checksum=sum;
  }
  rows.push({biome,medianMs:[...samples].sort((a,b)=>a-b)[2],rangeMs:[Math.min(...samples),Math.max(...samples)],
    checksum,loadedChunks:core.metrics().loadedChunks,loadedSectors:core.metrics().loadedSectors});
}
const report={scope:'Two native river-edge queries per metre across a 768 m far horizon, five passes after WASM compilation. Includes an initial settlement at origin. Desktop Node, no mesh construction, GPU upload or browser frame scheduling.',rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows));
