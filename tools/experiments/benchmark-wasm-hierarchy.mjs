import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {createHierarchicalNavigationAdapter} from '../../src/world/hierarchical-navigation-adapter.js';
import {createHierarchicalWasmNavigatorSync} from '../../src/world/hierarchical-wasm-adapter.js';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: benchmark-wasm-hierarchy.mjs state.json.gz report.json');
const saved=JSON.parse(gunzipSync(readFileSync(input)).toString('utf8'));
const biome=BIOME_IDS[saved.biome],profile=JSON.parse(readFileSync(`public/content/biome-${biome}.json`,'utf8')).profile;
const wasm=readFileSync('src/world/hierarchical-wasm/core.wasm');
const compilationStart=performance.now(),module=new WebAssembly.Module(wasm),moduleCompilationMs=performance.now()-compilationStart;
const active=(saved.raid?.animals??[]).filter(a=>a.status!=='gone');
const radius=active[0]?.radius??1.1,actors=active.filter(a=>a.radius===radius).slice(0,6);
const crops=saved.plants.filter(p=>p.alive);
const coordinates=[...actors,...crops],minX=Math.floor(Math.min(...coordinates.map(p=>p.x))-20),maxX=Math.ceil(Math.max(...coordinates.map(p=>p.x))+20);
const minZ=Math.floor(Math.min(...coordinates.map(p=>p.z))-20),maxZ=Math.ceil(Math.max(...coordinates.map(p=>p.z))+20);
const timed=async fn=>{const t=performance.now(),value=await fn();return {milliseconds:performance.now()-t,value};};
function requests(nav){
  const nearest=p=>{
    const x=Math.round(p.x),z=Math.round(p.z),options=[];
    for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)if(nav.walkable(x+dx,z+dz,radius,null,false))options.push({x:x+dx,z:z+dz,distance:Math.hypot(x+dx-p.x,z+dz-p.z)});
    return options.sort((a,b)=>a.distance-b.distance)[0]??null;
  };
  const out=[];
  for(const actor of actors){
    const start=nearest(actor);if(!start)continue;
    for(const [dx,dz] of [[3,0],[-3,0],[0,3],[0,-3],[5,2]]){
      const end=nearest({x:actor.x+dx,z:actor.z+dz});
      if(end&&nav.segmentClear(start,end,radius,null,false))out.push({start,end,kind:'local'});
    }
    const sorted=crops.slice().sort((a,b)=>Math.hypot(a.x-actor.x,a.z-actor.z)-Math.hypot(b.x-actor.x,b.z-actor.z));
    for(const crop of sorted.filter((_,i)=>i%Math.max(1,Math.floor(sorted.length/12))===0).slice(0,12)){
      const end=nearest(crop);if(end&&!(start.x===end.x&&start.z===end.z))out.push({start,end,cropId:crop.id,kind:'crop'});
    }
  }
  return out;
}
const rows=[];
for(const variant of ['javascript','wasm-hier','wasm-flat','wasm-tree','wasm-tree','wasm-flat','wasm-hier','javascript']){
  const state=structuredClone(saved),nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
  const queries=requests(nav),before=process.memoryUsage().rss;
  let construction,initialization,impl;
  if(variant!=='javascript'){
    construction=await timed(()=>createHierarchicalWasmNavigatorSync(module,nav,{minX,minZ,maxX,maxZ,radius,worker:false,sectorSize:12,diagonal:variant!=='wasm-hier'}));
    impl=construction.value;initialization=await timed(()=>impl.initialize());
  }else{
    construction=await timed(()=>createHierarchicalNavigationAdapter(nav));impl=construction.value;
    initialization={milliseconds:0};
  }
  const grouping=await timed(()=>{
    const keys=new Set();
    for(const crop of crops){
      const region=variant==='javascript'?impl.region(crop,radius,null,false):impl.region(crop);
      keys.add(region?.key??`unknown:${crop.id}`);
    }
    return {crops:crops.length,groups:keys.size};
  });
  const passes=[];
  for(const phase of ['cold','warm']){
    const measured=await timed(()=>queries.map(({start,end,kind})=>{
      const route=variant==='wasm-hier'?impl.route(start,end):variant==='wasm-flat'?impl.flatRoute(start,end):variant==='wasm-tree'?impl.treeRoute(start,end):impl.path(start,end,radius,null,false,32);
      let valid=!!route,previous=start;
      for(const point of route??[]){if(!nav.segmentClear(previous,point,radius,null,false))valid=false;previous=point;}
      return {kind,found:!!route,valid};
    }));
    passes.push({phase,milliseconds:measured.milliseconds,found:measured.value.filter(r=>r.found).length,
      foundLocal:measured.value.filter(r=>r.found&&r.kind==='local').length,foundCrop:measured.value.filter(r=>r.found&&r.kind==='crop').length,
      invalid:measured.value.filter(r=>r.found&&!r.valid).length});
  }
  const facade=await timed(()=>queries.map(({start,end,kind})=>{
    const path=variant==='javascript'?impl.path(start,end,radius,null,false,32):
      impl.path(start,end,{flat:variant==='wasm-flat',tree:variant==='wasm-tree'});
    let valid=!!path,previous=start;
    for(const point of path??[]){if(!point||!nav.segmentClear(previous,point,radius,null,false))valid=false;previous=point;}
    return {kind,found:!!path,valid};
  }));
  rows.push({variant,queries:queries.length,constructionMs:construction.milliseconds,initializationMs:initialization.milliseconds,
    groupingMs:grouping.milliseconds,grouping:grouping.value,
    rssDeltaBytes:process.memoryUsage().rss-before,wasmMemoryBytes:impl.wasm?.memory.buffer.byteLength??null,
    metrics:variant!=='javascript'?impl.metrics():impl.planner.metrics,passes,
    facade:{milliseconds:facade.milliseconds,found:facade.value.filter(r=>r.found).length,
      foundCrop:facade.value.filter(r=>r.found&&r.kind==='crop').length,
      invalid:facade.value.filter(r=>r.found&&!r.valid).length}});
}
const report={input,biome:saved.biome,day:saved.day,radius,bounds:{minX,minZ,maxX,maxZ},wasmBytes:wasm.byteLength,moduleCompilationMs,rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({biome:report.biome,day:report.day,wasmBytes:report.wasmBytes,moduleCompilationMs,rows:rows.map(({variant,queries,constructionMs,initializationMs,groupingMs,grouping,passes,facade,metrics})=>({variant,queries,constructionMs,initializationMs,groupingMs,grouping,passes,facade,metrics}))}));
if(rows.some(r=>r.passes.some(p=>p.invalid)||r.facade.invalid))process.exitCode=2;
