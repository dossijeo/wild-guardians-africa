import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {createHierarchicalWasmNavigatorSync} from '../../src/world/hierarchical-wasm-adapter.js';
import {createLazySectorProbe} from '../../src/world/wild-engine/lazy-sectors-adapter.js';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: benchmark-lazy-wasm-sectors.mjs state.json.gz report.json');
const saved=JSON.parse(gunzipSync(readFileSync(input)).toString('utf8'));
const biome=BIOME_IDS[saved.biome];
const profile=JSON.parse(readFileSync(`public/content/biome-${biome}.json`,'utf8')).profile;
const hierarchy=new WebAssembly.Module(readFileSync('src/world/wild-engine/core.wasm'));
const lazy=readFileSync('src/world/wild-engine/lazy-sectors.wasm');
const crops=saved.plants.filter(p=>p.alive);
const actors=(saved.raid?.animals??[]).filter(a=>a.status!=='gone');
const points=[...actors,...crops];
if(!points.length)throw Error('Snapshot has no live navigation points');
const bounds={minX:Math.floor(Math.min(...points.map(p=>p.x))-20),maxX:Math.ceil(Math.max(...points.map(p=>p.x))+20),
  minZ:Math.floor(Math.min(...points.map(p=>p.z))-20),maxZ:Math.ceil(Math.max(...points.map(p=>p.z))+20)};
const now=()=>performance.now();
function native(){
  const nav=new Navigation(saved.seed,saved.biome,profile);nav.setState(structuredClone(saved));
  const metrics={walkable:0,segmentClear:0};
  for(const name of Object.keys(metrics)){
    const original=nav[name].bind(nav);
    nav[name]=(...args)=>{metrics[name]++;return original(...args);};
  }
  return {nav,metrics};
}
const rows=[];
for(const radius of [...new Set(actors.map(a=>a.radius))].slice(0,2)){
  const relevantActors=actors.filter(a=>a.radius===radius);
  if(!relevantActors.length)continue;
  for(const variant of ['dense','lazy','lazy','dense']){
    const {nav,metrics}=native(),start=now();
    let core;
    if(variant==='dense'){
      core=createHierarchicalWasmNavigatorSync(hierarchy,nav,{...bounds,radius,worker:false,sectorSize:12});
      core.initialize();
    }else{
      core=await createLazySectorProbe(lazy,nav,{radius,worker:false,sectorSize:12});
      // Materialize only sectors touched by current actors and living crops.
      // This measures preparation demand; routes across unknown sectors are
      // deliberately not inferred or counted as reachable/disconnected.
      for(const point of [...relevantActors,...crops])
        core.ensureSector(Math.floor(Math.round(point.x)/12),Math.floor(Math.round(point.z)/12));
    }
    rows.push({radius,variant,milliseconds:now()-start,...metrics,
      wasmMemoryBytes:core.wasm.memory.buffer.byteLength,
      sectors:variant==='dense'?core.metrics().sectorsBuilt:core.metrics().loaded});
  }
}
const report={input,biome:saved.biome,day:saved.day,bounds,actors:actors.length,crops:crops.length,
  scope:'Initial physical-raster preparation only; sparse sectors at actor/crop coordinates versus a full bounding rectangle. No route timings or campaign outcomes.',rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
