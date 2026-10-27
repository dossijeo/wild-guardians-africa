import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import * as Game from '../../src/simulation/game.js';
import {probeSpatialStart} from '../../src/world/wild-engine/spatial-initial-site.js';

const output=process.argv[2]??
  'docs/qa/hierarchical-navigation/spatial-initial-site-cost.json';
const chunkMargin=Number(process.argv[3]??20);
if(!Number.isFinite(chunkMargin)||chunkMargin<0)
  throw RangeError('Expected a nonnegative chunk margin');
const module=new WebAssembly.Module(readFileSync(
  'src/world/wild-engine/spatial-savanna.wasm'));
const payload=JSON.parse(readFileSync('public/content/villages.json','utf8'))[0];
const state=Game.newGame({seed:712,biome:'gran-canon',
  culture:'mapungubwe',slotId:'native-start-benchmark'});
const rows=[];
for(let candidate=0;candidate<32;candidate++){
  const z=candidate===0?-30:24+(candidate-1)*12-30;
  const started=performance.now();
  const result=await probeSpatialStart(module,state,payload,
    {z,chunkMargin,measure:true});
  rows.push({candidate:candidate+1,z,valid:result.valid,
    reason:result.reason??null,loadedChunks:result.loadedChunks??null,
    chunkExpansions:result.chunkExpansions??0,...result.timings,
    elapsedMs:performance.now()-started});
  if(result.valid)break;
}
const sum=key=>rows.reduce((value,row)=>value+row[key],0);
const report={scope:'Gran Cañón, Mapungubwe, seed 712, native site search in Node; '
  +'one compiled WASM module, fresh world per candidate, no worker transfer, '
  +'rendering, GPU upload or game startup. Times include JS orchestration.',
  chunkMargin,candidates:rows.length,accepted:rows.at(-1)?.valid??false,
  totals:Object.fromEntries(['setupMs','streamMs','evaluateMs','totalMs','elapsedMs']
    .map(key=>[key,sum(key)])),rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.totals));
