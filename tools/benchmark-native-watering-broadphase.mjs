import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {Navigation} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {wateringRoute as candidate} from '../src/world/work-points.js';

const baselineCommit='513b30bf',sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const dataModule=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const original=execFileSync('git',['show',`${baselineCommit}:src/world/building-route-shortcut.js`],{encoding:'utf8'});
const baselineUrl=dataModule(original.replace("'./footprints.js'",JSON.stringify(new URL('../src/world/footprints.js',import.meta.url).href)));
const workUrl=new URL('../src/world/work-points.js',import.meta.url),work=readFileSync(workUrl,'utf8');
const reference=work.replace(/from '([^']+)'/g,(_match,specifier)=>`from ${JSON.stringify(specifier==='./building-route-shortcut.js'?baselineUrl:new URL(specifier,workUrl).href)}`);
const {wateringRoute:baseline}=await import(dataModule(reference));
const profile=JSON.parse(readFileSync(new URL('../public/content/biome-canyons.json',import.meta.url))).profile;
const cases=[];
for(const [suffix,plantId] of [['1','plant-38'],['10','plant-24']]){
 const bytes=readFileSync(new URL(`../tests/fixtures/watering-gran-canon-saheliana-detour-${suffix}.json.gz`,import.meta.url));
 const snapshot=gunzipSync(bytes).toString();
 const setup=()=>{const state=deserialize(snapshot),nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);return {state,nav,worker:state.workers.find(w=>w.id==='worker-14'),plant:state.plants.find(p=>p.id===plantId)};};
 const trace=fn=>{const c=setup(),before=serialize(c.state),calls=[];for(const method of ['walkable','segmentClear','path']){const native=c.nav[method];c.nav[method]=function(...args){calls.push([method,structuredClone(args)]);return native.apply(this,args);};}const route=fn(c.worker,c.plant,c.nav);assert.equal(serialize(c.state),before);return {route,calls};};
 assert.deepEqual(trace(candidate),trace(baseline));
 const a=setup(),b=setup();
 for(let i=0;i<50;i++){baseline(a.worker,a.plant,a.nav);candidate(b.worker,b.plant,b.nav);}
 const iterations=500,runs=[];
 const batch=(fn,c)=>{const started=performance.now();for(let i=0;i<iterations;i++)fn(c.worker,c.plant,c.nav);return performance.now()-started;};
 for(let round=1;round<=3;round++)for(const [label,fn,c] of [['A',baseline,a],['B',candidate,b],['B',candidate,b],['A',baseline,a]])runs.push({round,label,milliseconds:batch(fn,c)});
 const mean=label=>{const samples=runs.filter(r=>r.label===label);return samples.reduce((sum,r)=>sum+r.milliseconds,0)/samples.length;};
 cases.push({fixture:suffix,fixtureSha256:sha(bytes),buildingObstacles:a.nav.obstacles.filter(o=>['house','center'].includes(o.kind)&&o.footprint?.length).length,exactRouteAndQueryTrace:true,iterationsPerBatch:iterations,runs,baselineMeanMs:mean('A'),candidateMeanMs:mean('B'),reductionPercent:100*(1-mean('B')/mean('A'))});
}
const report={scope:'native watering queries on two recorded Canyon fixtures, warm navigation caches; not total campaign duration or GPU',baselineCommit,baselineSha256:sha(original),candidateSha256:sha(readFileSync(new URL('../src/world/building-route-shortcut.js',import.meta.url))),concurrentCampaign:true,cases};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report,null,2));
