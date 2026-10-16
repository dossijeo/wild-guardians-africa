import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import {BIOME_IDS,SPATIAL_BIOME_CODES} from '../../src/world/biome-ids.js';

// Same fixed queries for baseline and candidate binaries. Calls the linked
// C++ graph directly to isolate traversal/array-clearing cost from JS routing.
const wasmPath=process.argv[2]??'src/world/hierarchical-wasm/spatial-savanna.wasm';
const output=process.argv[3],biome=process.argv[4]??'sabana';
const profile=process.argv[5]??'animal';
const code=SPATIAL_BIOME_CODES[BIOME_IDS[biome]??biome];
if(code===undefined||!['animal','worker'].includes(profile))
  throw RangeError('Usage: benchmark-wild-engine-bfs [wasm] [output] [biome] [animal|worker]');
const bytes=readFileSync(wasmPath);
const wasm=new WebAssembly.Instance(await WebAssembly.compile(bytes),
  {env:{emscripten_notify_memory_growth(){}}}).exports;
wasm.spatial_generate_biome(712,code,0,0);
for(let z=-3;z<=3;z++)for(let x=-3;x<=3;x++)if(x||z)wasm.spatial_add_chunk(x,z);
const worker=profile==='worker';
wasm.spatial_build_nav_profile(worker?1:0,worker?.28:.35,worker?1:0);
const sites=[];
for(let z=-144;z<=144;z+=6)for(let x=-144;x<=144;x+=6)
  if(wasm.spatial_walkable(x,z))sites.push({x,z});
if(sites.length<100)throw Error(`Only ${sites.length} traversable sample sites`);
const requests=Array.from({length:100},(_,i)=>{
  const from=sites[(i*53)%sites.length],to=sites[(sites.length-1-i*97+sites.length*100)%sites.length];
  return [from.x,from.z,to.x,to.z];
});
const rounds=[];
for(const kind of ['connected','route','route','connected','connected','route']){
  const began=performance.now(),hash=createHash('sha256'),outcomes={found:0,blocked:0,unknown:0};
  for(const [x,z,tx,tz] of requests){
    const result=kind==='connected'?wasm.lazy_connected(x,z,tx,tz):wasm.lazy_route(x,z,tx,tz);
    outcomes[result>0?'found':result===0?'blocked':'unknown']++;
    hash.update(`${result}:${wasm.lazy_connected_reason()};`);
    if(kind==='route'&&result>0)hash.update(Buffer.from(wasm.memory.buffer,
      wasm.lazy_route_ptr(),result*8));
  }
  rounds.push({kind,milliseconds:performance.now()-began,outcomes,sha256:hash.digest('hex')});
}
const report={source:{commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  wasmSha256:createHash('sha256').update(bytes).digest('hex'),
  runnerSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex')},
  biome,profile,seed:712,chunks:49,traversableSamples:sites.length,requests,rounds,
  description:'Synthetic direct C++ graph queries. No continuous movement, JS connector cost, or campaign result.'};
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({biome,profile,rounds}));
