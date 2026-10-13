import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {BIOME_IDS} from '../../src/world/biome-ids.js';
import {villageLayout} from '../../src/world/villages.js';

const module=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
const packs=JSON.parse(readFileSync('public/content/villages.json','utf8'));
const cultures=['mapungubwe','saheliana','suajili','musgum','etiope'];
const jobs=new Map([['0,0',{cx:0,cz:0,score:0}],['1,0',{cx:1,cz:0,score:1}]]);
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-session-matrix.json';
const rows=[];
for(const seed of ['28','712'])for(const biome of Object.keys(BIOME_IDS)){
  for(let index=0;index<cultures.length;index++){
    const culture=cultures[index],pack=packs[index],state={seed,biome,culture,
      villages:[{id:'village-1',culture,x:0,z:0,buildings:villageLayout(pack,0,0)}],
      structures:[],spells:[],suppressed:[]};
    const loaded=new Map(),started=performance.now();
    const session=createSpatialGameSession(module,state,{loaded:()=>loaded,
      onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
    const graphReadyMs=performance.now()-started,streamStart=performance.now();
    session.stream.plan(jobs);await session.stream.whenIdle();
    const streamMs=performance.now()-streamStart;
    const routeStart=performance.now();
    const worker=session.routeActor({x:19,z:-14},{x:29,z:-14});
    const animal=session.routeActor({x:19,z:-14},{x:29,z:-14},{worker:false});
    const routeMs=performance.now()-routeStart;
    rows.push({seed,biome,culture,graphReadyMs,streamMs,routeMs,
      totalReadyMs:graphReadyMs+streamMs,worker:worker.status,animal:animal.status,
      chunks:loaded.size,props:[...loaded.values()].reduce((sum,payload)=>
        sum+payload.instances.flat().length,0),...session.core.metrics()});
    session.dispose();
  }
}
const report={scope:'Two requested visual chunks and worker/warthog graphs for 2 seeds × 6 biomes × 5 authored village layouts. Shared WASM module already compiled; each row constructs a fresh core. Generic village origin is a diagnostic fixture, not the game’s biome-specific settlement placement. Node desktop; excludes GPU upload, actor movement, browser transfer and campaign.',rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(({seed,biome,culture,totalReadyMs,routeMs})=>
  ({seed,biome,culture,totalReadyMs,routeMs}))));
