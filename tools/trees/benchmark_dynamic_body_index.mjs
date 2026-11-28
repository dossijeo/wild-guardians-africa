import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
const binaries=[process.env.DYNAMIC_BODY_BASE??'.cache/spatial-dynamic-linear.wasm',process.env.DYNAMIC_BODY_CANDIDATE??'.cache/spatial-dynamic-test.wasm'];
const wasm=binaries.map(path=>{const w=new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path)),{env:{emscripten_notify_memory_growth(){}}}).exports;w._initialize?.();return w;});
let seed=20261101;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const rows=[];
for(const count of [32,128,512,2048]){
 const bodies=Array.from({length:count},(_,i)=>({id:i+1,x:random()*400-200,z:random()*400-200,r:.3+random()*.5}));
 const ops=Array.from({length:12000},()=>({index:Math.floor(random()*count),dx:random()*.4-.2,dz:random()*.4-.2,gx:random()*8-4,gz:random()*8-4}));
 const run=(kind)=>{
  const w=wasm[kind],actors=bodies.map(b=>({...b}));w.spatial_bodies_reset();for(const b of actors)w.spatial_body_upsert(b.id,b.x,b.z,b.r,0,1);
  let checksum=0;const start=performance.now();
  for(const op of ops){const b=actors[op.index];b.x+=op.dx;b.z+=op.dz;w.spatial_body_upsert(b.id,b.x,b.z,b.r,0,1);checksum+=w.spatial_body_has_blockers(b.id,8)+w.spatial_body_segment_clear(b.id,b.x,b.z,b.x+op.gx,b.z+op.gz,1);}
  return {ms:performance.now()-start,checksum};
 };
 run(0);run(1);const blocks=[0,1,1,0].map(kind=>({kind:kind?'index':'linear',...run(kind)}));
 if(new Set(blocks.map(b=>b.checksum)).size!==1)throw Error(`Mismatch in ${count} actors`);
 rows.push({count,operations:ops.length,blocks});console.log(JSON.stringify(rows.at(-1)));
}
const path=process.env.DYNAMIC_BODY_BENCH_OUT??'docs/lighting/tree-near-retexture/performance/dynamic-body-index-abba.json';fs.writeFileSync(path,JSON.stringify({scope:'Node WASM, deterministic moving discs, upsert plus local blocker and swept-segment query; not a complete game tick.',rows},null,2));
