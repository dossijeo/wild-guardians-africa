import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {villageLayout} from '../../src/world/villages.js';

const bytes=readFileSync('src/world/wild-engine/spatial-savanna.wasm');
const pack=JSON.parse(readFileSync('public/content/villages.json','utf8'))[0];
const state={seed:'712',biome:'sabana',villages:[{id:'village-1',x:0,z:0,
  buildings:villageLayout(pack,0,0)}],structures:[{id:'center-1',kind:'center',
    villageId:'village-1',culture:'mapungubwe',status:'intact',x:23,z:0,yaw:0,hp:100}],
  spells:[],suppressed:[]};
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-savanna-session.json';
const jobs=new Map([['0,0',{cx:0,cz:0,score:0}],['1,0',{cx:1,cz:0,score:1}]]);
const rows=[];
for(let sample=0;sample<8;sample++){
  const start=performance.now(),module=new WebAssembly.Module(bytes),compileMs=performance.now()-start;
  const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,
    onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  const setupMs=performance.now()-start-compileMs;
  const streamStart=performance.now();session.stream.plan(jobs);
  await session.stream.whenIdle();
  const streamMs=performance.now()-streamStart;
  const routeStart=performance.now();
  const worker=session.routeActor({x:17,z:-10},{x:31,z:-10});
  const animal=session.routeActor({x:17,z:-10},{x:31,z:-10},{worker:false});
  const routeMs=performance.now()-routeStart;
  const editStart=performance.now();
  const next={...state,structures:[...state.structures,{id:'wall-1',kind:'wall',
    material:'adobe',status:'intact',x:23.5,z:-10,yaw:0,baseScaleX:1,hp:100,gate:false}]};
  session.syncState(next);const wallAddMs=performance.now()-editStart;
  next.structures.at(-1).status='ruined';
  const removeStart=performance.now();session.syncState(next);
  const wallRemoveMs=performance.now()-removeStart;
  rows.push({sample,compileMs,setupMs,streamMs,routeMs,wallAddMs,wallRemoveMs,
    totalReadyMs:compileMs+setupMs+streamMs,worker:worker.status,animal:animal.status,
    chunks:loaded.size,...session.core.metrics()});
  session.dispose();
}
const report={scope:'Sabana seed 712, Mapungubwe village and center; one WASM instance for two streamed visual chunks, worker and warthog graphs, route pair and one wall add/remove. Desktop Node; excludes GPU upload, browser transfer, actor motion and sustained campaign. Different generator from current JS game.',rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(({sample,totalReadyMs,routeMs,wallAddMs,wallRemoveMs})=>({sample,totalReadyMs,routeMs,wallAddMs,wallRemoveMs}))));
