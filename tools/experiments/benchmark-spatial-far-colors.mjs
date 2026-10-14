import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/hierarchical-wasm/spatial-world.js';
import {BIOME_IDS} from '../../src/world/biome-ids.js';

const module=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-far-colors.json';
const points=new Float32Array(193*97*2);
for(let row=0;row<97;row++)for(let col=0;col<193;col++){
  const index=(row*193+col)*2;points[index]=-384+col*4;points[index+1]=-384+row*8;
}
const rows=[];
for(const biome of Object.keys(BIOME_IDS)){
  const core=createSpatialWorld(module);core.generate(712,0,0,biome);
  core.setSettlement(0,0,15,12);
  const samples=[];let checksum=0;
  for(let repeat=0;repeat<5;repeat++){
    const started=performance.now(),colors=core.groundColorsAnywhere(points);
    samples.push(performance.now()-started);
    checksum=colors.reduce((sum,value)=>sum+value,0);
  }
  rows.push({biome,medianMs:[...samples].sort((a,b)=>a-b)[2],
    rangeMs:[Math.min(...samples),Math.max(...samples)],checksum,
    loadedChunks:core.metrics().loadedChunks,loadedSectors:core.metrics().loadedSectors,
    memoryBytes:core.metrics().memoryBytes});
}
const report={scope:'One batched color query for a 193 × 97 integer-vertex coarse horizon (18,721 vertices), five passes per biome after WASM compilation and a settlement at origin. Node desktop; excludes terrain-height calls, water edges, mesh construction, GPU upload and browser frame scheduling.',rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(({biome,medianMs,memoryBytes})=>({biome,medianMs,memoryBytes}))));
