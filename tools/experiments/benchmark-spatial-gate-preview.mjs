import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {villageLayout} from '../../src/world/villages.js';
import * as Game from '../../src/simulation/game.js';

const binary=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const pack=JSON.parse(readFileSync(new URL('../../public/content/villages.json',
  import.meta.url),'utf8'))[0];
const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',
  slotId:'spatial-gate-benchmark'});
state.villages[0].buildings=villageLayout(pack,0,0);
state.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
  villageId:'village-1',status:'intact',hp:600,maxHp:600});
const chunks=new Map(),session=createSpatialGameSession(binary,state,{
  loaded:()=>chunks,onData:data=>chunks.set(`${data.cx},${data.cz}`,data)});
const options={smooth:false,snap:false};
const sample=(array,quantile)=>array[Math.min(array.length-1,
  Math.ceil(array.length*quantile)-1)];
try{
  const jobs=new Map(),loadStart=performance.now();
  for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
    jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
  session.stream.plan(jobs);await session.stream.whenIdle();
  const loadMs=performance.now()-loadStart;
  const nav=createSpatialNavigationMovement(session,state);
  let ring=null,searchCount=0;
  const searchStart=performance.now();
  for(let z=-14;z<=14&&!ring;z+=4)for(let x=-14;x<=14&&!ring;x+=4){
    const candidate=[[x,z],[x+8,z],[x+8,z+8],[x,z+8],[x,z]];
    const preview=Game.previewWallChain(state,'zarzas',candidate,nav,options);
    searchCount++;
    if(preview.gates===1&&preview.pieces.length>=12)ring=candidate;
  }
  if(!ring)throw Error('No valid automatic-gate ring found');
  const searchMs=performance.now()-searchStart;
  const calls={};
  for(const [owner,name] of [[nav,'path'],[nav,'wallPlacement'],[nav,'propsAt'],
    [session,'withWallPreview']]){
    const original=owner[name];
    calls[name]={count:0,ms:0};
    owner[name]=(...args)=>{
      const start=performance.now();
      try{return original(...args);}finally{
        calls[name].count++;calls[name].ms+=performance.now()-start;
      }
    };
  }
  const previewMs=[];
  for(let i=0;i<20;i++){
    const start=performance.now();
    const preview=Game.previewWallChain(state,'zarzas',ring,nav,options);
    if(preview.gates!==1)throw Error('Gate preview changed during a read-only benchmark');
    previewMs.push(performance.now()-start);
  }
  const buildStart=performance.now();
  if(!Game.buildWallChain(state,'qa-ring','zarzas',ring,nav,options))
    throw Error('Game action did not construct the ring');
  const buildMs=performance.now()-buildStart;
  previewMs.sort((a,b)=>a-b);
  const report={source:'Native Sabana seed 712, Mapungubwe, Node desktop',
    warmup:'twenty previews after one valid-site search; separate from load',
    residentChunks:session.core.metrics().loadedChunks,
    loadMs,siteSearch:{candidates:searchCount,ms:searchMs},
    preview:{samples:previewMs.length,minMs:previewMs[0],medianMs:sample(previewMs,.5),
      p95Ms:sample(previewMs,.95),maxMs:previewMs.at(-1)},
    buildMs,calls,wallPieces:state.structures.filter(s=>s.kind==='wall').length,
    automaticGates:state.structures.filter(s=>s.autoGate).length,
    wasmMemoryBytes:session.core.metrics().memoryBytes,
    limitation:'Native and legacy worlds differ; this is not a production frame-time or AB comparison.'};
  const target=new URL('../../docs/qa/hierarchical-navigation/spatial-gate-preview.json',
    import.meta.url);
  writeFileSync(target,JSON.stringify(report,null,2)+'\n');
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
}finally{session.dispose();}
