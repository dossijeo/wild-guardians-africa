import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';

const previous=process.argv[2];
if(!previous)throw Error('Pass a previously committed spatial WASM binary as the first argument');
const binaries={before:readFileSync(previous),
  after:readFileSync('src/world/wild-engine/spatial-savanna.wasm')};
const modules={before:new WebAssembly.Module(binaries.before),after:new WebAssembly.Module(binaries.after)};
const queries=Array.from({length:50},(_,i)=>({start:{x:-18+i%10*4,z:-18+Math.floor(i/10)*7},
  end:{x:17-i%7*4,z:17-Math.floor(i/7)*4}}));
const rows=[];
for(const seed of [712,28,123])for(const mode of ['before','after','after','before']){
  const core=createSpatialWorld(modules[mode]);
  let time=performance.now();core.generate(seed,0,0);
  const generationMs=performance.now()-time;
  time=performance.now();core.buildNavigation(.28,true);
  const workerBuildMs=performance.now()-time;
  time=performance.now();core.buildNavigation(1.1,false);
  const animalBuildMs=performance.now()-time;
  time=performance.now();
  const outcomes=queries.map(({start,end})=>core.route(start,end).status);
  const routesMs=performance.now()-time;
  rows.push({seed,mode,generationMs,workerBuildMs,animalBuildMs,routesMs,
    memoryBytes:core.metrics().memoryBytes,outcomes});
}
for(const seed of [712,28,123]){
  const group=rows.filter(row=>row.seed===seed);
  for(const row of group)if(JSON.stringify(row.outcomes)!==JSON.stringify(group[0].outcomes))
    throw Error(`Route statuses diverged at seed ${seed}`);
}
const output=process.argv[3]??'docs/qa/hierarchical-navigation/spatial-polygon-overhead-abba.json';
const report={scope:'ABBA isolated same-world comparison against a committed WASM binary before optional polygon obstacles. No dynamic polygon placed; measures generation, two graph builds and 50 route queries. Module compilation excluded.',
  baselineCommit:'3acfd185',sha256:Object.fromEntries(Object.entries(binaries).map(([key,bytes])=>
    [key,createHash('sha256').update(bytes).digest('hex')])),
  rows:rows.map(({outcomes,...row})=>row)};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.rows));
