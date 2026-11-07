import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
const paths=[process.env.DYNAMIC_BODY_BASE??'.cache/spatial-dynamic-linear.wasm',process.env.DYNAMIC_BODY_CANDIDATE??'.cache/spatial-dynamic-test.wasm'];
const wasm=paths.map(path=>{const w=new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path)),{env:{emscripten_notify_memory_growth(){}}}).exports;w._initialize?.();return w;});
const bodies=Array.from({length:32},(_,i)=>({id:i+1,x:(i%8)*5,z:Math.floor(i/8)*5,r:.45}));
const loops=300000,rows=[];
for(const operation of ['upsert','blockers','segment']){
 const run=kind=>{const w=wasm[kind];w.spatial_bodies_reset();for(const b of bodies)w.spatial_body_upsert(b.id,b.x,b.z,b.r,0,1);let sum=0;const start=performance.now();for(let i=0;i<loops;i++){const b=bodies[i%32];if(operation==='upsert')sum+=w.spatial_body_upsert(b.id,b.x+(i%2)*.01,b.z,b.r,0,1);else if(operation==='blockers')sum+=w.spatial_body_has_blockers(b.id,8);else sum+=w.spatial_body_segment_clear(b.id,b.x,b.z,b.x+2,b.z+2,1);}return {kind:kind?'index':'linear',ms:performance.now()-start,sum};};
 run(0);run(1);const blocks=[0,1,1,0].map(run);if(new Set(blocks.map(b=>b.sum)).size!==1)throw Error('Result mismatch');rows.push({operation,loops,blocks});
}
fs.writeFileSync(process.env.DYNAMIC_BODY_BENCH_OUT??'docs/lighting/tree-near-retexture/performance/dynamic-body-breakdown-abba.json',JSON.stringify({scope:'Node WASM microbenchmark; 32 persistent bodies; no complete simulation tick.',paths,rows},null,2));console.log(JSON.stringify(rows));
