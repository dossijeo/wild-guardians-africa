import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/wild-engine/spatial-savanna-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-profile-switch-baseline.json';
const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const core=createSpatialSavannaPrototype(module);
core.generate(712,0,0);
for(const [x,z] of [[1,0],[0,1],[1,1]])core.addChunk(x,z);
const rows=[];
for(let cycle=0;cycle<20;cycle++)for(const profile of [{name:'worker',radius:.28,worker:true},{name:'animal',radius:1.1,worker:false}]){
  const before=performance.now(),sectors=core.buildNavigation(profile.radius,profile.worker);
  const durationMs=performance.now()-before;
  if(sectors!==64)throw Error(`Expected 64 sectors, got ${sectors}`);
  let route=null;
  for(let z=-23;z<24;z++)if(core.edge(23,z,24,z)){
    route=core.route({x:23,z},{x:24,z});if(route.status==='found')break;
  }
  if(route?.status!=='found')throw Error(`Profile ${profile.name} could not cross a known seam`);
  rows.push({cycle,profile:profile.name,durationMs,memoryBytes:core.metrics().memoryBytes});
}
const summary={};
for(const profile of ['worker','animal']){
  const samples=rows.filter(row=>row.profile===profile).map(row=>row.durationMs).sort((a,b)=>a-b);
  const warm=rows.filter(row=>row.profile===profile&&row.cycle>0).map(row=>row.durationMs).sort((a,b)=>a-b);
  summary[profile]={switches:samples.length,medianMs:samples[Math.floor(samples.length/2)],
    p95Ms:samples[Math.floor(samples.length*.95)],totalMs:samples.reduce((a,b)=>a+b,0),
    coldBuildMs:rows.find(row=>row.profile===profile&&row.cycle===0).durationMs,
    warmMedianMs:warm[Math.floor(warm.length/2)],warmTotalMs:warm.reduce((a,b)=>a+b,0)};
}
const report={scope:'QA-only four resident Sabana chunks, alternating worker and animal radii 20 times; first sample for each profile includes its cold graph build.',
  summary,maxMemoryBytes:Math.max(...rows.map(row=>row.memoryBytes)),rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summary,maxMemoryBytes:report.maxMemoryBytes}));
