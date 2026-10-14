import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';

const module=new WebAssembly.Module(readFileSync(new URL('./nav-cache-prototype.wasm',import.meta.url)));
const wasm=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}}}).exports;
// This intentionally measures the call and lookup floor on an empty graph;
// populated route costs are measured separately by the frozen fixtures.
const values=new Map([['0,0:1,1',-1]]),iterations=250_000,rounds=4;
const operations={
  jsLookup:()=>values.get('0,0:1,1'),
  wasmTrivial:()=>wasm.lazy_sector_updates(),
  wasmCacheHit:()=>wasm.nav_cached_connected(0,0,1,1),
  wasmFresh:()=>wasm.lazy_connected(0,0,1,1)
};
wasm.nav_cached_connected(0,0,1,1);
function measure(name){
  const fn=operations[name];let checksum=0;
  for(let i=0;i<20_000;i++)checksum+=fn();
  const started=performance.now();
  for(let i=0;i<iterations;i++)checksum+=fn();
  return {name,ms:performance.now()-started,checksum};
}
const order=Object.keys(operations),results=[];
for(let round=0;round<rounds;round++){
  const names=round%2?[...order].reverse():order;
  for(const name of names)results.push({round,...measure(name)});
}
const out=process.argv[2]??'docs/qa/wild-engine-cache-benchmark/call-overhead.json';
writeFileSync(out,JSON.stringify({iterations,rounds,results},null,2));
console.log(JSON.stringify({out,results},null,2));
