import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/wild-engine/spatial-savanna-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-settlement-scale.json';
const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const rows=[];
for(const count of [0,50,250,250,50,0]){
  const core=createSpatialSavannaPrototype(module);
  core.generate(712,0,0);core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
  core.setSettlement(10,8,7,6);
  const additions=performance.now();
  for(let i=0;i<count;i++)core.addSettlement(1000+i*96,8,7,6);
  const addMs=performance.now()-additions;
  const samples=[];
  for(let i=0;i<12;i++){
    const started=performance.now();core.selectChunk(0,0);samples.push(performance.now()-started);
  }
  const sorted=samples.slice(2).sort((a,b)=>a-b);
  const hash=createHash('sha256');
  hash.update(Buffer.from(core.heights().buffer,core.heights().byteOffset,core.heights().byteLength));
  hash.update(Buffer.from(core.groundMask().buffer,core.groundMask().byteOffset,core.groundMask().byteLength));
  rows.push({distantSettlements:count,addMs,chunkSelectMedianMs:(sorted[4]+sorted[5])/2,
    chunkSelectMaxMs:sorted.at(-1),terrainDigest:hash.digest('hex'),metrics:core.metrics()});
}
if(new Set(rows.map(row=>row.terrainDigest)).size!==1)
  throw Error('Distant settlements changed the resident chunk terrain');
const report={scope:'Isolated Sabana WASM instance with one resident chunk, two navigation profiles and one local settlement. Added sites are far outside the resident chunk. Measures reselection of that chunk only; not full gameplay or rendering.',rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(({distantSettlements,addMs,chunkSelectMedianMs,chunkSelectMaxMs,metrics})=>({distantSettlements,addMs,chunkSelectMedianMs,chunkSelectMaxMs,memoryBytes:metrics.memoryBytes}))));
