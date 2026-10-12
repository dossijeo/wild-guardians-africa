import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {wateringRoute} from '../src/world/work-points.js';
import {cachedWateringRoute} from '../src/world/watering-route-cache.js';
import {wateringRoute as reference} from '../tests/fixtures/watering-route-v1-reference.mjs';
const [out,roundsText='32',...extra]=process.argv.slice(2),rounds=Number(roundsText);
assert(out&&!extra.length&&!existsSync(out),'Fresh output path required');assert(Number.isSafeInteger(rounds)&&rounds>=8&&rounds<=256);
assert.equal(typeof global.gc,'function','Run with node --expose-gc');
const hash=x=>createHash('sha256').update(x).digest('hex');
const profile=JSON.parse(readFileSync(new URL('../public/content/biome-canyons.json',import.meta.url))).profile;
function cases(){
 const rows=[];
 for(const suffix of ['1','10'])for(const enclosed of [false,true]){
  const s=deserialize(gunzipSync(readFileSync(new URL(`../tests/fixtures/watering-gran-canon-saheliana-detour-${suffix}.json.gz`,import.meta.url))).toString());
  const worker=s.workers.find(w=>w.id==='worker-14'),plant=s.plants.find(p=>p.id===(suffix==='1'?'plant-38':'plant-24'));
  if(enclosed)s.villages[0].buildings.push({key:'probe-enclosure',kind:'Edificio',x:worker.x,z:worker.z,radius:2});
  const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
  const counts={walkable:0,segmentClear:0,path:0};
  for(const name of Object.keys(counts)){const original=nav[name];nav[name]=function(...args){counts[name]++;return original.apply(this,args);};}
  rows.push({label:`canyon-${suffix}-${enclosed?'enclosed':'original'}`,s,worker,plant,nav,counts,before:hash(serialize(s))});
 }
 return rows;
}
const rows=[];
for(const variant of ['A','B','B','A']){
 const preparedAt=performance.now(),batch=cases(),prepareMilliseconds=performance.now()-preparedAt,query=variant==='A'?reference:wateringRoute;
 const coldAt=performance.now(),answers=batch.map(c=>query(c.worker,c.plant,c.nav)),coldMilliseconds=performance.now()-coldAt;
 const answerSha256=hash(JSON.stringify(answers));if(rows.length)assert.equal(answerSha256,rows[0].answerSha256);
 for(const c of batch)for(const name of Object.keys(c.counts))c.counts[name]=0;
 global.gc();const heapBefore=process.memoryUsage().heapUsed,times=[];const start=performance.now();
 for(let round=0;round<rounds;round++)for(const [index,c] of batch.entries()){
  const at=performance.now(),answer=query(c.worker,c.plant,c.nav);times.push(performance.now()-at);assert.deepEqual(answer,answers[index]);
 }
 const queryMilliseconds=performance.now()-start;global.gc();const heapAfter=process.memoryUsage().heapUsed;
 for(const c of batch)assert.equal(hash(serialize(c.s)),c.before,'Queries cannot mutate the world');
 const sorted=[...times].sort((a,b)=>a-b);
 rows.push({variant,rounds,queries:times.length,prepareMilliseconds,coldMilliseconds,queryMilliseconds,p95Milliseconds:sorted[Math.floor((sorted.length-1)*.95)],maxMilliseconds:sorted.at(-1),heapBefore,heapAfter,retainedHeapDelta:heapAfter-heapBefore,answerSha256,statesUnchanged:true,cases:batch.map((c,i)=>({label:c.label,reachable:answers[i]!==null,nativeCalls:c.counts}))});
}
function storage(kind){
 global.gc();const before=process.memoryUsage().heapUsed;let nav={version:1,state:{},field:{},obstacles:[]};const worker={x:0,z:4},plant={x:0,z:0,species:'mijo'};
 const compute=kind==='null'?()=>null:()=>({destination:{x:0,z:0,id:'point'},path:[{x:1,z:1},{x:0,z:0}]});
 for(let i=0;i<8192;i++)cachedWateringRoute(worker,{...plant,id:'memory-'+i},nav,compute);
 global.gc();const filled=process.memoryUsage().heapUsed;
 // Keep the key alive through the filled measurement, then drop the world.
 assert.equal(nav.version,1);nav=null;global.gc();const released=process.memoryUsage().heapUsed;
 return {kind,entriesRequested:8192,before,filled,released,filledDelta:filled-before,releasedDelta:released-before,scope:'Synthetic cache-storage/GC probe; not peak application RAM or VRAM.'};
}
const result={observedAt:new Date().toISOString(),gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,scope:'AB/BA CPU microbenchmark: exact repeated queries on two recorded Canyon scenes and two explicitly synthetic enclosing solids. Not a dense farm, moving-crew replay, render/GPU benchmark or complete campaign speedup.',sourceSha256:Object.fromEntries(['src/world/work-points.js','src/world/watering-route-cache.js','tests/fixtures/watering-route-v1-reference.mjs'].map(p=>[p,hash(readFileSync(new URL('../'+p,import.meta.url)))])),rows,memory:[storage('null'),storage('positive')]};
writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({rows:rows.map(({variant,queryMilliseconds,coldMilliseconds,p95Milliseconds,answerSha256,cases})=>({variant,queryMilliseconds,coldMilliseconds,p95Milliseconds,answerSha256,cases})),memory:result.memory},null,2));
