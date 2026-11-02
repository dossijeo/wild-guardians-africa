import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';

const binaries=['.cache/profile-compat-instrumented-base.wasm','.cache/profile-compat-instrumented-candidate.wasm'],modules=binaries.map(p=>new WebAssembly.Module(readFileSync(p)));
const fixture=gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString();
const names=['populate','raster','commit','borders','restore'],rows=[];
for(const [run,candidate] of [false,true,true,false].entries()){
 const module=modules[+candidate];
 const state=JSON.parse(fixture);state.mangroveNetwork=true;state.mangroveSettlementVersion=2;
 const v=state.villages[0],cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48),loaded=new Map();let wasm;
 wasm=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{clock_time_get(_id,_precision,pointer){new DataView(wasm.memory.buffer).setBigUint64(pointer,BigInt(Math.round(performance.now()*1e6)),true);return 0;}}}).exports;
 wasm._initialize?.();const core=createSpatialWorld(null,{exports:wasm});core.generate(state.seed,cx,cz,state.biome,state);
 const session=createSpatialGameSession(module,state,{core,loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++){if(core.selectChunk(x,z)<0)core.addChunk(x,z);loaded.set(`${x},${z}`,core.chunkPayload());}
  if(loaded.size!==25||!state.mangroveNetwork)throw Error('Expected 25 chunks in the island network');
  for(const species of ['hyena','buffalo','lion','rhino']){
   wasm.spatial_profile_reset();const start=performance.now(),result=session.actorRegions(v,{worker:false,species}),elapsed=performance.now()-start;
   const phases=Object.fromEntries(names.map((name,i)=>[name,wasm.spatial_profile_ms(14+i)]));
   if(!result.ids.length||Object.values(phases).some(value=>!Number.isFinite(value)||value<0)||phases.raster<=0||phases.commit<=0)throw Error('Invalid profile measurement');
   rows.push({run,candidate,species,elapsed,result,phases});
  }
 }finally{session.dispose();}
}
for(const species of ['hyena','buffalo','lion','rhino']){const group=rows.filter(row=>row.species===species);if(group.some(row=>JSON.stringify(row.result)!==JSON.stringify(group[0].result)))throw Error('Nondeterministic region result');}
const report={scope:'Two instrumented diagnostic WASMs in ABBA order, synthetic 5x5 chunk residency based on a saved mangrove state reconfigured to the Wild Engine island network and settlement version 2. Cold profile region query; phase timers exclude some setup and overlap existing inner counters. Not a faithful replay of the original save; no rendering, frame times, GPU or integrated performance claim.',mangroveNetwork:true,mangroveSettlementVersion:2,rows};
writeFileSync('docs/lighting/tree-near-retexture/performance/mobility-profile-compat-phase-abba.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
