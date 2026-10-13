import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/hierarchical-wasm/spatial-world.js';
import {BIOME_IDS} from '../../src/world/biome-ids.js';

const module=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-far-queries.json';
const same=Array.from({length:1024},(_,i)=>({x:135+(i%32)*.5,z:78+Math.floor(i/32)*.5}));
const dispersed=Array.from({length:1024},(_,i)=>({x:135+(i%32)*32,z:78+Math.floor(i/32)*32}));
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
function sample(points,query){
  const times=[];let checksum=0;
  for(let repeat=0;repeat<5;repeat++){
    const started=performance.now();let total=0;
    for(const {x,z} of points)total+=query(x,z);
    times.push(performance.now()-started);checksum=total;
  }
  return {medianMs:median(times),rangeMs:[Math.min(...times),Math.max(...times)],checksum};
}
const rows=[];
for(const biome of Object.keys(BIOME_IDS)){
  const core=createSpatialWorld(module);core.generate(712,0,0,biome);
  core.setSettlement(0,0,15,12);
  const farSame=sample(same,core.surfaceAnywhere);
  const farDispersed=sample(dispersed,core.surfaceAnywhere);
  const afterFar=core.metrics();core.addChunk(3,2);
  const resident=sample(same,core.surface);
  if(Math.abs(farSame.checksum-resident.checksum)>.01)
    throw Error(`${biome}: far and resident heights differ`);
  rows.push({biome,farSame,farDispersed,resident,
    chunksAfterFar:afterFar.loadedChunks,sectorsAfterFar:afterFar.loadedSectors,
    memoryBytesAfterFar:afterFar.memoryBytes});
}
const report={scope:'One precompiled WASM module; 1024 height queries per pass, five passes per case, Sabana-compatible settlement near origin. Far same-chunk and dispersed queries do not make chunks resident; resident queries run after explicitly loading the common distant chunk. Node desktop; no Three.js, browser or frame-time measurement.',rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(({biome,farSame,farDispersed,resident})=>({biome,
  farSameMs:farSame.medianMs,farDispersedMs:farDispersed.medianMs,residentMs:resident.medianMs}))));
