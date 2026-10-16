import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import {BIOME_IDS,SPATIAL_BIOME_CODES} from '../../src/world/biome-ids.js';

// Isolated spatial workload. It records committed WASM pages and runtime
// growth notifications, not C++ heap usage or a legal campaign outcome.
const wasmPath=process.argv[2]??'src/world/hierarchical-wasm/spatial-savanna.wasm';
const output=process.argv[3];
const preGrowMiB=Number(process.argv[4]??0);
if(!Number.isSafeInteger(preGrowMiB)||preGrowMiB<0||preGrowMiB>256)
  throw RangeError('Optional pre-growth MiB must be an integer from 0 to 256');
const biome=process.argv[5]??'sabana',seed=Number(process.argv[6]??712);
const biomeCode=SPATIAL_BIOME_CODES[BIOME_IDS[biome]??biome];
if(biomeCode===undefined||!Number.isSafeInteger(seed)||seed<0)
  throw RangeError('Unknown biome or invalid seed');
const bytes=readFileSync(wasmPath),module=await WebAssembly.compile(bytes);
const source={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  wasmPath,wasmSha256:createHash('sha256').update(bytes).digest('hex'),
  runnerSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex')};
const sizes=[1,3,5,7],rows=[];
for(const side of sizes){
  let wasm=null;
  const growth=[];
  const began=performance.now();
  const instance=new WebAssembly.Instance(module,{env:{
    emscripten_notify_memory_growth(){growth.push({milliseconds:performance.now()-began,
      bytes:wasm?.memory.buffer.byteLength??null});}
  }});
  wasm=instance.exports;
  const samples=[];
  const sample=(phase,started)=>samples.push({phase,
    milliseconds:started===undefined?null:performance.now()-started,
    linearBytes:wasm.memory.buffer.byteLength,
    chunks:wasm.spatial_chunk_count(),sectors:wasm.lazy_loaded_sectors(),
    growthNotifications:growth.length});
  sample('instantiated');
  if(preGrowMiB){
    const started=performance.now();
    const target=preGrowMiB*1048576,current=wasm.memory.buffer.byteLength;
    if(target>current)wasm.memory.grow(Math.ceil((target-current)/65536));
    sample('explicit-pre-growth',started);
  }
  let phaseStart=performance.now();
  wasm.spatial_generate_biome(seed,biomeCode,0,0);
  sample('first-chunk',phaseStart);
  phaseStart=performance.now();
  const radius=Math.floor(side/2);
  for(let z=-radius;z<=radius;z++)for(let x=-radius;x<=radius;x++){
    if(!x&&!z)continue;
    wasm.spatial_add_chunk(x,z);
  }
  sample('chunks-loaded',phaseStart);
  phaseStart=performance.now();
  wasm.spatial_build_nav_profile(0,.35,0);
  sample('animal-navigation-built',phaseStart);
  phaseStart=performance.now();
  wasm.spatial_build_nav_profile(1,.28,1);
  sample('worker-navigation-built',phaseStart);
  phaseStart=performance.now();
  for(let i=0;i<100;i++){
    wasm.spatial_select_nav_profile_index(i%2);
    wasm.spatial_world_route(-12+(i%10)*2,-8,10-(i%10),8);
  }
  sample('hundred-routes',phaseStart);
  phaseStart=performance.now();
  const wall=wasm.spatial_add_wall(2,0,1,.3);
  if(wall>0)wasm.spatial_remove_wall(wall);
  sample('wall-added-removed',phaseStart);
  rows.push({chunks:side*side,samples,growth});
}
const report={source,biome,seed,preGrowMiB,
  description:'Synthetic sequential spatial workload. Explicit pre-growth is not an Emscripten INITIAL_MEMORY build. Linear memory is committed capacity, not C++ live heap or RSS.',rows};
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
