import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import * as Game from '../../src/simulation/game.js';

const fixtures=[
  ['gran-canon-123-day6','docs/qa/hierarchical-navigation/spatial-gran-canon-seed123-day6-capture-capture-state.json'],
  ['sabana-day13','docs/qa/hierarchical-navigation/spatial-virtual-sabana-14-state.json'],
  ['manglares-123-day10','docs/qa/wild-engine-cache-benchmark/manglares-123-d10-raid-state.json.gz'],
  ['desierto-983-day15','tests/fixtures/desierto983-d15-partial-state.json.gz'],
];
const module=new WebAssembly.Module(readFileSync(new URL('./nav-cache-prototype.wasm',import.meta.url)));
const modes=['A','B','C','C','B','A'];
const repeats=Number(process.argv[2]??2),ticks=Number(process.argv[3]??2);
if(!Number.isSafeInteger(repeats)||repeats<1||repeats>8||
   !Number.isSafeInteger(ticks)||ticks<1||ticks>20)throw Error('Usage: benchmark-nav-cache-tick [repeats 1–8] [ticks 1–20]');
const digest=value=>createHash('sha256').update(value).digest('hex');
const source={wasmSha256:digest(readFileSync(new URL('./nav-cache-prototype.wasm',import.meta.url))),
  fixtureSha256:{}};
function load(path){
  const bytes=readFileSync(path);source.fixtureSha256[path]=digest(bytes);
  return deserialize(path.endsWith('.gz')?gunzipSync(bytes).toString('utf8'):bytes.toString('utf8'));
}
function residentBox(state){
  const points=[...state.villages,...state.workers,
    ...(state.raid?.animals??[]),...state.plants.filter(p=>p.alive),
    ...state.structures.filter(s=>s.status!=='ruined')].filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z));
  const chunk=coordinate=>Math.floor((coordinate+24)/48);
  const xs=points.map(p=>chunk(p.x)),zs=points.map(p=>chunk(p.z));
  const box={x0:Math.min(...xs)-1,z0:Math.min(...zs)-1,x1:Math.max(...xs)+1,z1:Math.max(...zs)+1};
  if((box.x1-box.x0+1)*(box.z1-box.z0+1)>144)throw Error('Fixture needs too many resident chunks');
  return box;
}
function run(path,mode){
  const state=load(path),loaded=new Map();
  const started=performance.now(),session=createSpatialGameSession(module,state,{
    experimentalNativeCache:mode==='C',loaded:()=>loaded,
    onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
  });
  try{
    const box=residentBox(state);
    for(let z=box.z0;z<=box.z1;z++)for(let x=box.x0;x<=box.x1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const setupMs=performance.now()-started;
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([box.x0*48-24,box.z0*48-24,box.x1*48+24,box.z1*48+24]);
    // All three arms bypass the existing blocked-worker proof. The B arm
    // installs one best-reasonable JS cache at the common routeActor seam.
    nav.workerPath=undefined;
    const original=session.routeActor,jsCache=new Map();
    let routeCalls=0,wasmCalls=0,jsHits=0,jsMisses=0,routeMs=0,connectivityCalls=0;
    session.routeActor=(a,b,options)=>{
      routeCalls++;
      const began=performance.now();
      try{
        if(mode==='B'){
          const epoch=`${session.topologySource.revision()}:${session.core.chunkRevision()}:`+
            `${session.core.wasm.lazy_sector_updates()}`;
          const key=`${epoch}:${options.worker?'worker':options.species}:`+
            `${a.x},${a.z}:${b.x},${b.z}`;
          if(jsCache.has(key)){jsHits++;return jsCache.get(key);}
          jsMisses++;wasmCalls++;
          const value=original(a,b,options);
          if(jsCache.size>=4096)jsCache.delete(jsCache.keys().next().value);
          jsCache.set(key,value);return value;
        }
        wasmCalls++;return original(a,b,options);
      }finally{routeMs+=performance.now()-began;}
    };
    const originalConnectivity=session.actorConnectivity;
    session.actorConnectivity=(...args)=>{connectivityCalls++;return originalConnectivity(...args);};
    const before=process.memoryUsage().heapUsed,rows=[];
    for(let i=0;i<ticks;i++){
      const day=state.day,begin=performance.now();
      Game.tick(state,1,nav);
      rows.push({day,ms:performance.now()-begin});
      if(state.day!==day||state.result)break;
    }
    return {mode,setupMs,rows,gameTickMs:rows.reduce((n,row)=>n+row.ms,0),
      routeCalls,routeMs,wasmCalls,jsHits,jsMisses,connectivityCalls,
      nativeHits:session.core.wasm.nav_cache_total_hits(),
      nativeMisses:session.core.wasm.nav_cache_total_misses(),
      nativeEntries:session.core.wasm.nav_cache_total_entries(),jsEntries:jsCache.size,
      jsHeapDeltaBytes:process.memoryUsage().heapUsed-before,
      wasmMemoryBytes:session.core.wasm.memory.buffer.byteLength,
      stateSha256:digest(serialize(state))};
  }finally{session.dispose();}
}
const cases=[];
for(const [fixture,path] of fixtures){
  const runs=[];
  for(let round=0;round<repeats;round++)for(const mode of round%2?
    ['C','B','A','A','B','C']:modes){
    const result=run(path,mode);
    runs.push({round,...result});
    console.log(`${fixture} ${round}/${mode} ${result.gameTickMs.toFixed(2)} ms ${result.stateSha256.slice(0,10)}`);
  }
  const hashes=new Set(runs.map(row=>row.stateSha256));
  cases.push({fixture,hashes:[...hashes],sameState:hashes.size===1,runs});
}
const report={source,repeats,ticks,cases};
const out=process.argv[4]??'docs/qa/wild-engine-cache-benchmark/abc-tick.json';
writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({out,summary:cases.map(c=>({fixture:c.fixture,sameState:c.sameState,
  medianLike:c.runs.slice(0,3).map(r=>({mode:r.mode,tickMs:r.gameTickMs,
    routeCalls:r.routeCalls,wasmCalls:r.wasmCalls,nativeHits:r.nativeHits,jsHits:r.jsHits}))}))},null,2));
