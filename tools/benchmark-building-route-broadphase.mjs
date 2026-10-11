import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {findBuildingRoute as candidate} from '../src/world/building-route-shortcut.js';

// Frozen original, including its corner cache and ordering. No campaign inputs
// or running simulation are modified by this isolated CPU experiment.
const baselineCommit='513b30bf';
const original=execFileSync('git',['show',`${baselineCommit}:src/world/building-route-shortcut.js`],{encoding:'utf8'});
const referenceSource=original.replace("'./footprints.js'",JSON.stringify(new URL('../src/world/footprints.js',import.meta.url).href));
assert.notEqual(referenceSource,original);
const {findBuildingRoute:baseline}=await import(`data:text/javascript;base64,${Buffer.from(referenceSource).toString('base64')}`);
const hash=s=>createHash('sha256').update(s).digest('hex');
let seed=712;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const obstacles=Array.from({length:300},(_,i)=>{
 const x=(random()-.5)*200,z=(random()-.5)*200,size=1+random()*4;
 return {id:`house-${i}`,kind:'house',footprint:[{x:x-size,z:z-size},{x:x+size,z:z-size},{x:x+size,z:z+size},{x:x-size,z:z+size}]};
});
const queries=Array.from({length:400},()=>{
 const start={x:(random()-.5)*100,z:(random()-.5)*100};
 const end={x:start.x+(random()-.5)*20,z:start.z+(random()-.5)*20};
 return {start,end,radius:.1+random(),maximumLength:10+random()*40};
});
let compared=0;
for(const query of queries)for(const mode of ['blocked','clear','mixed']){
 const evaluate=fn=>{
  const trace=[];
  const nav={obstacles,walkable:(...args)=>{trace.push(['walk',...args]);return mode==='clear'||mode==='mixed'&&Math.sin(args[0]+args[1])>0;},segmentClear:(...args)=>{trace.push(['segment',...args]);return mode==='clear'||Math.cos(args[0].x+args[1].z)>0;}};
  return {route:fn(nav,query.start,query.end,query.radius,null,query.maximumLength),trace};
 };
 assert.deepEqual(evaluate(candidate),evaluate(baseline));compared++;
}
const nav={obstacles,walkable:()=>false,segmentClear:()=>false};
const iterations=10000;
const batch=fn=>{const started=performance.now();for(let i=0;i<iterations;i++){const q=queries[i%queries.length];assert.equal(fn(nav,q.start,q.end,q.radius,null,q.maximumLength),null);}return performance.now()-started;};
// Both implementations warm their authored corner caches before AB/BA.
for(const fn of [baseline,candidate])for(let i=0;i<2000;i++){const q=queries[i%queries.length];fn(nav,q.start,q.end,q.radius,null,q.maximumLength);}
const runs=[];
for(let round=1;round<=3;round++)for(const [label,fn] of [['A',baseline],['B',candidate],['B',candidate],['A',baseline]])runs.push({round,label,milliseconds:batch(fn)});
const mean=label=>{const samples=runs.filter(r=>r.label===label);return samples.reduce((sum,r)=>sum+r.milliseconds,0)/samples.length;};
const report={scope:'isolated candidate generation CPU; synthetic obstacles, not end-to-end campaign or GPU',baselineCommit,baselineSha256:hash(original),candidateSha256:hash(readFileSync(new URL('../src/world/building-route-shortcut.js',import.meta.url))),seed:712,obstacles:obstacles.length,queries:queries.length,equivalentRouteAndCollisionTraces:compared,iterationsPerBatch:iterations,runs,baselineMeanMs:mean('A'),candidateMeanMs:mean('B'),reductionPercent:100*(1-mean('B')/mean('A')),concurrentCampaign:true};
const output=process.argv[2];if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report,null,2));
