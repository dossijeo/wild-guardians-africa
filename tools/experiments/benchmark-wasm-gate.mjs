import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {fixture} from '../probe-raid-reservation-saturation.mjs';
import {createHierarchicalWasmNavigator} from '../../src/world/hierarchical-wasm-adapter.js';
import {createLazySectorProbe} from '../../src/world/wild-engine/lazy-sectors-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/worker-gate-wasm.json';
const bytes=readFileSync('src/world/wild-engine/core.wasm');
const lazyBytes=readFileSync('src/world/wild-engine/lazy-sectors.wasm');
const bounds={minX:-12,minZ:-18,maxX:42,maxZ:38,radius:.28,worker:true,sectorSize:12};
const requests=[12,14,16,18].flatMap(x=>[8,10,12,14,16,18].map(y=>({start:{x,z:29},end:{x:y,z:7}})));
const timed=async fn=>{const start=performance.now(),value=await fn();return {milliseconds:performance.now()-start,value};};
async function run(variant){
  const {s,nav}=fixture('closed-walls');
  const gate=s.structures.find(o=>o.id==='wall-2-5');gate.gate=true;gate.gateOpen=true;nav.setState(s);
  const setup=await timed(()=>variant==='lazy'?
    createLazySectorProbe(lazyBytes,nav,{sectorSize:12,radius:.28,worker:true}):
    createHierarchicalWasmNavigator(bytes,nav,{...bounds,diagonal:variant==='flat'}));
  const core=setup.value,initialization=await timed(()=>variant==='lazy'?core.ensureRect(0,0,23,35):core.initialize());
  const passes=[];
  for(const phase of ['cold','warm']){
    const result=await timed(()=>requests.map(({start,end})=>{
      const route=variant==='hierarchical'?core.route(start,end):variant==='flat'?core.flatRoute(start,end):core.route(start,end).points;
      let valid=!!route,previous=start;
      for(const point of route??[]){if(!point||!nav.segmentClear(previous,point,.28,null,true))valid=false;previous=point;}
      return {found:!!route,valid};
    }));
    passes.push({phase,milliseconds:result.milliseconds,found:result.value.filter(r=>r.found).length,
      invalid:result.value.filter(r=>r.found&&!r.valid).length});
  }
  return {variant,setupMs:setup.milliseconds,initializationMs:initialization.milliseconds,passes,
    wasmMemoryBytes:core.wasm.memory.buffer.byteLength,sectors:variant==='lazy'?core.metrics().loaded:core.metrics().sectorsBuilt};
}
const rows=[];for(const variant of ['hierarchical','flat','lazy','lazy','flat','hierarchical'])rows.push(await run(variant));
const report={scope:'24 worker routes through one native automatic gate; physical collision validation, palindromic variant order.',
  wasmBytes:{bounded:bytes.length,lazy:lazyBytes.length},rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(rows.some(r=>r.passes.some(p=>p.invalid)))process.exitCode=2;
