import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';

const fixtures=[
  ['gran-canon-123-day6','docs/qa/hierarchical-navigation/spatial-gran-canon-seed123-day6-capture-capture-state.json'],
  ['sabana-day13','docs/qa/hierarchical-navigation/spatial-virtual-sabana-14-state.json'],
  ['manglares-123-day10','docs/qa/wild-engine-cache-benchmark/manglares-123-d10-raid-state.json.gz'],
  ['desierto-983-day15','tests/fixtures/desierto983-d15-partial-state.json.gz'],
];
const wasmBytes=readFileSync(new URL('./nav-cache-prototype.wasm',import.meta.url));
const module=new WebAssembly.Module(wasmBytes);
const digest=value=>createHash('sha256').update(value).digest('hex');
const source={wasmSha256:digest(wasmBytes),fixtureSha256:{}};
const modes=['A','B','C','C','B','A'];
const rounds=Number(process.argv[2]??4);
if(!Number.isSafeInteger(rounds)||rounds<2||rounds>50)throw Error('Expected 2–50 ABBA rounds');

function loadState(path){
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
function signature(wasm,kind,result){
  const reason=wasm.lazy_connected_reason();
  if(kind==='connected')return `${result}:${reason}`;
  if(result<=0)return `${result}:${reason}`;
  const points=new Int32Array(wasm.memory.buffer,wasm.lazy_route_ptr(),result*2);
  let hash=2166136261;
  for(const point of points){hash^=point;hash=Math.imul(hash,16777619);}
  return `${result}:${reason}:${hash>>>0}`;
}
function locate(wasm,point){
  const x=Math.round(point.x),z=Math.round(point.z);
  for(let ring=0;ring<=3;ring++)for(let dz=-ring;dz<=ring;dz++)for(let dx=-ring;dx<=ring;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dz))!==ring)continue;
    if(wasm.lazy_component(x+dx,z+dz)>=0)return {x:x+dx,z:z+dz};
  }
  return null;
}
function queryStream(wasm,state,worker){
  const actors=worker?state.workers.filter(w=>w.status!=='home'):(state.raid?.animals??[]);
  const center=state.structures.find(x=>x.kind==='center')??state.villages[0];
  const rawOrigins=actors.length?actors:[center,...state.structures.slice(0,16)];
  const rawTargets=[...state.plants.filter(p=>p.alive),...state.structures.filter(s=>s.kind==='wall')];
  const origins=rawOrigins.filter((_,i)=>i%Math.max(1,Math.floor(rawOrigins.length/32))===0)
    .map(p=>locate(wasm,p)).filter(Boolean);
  const targets=rawTargets.filter((_,i)=>i%Math.max(1,Math.floor(rawTargets.length/96))===0)
    .map(p=>locate(wasm,p)).filter(Boolean);
  if(!origins.length||!targets.length)return [];
  const unique=[],seen=new Set();
  for(let i=0;i<768&&unique.length<128;i++){
    const a=origins[i%origins.length],b=targets[(i*37+Math.floor(i/Math.max(1,origins.length)))%targets.length];
    const key=`${a.x},${a.z}:${b.x},${b.z}`;
    if(seen.has(key))continue;seen.add(key);
    unique.push({a,b,key});
  }
  return unique;
}
function measure(wasm,queries,kind,mode){
  wasm.nav_cache_reset();wasm.nav_cache_clear_metrics();
  const js=new Map(),regular=kind==='connected'?wasm.lazy_connected:wasm.lazy_route,
    native=kind==='connected'?wasm.nav_cached_connected:wasm.nav_cached_route;
  const direct=q=>{
    const value=regular(q.a.x,q.a.z,q.b.x,q.b.z);
    return signature(wasm,kind,value);
  };
  const cached=q=>{
    const value=native(q.a.x,q.a.z,q.b.x,q.b.z);
    return signature(wasm,kind,value);
  };
  const run=q=>{
    if(mode==='A')return direct(q);
    if(mode==='C')return cached(q);
    if(js.has(q.key))return js.get(q.key);
    const value=direct(q);js.set(q.key,value);return value;
  };
  // One uncompensated first pass and seven repeated passes. The baseline
  // signature guards exact results, including unknown versus blocked.
  const first=[],steady=[];
  let nativeCalls=0,elapsed=[];
  for(let pass=0;pass<8;pass++){
    const began=performance.now(),signatures=[];
    for(const q of queries)signatures.push(run(q));
    elapsed.push(performance.now()-began);
    (pass===0?first:steady).push(...signatures);
  }
  nativeCalls=mode==='B'?js.size:queries.length*8;
  return {mode,kind,uniqueQueries:queries.length,firstMs:elapsed[0],steadyMs:elapsed.slice(1),
    callsJsToWasm:nativeCalls,jsEntries:js.size,nativeEntries:wasm.nav_cache_entries(),
    nativeHits:wasm.nav_cache_hits(),nativeMisses:wasm.nav_cache_misses(),
    firstSignature:digest(first.join('|')),steadySignature:digest(steady.join('|'))};
}

const cases=[];
for(const [name,path] of fixtures){
  const state=loadState(path),loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
  });
  try{
    const village=state.villages[0],box=residentBox(state);
    const setupStarted=performance.now();
    for(let z=box.z0;z<=box.z1;z++)for(let x=box.x0;x<=box.x1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const setupMs=performance.now()-setupStarted,wasm=session.core.wasm;
    for(const [profile,options] of [['worker',{worker:true}],['warthog',{worker:false,species:'warthog'}]]){
      session.actorRegions(village,options);
      const queries=queryStream(wasm,state,options.worker);
      if(!queries.length){cases.push({fixture:name,profile,skipped:'no resident query pairs'});continue;}
      // Warm JIT and the graph before timing; every variant then receives
      // identical queries and its own empty cache.
      for(const q of queries.slice(0,Math.min(16,queries.length)))wasm.lazy_connected(q.a.x,q.a.z,q.b.x,q.b.z);
      for(const kind of ['connected','route']){
        const runs=[];
        for(let round=0;round<rounds;round++)for(const mode of round%2?
          ['C','B','A','A','B','C']:modes)
          runs.push({round,...measure(wasm,queries,kind,mode)});
        const expected=runs[0];
        if(runs.some(run=>run.firstSignature!==expected.firstSignature||
          run.steadySignature!==expected.steadySignature))
          throw Error(`Result mismatch: ${name}/${profile}/${kind}`);
        cases.push({fixture:name,profile,kind,day:state.day,workers:state.workers.length,
          liveCrops:state.plants.filter(p=>p.alive).length,walls:state.structures.filter(s=>s.kind==='wall').length,
          setupMs,wasmBytes:wasm.memory.buffer.byteLength,queries:queries.length,runs});
      }
    }
  }finally{session.dispose();}
}
const report={source,rounds,cases};
const out=process.argv[3]??'docs/qa/wild-engine-cache-benchmark/abc-low-level.json';
writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({out,source,summary:cases.map(c=>({fixture:c.fixture,profile:c.profile,
  kind:c.kind,queries:c.queries,setupMs:c.setupMs,firstMs:c.runs?.slice(0,3).map(r=>[r.mode,r.firstMs]),
  steadyMs:c.runs?.slice(0,3).map(r=>[r.mode,r.steadyMs.reduce((a,b)=>a+b,0)/r.steadyMs.length])}))},null,2));
