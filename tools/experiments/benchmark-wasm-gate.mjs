import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {fixture} from '../probe-raid-reservation-saturation.mjs';
import {createHierarchicalWasmNavigator} from '../../src/world/hierarchical-wasm-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/worker-gate-wasm.json';
const bytes=readFileSync('src/world/hierarchical-wasm/core.wasm');
const bounds={minX:-12,minZ:-18,maxX:42,maxZ:38,radius:.28,worker:true,sectorSize:12};
const requests=[12,14,16,18].flatMap(x=>[8,10,12,14,16,18].map(y=>({start:{x,z:29},end:{x:y,z:7}})));
const timed=async fn=>{const start=performance.now(),value=await fn();return {milliseconds:performance.now()-start,value};};
async function run(variant){
  const {s,nav}=fixture('closed-walls');
  const gate=s.structures.find(o=>o.id==='wall-2-5');gate.gate=true;gate.gateOpen=true;nav.setState(s);
  const setup=await timed(()=>createHierarchicalWasmNavigator(bytes,nav,{...bounds,diagonal:variant==='flat'}));
  const core=setup.value,initialization=await timed(()=>core.initialize());
  const passes=[];
  for(const phase of ['cold','warm']){
    const result=await timed(()=>requests.map(({start,end})=>{
      const route=variant==='hierarchical'?core.route(start,end):core.flatRoute(start,end);
      let valid=!!route,previous=start;
      for(const point of route??[]){if(!point||!nav.segmentClear(previous,point,.28,null,true))valid=false;previous=point;}
      return {found:!!route,valid};
    }));
    passes.push({phase,milliseconds:result.milliseconds,found:result.value.filter(r=>r.found).length,
      invalid:result.value.filter(r=>r.found&&!r.valid).length});
  }
  return {variant,setupMs:setup.milliseconds,initializationMs:initialization.milliseconds,passes,wasmMemoryBytes:core.wasm.memory.buffer.byteLength};
}
const rows=[];for(const variant of ['hierarchical','flat','flat','hierarchical'])rows.push(await run(variant));
const report={scope:'24 worker routes through one native automatic gate; physical collision validation, ABBA order.',wasmBytes:bytes.length,rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(rows.some(r=>r.passes.some(p=>p.invalid)))process.exitCode=2;
