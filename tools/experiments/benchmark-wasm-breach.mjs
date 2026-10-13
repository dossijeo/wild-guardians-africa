import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {fixture} from '../probe-raid-reservation-saturation.mjs';
import {createHierarchicalNavigationAdapter} from '../../src/world/hierarchical-navigation-adapter.js';
import {createHierarchicalWasmNavigator} from '../../src/world/hierarchical-wasm-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/closed-breach-wasm.json';
const bytes=readFileSync('src/world/hierarchical-wasm/core.wasm'),radius=1.1,bounds={minX:-12,minZ:-18,maxX:42,maxZ:38,radius,worker:false,sectorSize:12};
const measured=fn=>{const t=performance.now(),value=fn();return {milliseconds:performance.now()-t,value};};
const measuredAsync=async fn=>{const t=performance.now(),value=await fn();return {milliseconds:performance.now()-t,value};};
async function one(variant){
  const {s,nav}=fixture('closed-walls'),before=process.memoryUsage().rss;
  const compiled=variant!=='javascript';
  const created=await measuredAsync(()=>compiled?createHierarchicalWasmNavigator(bytes,nav,{...bounds,diagonal:variant==='wasm-flat'}):createHierarchicalNavigationAdapter(nav));
  const engine=created.value,initialized=measured(()=>engine.initialize?.()??null),rows=[];
  const starts=[12,14,16,18].map(x=>({x,z:29}));
  const targets=[8,10,12,14,16,18].map(x=>({x,z:7}));
  const requests=starts.flatMap(start=>targets.map(end=>({start,end})));
  function query(phase,facade=false){
    const result=measured(()=>requests.map(({start,end})=>{
      const path=variant==='wasm-hier'?(facade?engine.path(start,end):engine.route(start,end)):
        variant==='wasm-flat'?(facade?engine.path(start,end,{flat:true}):engine.flatRoute(start,end)):
          engine.path(start,end,radius,null,false,24);
      let valid=!!path,previous=start;
      for(const point of path??[]){if(!nav.segmentClear(previous,point,radius,null,false))valid=false;previous=point;}
      return {found:!!path,valid};
    }));
    rows.push({phase,milliseconds:result.milliseconds,found:result.value.filter(r=>r.found).length,invalid:result.value.filter(r=>r.found&&!r.valid).length});
  }
  query('closed-cold');query('closed-warm');query('closed-facade',true);
  for(const id of ['wall-2-4','wall-2-5']){const wall=s.structures.find(t=>t.id===id);wall.status='ruined';wall.hp=0;}
  nav.setState(s);
  const updated=measured(()=>compiled?engine.syncRect(11,16,19,21):engine.invalidateRect(11,16,19,21));
  query('breach-cold');query('breach-warm');query('breach-facade',true);
  return {variant,wasmBytes:compiled?bytes.length:null,setupMilliseconds:created.milliseconds,initializeMilliseconds:initialized.milliseconds,updateMilliseconds:updated.milliseconds,
    rssDeltaBytes:process.memoryUsage().rss-before,wasmMemoryBytes:engine.wasm?.memory.buffer.byteLength??null,rows,
    metrics:compiled?engine.metrics():engine.planner.metrics};
}
const rows=[];for(const variant of ['javascript','wasm-hier','wasm-flat','wasm-flat','wasm-hier','javascript'])rows.push(await one(variant));
const report={scope:'Native closed 100-crop perimeter, then two destroyed wall modules. One animal radius, 24 fixed outside-to-crop queries per phase. Includes construction, raster synchronization and real physical segment verification.',rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(({variant,setupMilliseconds,initializeMilliseconds,updateMilliseconds,rows})=>({variant,setupMilliseconds,initializeMilliseconds,updateMilliseconds,rows}))));
if(rows.some(r=>r.rows.some(p=>p.invalid)))process.exitCode=2;
