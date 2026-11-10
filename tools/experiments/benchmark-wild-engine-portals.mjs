import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {BIOME_IDS,SPATIAL_BIOME_CODES} from '../../src/world/biome-ids.js';

const wasmPath=process.argv[2]??'src/world/hierarchical-wasm/spatial-savanna.wasm';
const output=process.argv[3];
const bytes=readFileSync(wasmPath);
const wasm=new WebAssembly.Instance(await WebAssembly.compile(bytes),
  {env:{emscripten_notify_memory_growth(){}}}).exports;
wasm.spatial_generate_biome(712,SPATIAL_BIOME_CODES[BIOME_IDS.sabana],0,0);
for(let z=-3;z<=3;z++)for(let x=-3;x<=3;x++)if(x||z)wasm.spatial_add_chunk(x,z);
wasm.spatial_build_nav_profile(1,.28,1);
const sites=[];
for(let z=-136;z<=136;z+=2)for(let x=-136;x<=136;x+=2)
  if(wasm.spatial_walkable(x,z)&&wasm.spatial_walkable(x+1,z))sites.push([x,z,x+1,z]);
if(sites.length<100)throw Error(`Only ${sites.length} portal sites`);
const measurements=[];
const counts=[0,1,4,16,64];
for(let pass=0;pass<5;pass++){
  const order=pass%2?counts.slice().reverse():counts;
  for(const count of order){
    wasm.lazy_clear_portals();
    for(let i=0;i<count;i++){
      const site=sites[(i*107)%sites.length];
      wasm.lazy_add_portal(...site);
    }
    const began=performance.now();
    const committed=wasm.lazy_commit_portals();
    measurements.push({pass,count,committed,milliseconds:performance.now()-began});
  }
}
const snapshots=[
  'docs/qa/hierarchical-navigation/spatial-day13-hot-capture-capture-state.json',
  'docs/qa/hierarchical-navigation/spatial-virtual-sabana-30-stable-obstacles-state.json'
].map(path=>{
  const state=JSON.parse(readFileSync(path,'utf8'));
  return {path,day:state.day,walls:state.structures.filter(item=>item.kind==='wall').length,
    intactGates:state.structures.filter(item=>item.gate&&item.status!=='ruined').length};
});
const report={source:{commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  wasmSha256:createHash('sha256').update(bytes).digest('hex'),
  runnerSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex')},
  biome:'sabana',seed:712,chunks:49,portalSites:sites.length,snapshots,measurements,
  note:'Synthetic portal counts; commit time includes every resident sector edge rebuild, not just the portal loop.'};
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({snapshots,measurements}));
