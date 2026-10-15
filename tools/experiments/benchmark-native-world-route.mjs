import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';

const fixtures=[
  ['gran-canon-d6','docs/qa/hierarchical-navigation/spatial-gran-canon-seed123-day6-capture-capture-state.json'],
  ['sabana-d14','docs/qa/hierarchical-navigation/spatial-virtual-sabana-14-state.json'],
  ['manglares-d10','tests/fixtures/manglares-123-d10-raid-state.json.gz'],
  ['desierto-d15','tests/fixtures/desierto983-d15-partial-state.json.gz'],
];
const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM??'.cache/native-route-prototype.wasm';
const wasmBytes=readFileSync(binary),module=new WebAssembly.Module(wasmBytes);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const output={wasmSha256:hash(wasmBytes),fixtures:[],rounds:4};

function residentBox(state){
  const points=[...state.villages,...state.workers,...(state.raid?.animals??[]),
    ...state.plants.filter(p=>p.alive),...state.structures.filter(s=>s.status!=='ruined')]
    .filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z));
  const chunk=value=>Math.floor((value+24)/48);
  const xs=points.map(p=>chunk(p.x)),zs=points.map(p=>chunk(p.z));
  const box={x0:Math.min(...xs)-1,x1:Math.max(...xs)+1,
    z0:Math.min(...zs)-1,z1:Math.max(...zs)+1};
  if((box.x1-box.x0+1)*(box.z1-box.z0+1)>144)throw Error('Excessive resident box');
  return box;
}
function queries(state){
  const origins=[...state.workers.filter(w=>w.status!=='home'),
    ...(state.raid?.animals??[]),...state.villages];
  const targets=[...state.plants.filter(p=>p.alive),
    ...state.structures.filter(s=>s.status!=='ruined')];
  const result=[],seen=new Set();
  if(!origins.length||!targets.length)return result;
  for(let i=0;i<500&&result.length<48;i++){
    const start=origins[i%origins.length],end=targets[(i*37+Math.floor(i/origins.length))%targets.length];
    if(![start.x,start.z,end.x,end.z].every(Number.isFinite))continue;
    const key=[start.x,start.z,end.x,end.z].join(',');
    if(seen.has(key))continue;
    seen.add(key);result.push({start,end});
  }
  return result;
}
function compare(a,b){
  if(a.status!==b.status||a.reason!==b.reason)return false;
  if(a.status!=='found')return true;
  if(a.points.length!==b.points.length)return false;
  return a.points.every((p,i)=>Math.abs(p.x-b.points[i].x)<1e-4&&
    Math.abs(p.z-b.points[i].z)<1e-4);
}
function time(call,items){
  const began=performance.now();
  for(const item of items)call(item);
  return performance.now()-began;
}

for(const [name,path] of fixtures){
  const bytes=readFileSync(path);
  const state=deserialize(path.endsWith('.gz')?gunzipSync(bytes).toString():bytes.toString());
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const box=residentBox(state),began=performance.now();
    for(let z=box.z0;z<=box.z1;z++)for(let x=box.x0;x<=box.x1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const setupMs=performance.now()-began;
    const rows=[];
    for(const [profile,options] of [['worker',{worker:true}],
      ['warthog',{worker:false,species:'warthog'}]]){
      const sample=queries(state);
      const mismatches=[];
      for(const [index,{start,end}] of sample.entries()){
        const old=session.routeActor(start,end,options);
        const native=session.routeActorNative(start,end,options);
        if(!compare(old,native))mismatches.push({index,start:{x:start.x,z:start.z},
          end:{x:end.x,z:end.z},old,native});
      }
      const batch=session.routeActorNativeBatch(sample,options);
      for(let i=0;i<sample.length;i++){
        const reference=session.routeActor(sample[i].start,sample[i].end,options);
        if(!compare(reference,batch[i]))mismatches.push({index:i,batch:batch[i],reference});
      }
      const runs=[];
      for(let round=0;round<4;round++){
        const order=round%2?['D','C','B','A','A','B','C','D']:
          ['A','B','C','D','D','C','B','A'];
        for(const arm of order){
          const call=arm==='A'?q=>session.routeActor(q.start,q.end,options):
            arm==='B'?q=>session.routeActorNative(q.start,q.end,options):
              q=>session.routeActorNative(q.start,q.end,{...options,cached:true});
          if(arm==='D'){
            const run=()=>session.routeActorNativeBatch(sample,options);
            const t0=performance.now();run();const coldMs=performance.now()-t0;
            const t1=performance.now();run();
            runs.push({round,arm,coldMs,warmMs:performance.now()-t1});
          }else runs.push({round,arm,coldMs:time(call,sample),warmMs:time(call,sample)});
        }
      }
      rows.push({profile,queries:sample.length,mismatches:mismatches.slice(0,8),
        mismatchCount:mismatches.length,runs});
    }
    output.fixtures.push({name,path,fixtureSha256:hash(bytes),day:state.day,
      plants:state.plants.filter(p=>p.alive).length,workers:state.workers.length,
      animals:state.raid?.animals?.length??0,setupMs,wasmBytes:session.core.wasm.memory.buffer.byteLength,rows});
    console.log(`${name}: ${rows.map(r=>`${r.profile} ${r.mismatchCount}/${r.queries} mismatch`).join(', ')}`);
  }finally{session.dispose();}
}
const out=process.argv[2]??'docs/qa/native-route-planner/initial-ab.json';
writeFileSync(out,JSON.stringify(output,null,2));
console.log(out);
