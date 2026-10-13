import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {createLazySectorProbe} from '../../src/world/hierarchical-wasm/lazy-sectors-adapter.js';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: benchmark-lazy-wasm-routes.mjs state.json.gz report.json');
const saved=JSON.parse(gunzipSync(readFileSync(input)).toString('utf8'));
const biome=BIOME_IDS[saved.biome],profile=JSON.parse(readFileSync(`public/content/biome-${biome}.json`,'utf8')).profile;
const nav=new Navigation(saved.seed,saved.biome,profile);nav.setState(structuredClone(saved));
const actors=(saved.raid?.animals??[]).filter(a=>a.status!=='gone');
const radius=actors[0]?.radius??1.1;
const selected=actors.filter(a=>a.radius===radius).slice(0,6),crops=saved.plants.filter(p=>p.alive);
if(!selected.length)throw Error('Snapshot has no active animals of the selected radius');
const nearest=p=>{
  const x=Math.round(p.x),z=Math.round(p.z),options=[];
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)if(nav.walkable(x+dx,z+dz,radius,null,false))
    options.push({x:x+dx,z:z+dz,distance:Math.hypot(x+dx-p.x,z+dz-p.z)});
  return options.sort((a,b)=>a.distance-b.distance)[0]??null;
};
const requests=[];
for(const actor of selected){
  const start=nearest(actor);if(!start)continue;
  for(const [dx,dz] of [[3,0],[-3,0],[0,3],[0,-3],[5,2]]){
    const end=nearest({x:actor.x+dx,z:actor.z+dz});
    if(end&&nav.segmentClear(start,end,radius,null,false))requests.push({start,end,kind:'local'});
  }
  const ordered=crops.slice().sort((a,b)=>Math.hypot(a.x-actor.x,a.z-actor.z)-Math.hypot(b.x-actor.x,b.z-actor.z));
  for(const crop of ordered.filter((_,i)=>i%Math.max(1,Math.floor(ordered.length/12))===0).slice(0,12)){
    const end=nearest(crop);
    if(end&&!(start.x===end.x&&start.z===end.z))requests.push({start,end,kind:'crop'});
  }
}
const bytes=readFileSync('src/world/hierarchical-wasm/lazy-sectors.wasm');
const core=await createLazySectorProbe(bytes,nav,{radius,worker:false,sectorSize:12});
const t0=performance.now();
for(const point of [...selected,...crops])core.ensureSector(Math.floor(Math.round(point.x)/12),Math.floor(Math.round(point.z)/12));
const preparationMs=performance.now()-t0;
function measure(label){
  const start=performance.now(),counts={found:0,blocked:0,unknown:0,invalid:0,foundLocal:0,foundCrop:0,blockedCrop:0,unknownCrop:0};
  for(const request of requests){
    const result=core.route(request.start,request.end);counts[result.status]++;
    if(request.kind==='crop')counts[`${result.status}Crop`]++;
    if(result.status==='found'){
      if(request.kind==='local')counts.foundLocal++;
      let previous=request.start;
      for(const point of result.points){if(!nav.segmentClear(previous,point,radius,null,false))counts.invalid++;previous=point;}
      if(previous.x!==request.end.x||previous.z!==request.end.z)counts.invalid++;
    }
  }
  return {label,milliseconds:performance.now()-start,counts,metrics:core.metrics()};
}
const passes=[measure('occupied sectors')];
const points=[...selected,...crops];
const minX=Math.floor(Math.min(...points.map(p=>p.x))-20),maxX=Math.ceil(Math.max(...points.map(p=>p.x))+20);
const minZ=Math.floor(Math.min(...points.map(p=>p.z))-20),maxZ=Math.ceil(Math.max(...points.map(p=>p.z))+20);
const more=performance.now();core.ensureRect(minX,minZ,maxX,maxZ);
const coverageMs=performance.now()-more;
passes.push(measure('full bounded coverage'));
const report={input,biome:saved.biome,day:saved.day,radius,requests:requests.length,preparationMs,coverageMs,passes};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(passes.some(p=>p.counts.invalid))process.exitCode=2;
