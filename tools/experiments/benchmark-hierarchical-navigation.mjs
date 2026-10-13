import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {createHierarchicalNavigationAdapter} from '../../src/world/hierarchical-navigation-adapter.js';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node benchmark-hierarchical-navigation.mjs snapshot.json.gz report.json');
const raw=gunzipSync(readFileSync(input)).toString('utf8'),saved=JSON.parse(raw);
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[saved.biome]}.json`,'utf8')).profile;
const requests=[];
for(const actor of (saved.raid?.animals??[]).filter(a=>a.status!=='gone').slice(0,12)){
  const crops=saved.plants.filter(p=>p.alive).sort((a,b)=>Math.hypot(a.x-actor.x,a.z-actor.z)-Math.hypot(b.x-actor.x,b.z-actor.z));
  if(!crops.length)continue;
  const crop=crops[0],angle=Math.atan2(actor.x-crop.x,actor.z-crop.z),reach=.6+actor.radius;
  requests.push({kind:'animal',start:{x:actor.x,z:actor.z},end:{x:crop.x+Math.sin(angle)*reach,z:crop.z+Math.cos(angle)*reach},radius:actor.radius,worker:false});
}
for(const actor of (saved.workers??[]).slice(0,3)){
  const crop=saved.plants.find(p=>p.alive);if(!crop)break;
  requests.push({kind:'worker',start:{x:actor.x,z:actor.z},end:{x:crop.x+1,z:crop.z},radius:actor.radius??.28,worker:true});
}
// Replay the same query set twice against each navigator. The first pass pays
// for sector construction; the second measures reuse without pretending that
// the two implementations select the same targets in a live campaign.
const rows=[];
for(const candidate of [false,true,true,false]){
  // Later experimental snapshots carry a raid candidate version absent from
  // this main-based branch. Geometry-only replay reads the original JSON and
  // never simulates, mutates, or claims save-format compatibility.
  const state=structuredClone(saved),nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
  const adapter=candidate?createHierarchicalNavigationAdapter(nav):null;
  const memory=process.memoryUsage().rss,passes=[];
  for(const phase of ['cold','warm']){
    const began=performance.now(),routes=[];
    for(const request of requests){
      const {start,end,radius,worker}=request;
      const path=candidate?adapter.path(start,end,radius,null,worker,32):nav.path(start,end,radius,null,worker,32);
      let valid=!!path,previous=start;
      for(const point of path??[]){if(!nav.segmentClear(previous,point,radius,null,worker))valid=false;previous=point;}
      routes.push({kind:request.kind,found:!!path,valid,path});
    }
    passes.push({phase,milliseconds:performance.now()-began,
      found:routes.filter(r=>r.found).length,invalid:routes.filter(r=>r.found&&!r.valid).length,
      routeHash:createHash('sha256').update(JSON.stringify(routes)).digest('hex')});
  }
  rows.push({variant:candidate?'hierarchical':'native',passes,rssDeltaBytes:process.memoryUsage().rss-memory,metrics:adapter?.planner.metrics??null});
}
const report={input,day:saved.day,time:saved.time,requests:requests.length,rows,
  candidateDeterministic:rows[1].passes.every((pass,i)=>pass.routeHash===rows[2].passes[i].routeHash)};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({input,requests:requests.length,rows:rows.map(({variant,passes,metrics})=>({variant,passes:passes.map(({phase,milliseconds,found,invalid})=>({phase,milliseconds,found,invalid})),metrics})),candidateDeterministic:report.candidateDeterministic}));
if(!report.candidateDeterministic||rows.some(r=>r.passes.some(p=>p.invalid)))process.exitCode=2;
