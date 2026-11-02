import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {Navigation} from '../../src/world/navigation.js';
import {animalExitConnector} from '../../src/simulation/animal-exit-connectors.js';

const fixtures=['desierto-saheliana-failure-37868567780','desierto-saheliana-failure-37870712064'];
const pack=JSON.parse(readFileSync('public/content/biome-desert.json','utf8'));
const rows=[];
for(const fixture of fixtures){
 const data=gunzipSync(readFileSync(`docs/qa/campaign-ci/${fixture}/desierto-saheliana-failure-state.json.gz`)).toString();
 for(let run=0;run<4;run++){
  const state=deserialize(data),nav=new Navigation(state.seed,state.biome,pack.profile);nav.setState(state);
  const actor=state.raid.animals.find(a=>a.status==='retreating'&&a.exitConnectorSearch)??state.raid.animals[1];
  if(!actor||actor.status!=='retreating')throw Error(`No recorded retreat in ${fixture}`);
  const exit={...actor.exit};
  const samples=[];let path=null,checks=0;const walk=nav.walkable,segment=nav.segmentClear;
  nav.walkable=function(...a){checks++;return walk.apply(this,a);};nav.segmentClear=function(...a){checks++;return segment.apply(this,a);};
  const start=performance.now();let count=0;
  while(!path&&!actor.exitConnectorSearch?.exhausted&&count<10000){const t=performance.now();path=animalExitConnector(actor,exit,nav);samples.push(performance.now()-t);count++;}
  const total=performance.now()-start;if(!path&&!actor.exitConnectorSearch?.exhausted)throw Error('Search did not terminate');
  const searchChecks=checks;
  if(path){let from=actor;for(const point of path){if(!nav.walkable(point.x,point.z,actor.radius,null,false)||!nav.segmentClear(from,point,actor.radius,null,false))throw Error('Path is not clear');from=point;}}
  rows.push({fixture,run,calls:count,totalMs:total,maxCallMs:Math.max(...samples),checks:searchChecks,path,exhausted:!!actor.exitConnectorSearch?.exhausted});
 }
}
for(const fixture of fixtures){const runs=rows.filter(row=>row.fixture===fixture),first=JSON.stringify([runs[0].path,runs[0].calls,runs[0].checks]);if(runs.some(row=>JSON.stringify([row.path,row.calls,row.checks])!==first))throw Error('Non-deterministic frozen-state result');}
writeFileSync('docs/lighting/tree-near-retexture/performance/retreat-exit-slice-fixed-state.json',JSON.stringify({scope:'Fixed recorded state; sequential draining existing per-call slices, no ticks or dynamic changes; not an unsliced algorithm, worker, frame test or gameplay equivalence.',rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(({fixture,run,calls,totalMs,maxCallMs,checks,path,exhausted})=>({fixture,run,calls,totalMs,maxCallMs,checks,pathLength:path?.length,exhausted}))));
