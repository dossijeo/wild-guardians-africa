import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {villageLayout} from '../../src/world/villages.js';

const before=process.argv[2],output=process.argv[3]??
  'docs/qa/hierarchical-navigation/spatial-edge-sampling-abba.json';
if(!before)throw Error('Pass the previous committed WASM binary for AB/BA');
const binaries={before:new WebAssembly.Module(readFileSync(before)),
  after:new WebAssembly.Module(readFileSync(
    'src/world/wild-engine/spatial-savanna.wasm'))};
const pack=JSON.parse(readFileSync('public/content/villages.json','utf8'))[0];
const jobs=new Map([['0,0',{cx:0,cz:0,score:0}],['1,0',{cx:1,cz:0,score:1}]]);
const rows=[];
for(const biome of ['sabana','desierto'])for(const seed of [712,28])
  for(let repetition=0;repetition<3;repetition++)
  for(const version of ['before','after','after','before']){
    const state={seed,biome,culture:'mapungubwe',villages:[{id:'village-1',
      culture:'mapungubwe',x:0,z:0,buildings:villageLayout(pack,0,0)}],
      structures:[],spells:[],suppressed:[]};
    const loaded=new Map(),start=performance.now();
    const session=createSpatialGameSession(binaries[version],state,{
      loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
    try{
      const setupMs=performance.now()-start,streamStart=performance.now();
      session.stream.plan(jobs);await session.stream.whenIdle();
      const streamMs=performance.now()-streamStart,routeStart=performance.now();
      const route=session.routeActor({x:12,z:-10},{x:29,z:-10},{worker:false});
      const routeMs=performance.now()-routeStart;
      rows.push({biome,seed,repetition,version,setupMs,streamMs,routeMs,
        readyMs:setupMs+streamMs,routeStatus:route.status,
        chunks:loaded.size,sectorUpdates:session.core.metrics().sectorUpdates});
    }finally{session.dispose();}
  }
const report={scope:'Node desktop AB/BA of one authored village, two visual chunks and both native profiles after changing grid-edge samples from quarters to fifths. WASM compiled before timings. Different route results can be valid when an old edge was physically invalid. Excludes browser GPU upload, worker transport and campaign.',rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
const summary=[];
for(const biome of ['sabana','desierto'])for(const version of ['before','after']){
  const sorted=rows.filter(row=>row.biome===biome&&row.version===version)
    .map(row=>row.readyMs).sort((a,b)=>a-b);
  summary.push({biome,version,medianReadyMs:+((sorted[5]+sorted[6])/2).toFixed(2),
    minMs:+sorted[0].toFixed(2),maxMs:+sorted.at(-1).toFixed(2)});
}
console.log(JSON.stringify(summary));
