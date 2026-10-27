// CPU diagnosis of one archived route, not a general FPS/performance gate.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
const [snapshot,output,...extra]=process.argv.slice(2);assert(snapshot&&output&&!extra.length&&!existsSync(output),'Use SNAPSHOT.json.gz FRESH_REPORT.json');
const bytes=readFileSync(snapshot),runs=[];let referenceRoute;
for(const yieldEvery of [8,4,4,8]){
 const s=deserialize(gunzipSync(bytes).toString()),w=s.workers.find(p=>p.id==='worker-52429');assert(w,'Archived diagnostic actor missing');
 const end=s.villages.find(v=>v.id===w.villageId).entry,grid={x:103,z:14};
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const prepareAt=performance.now();assert.equal(nav.workerPath(w,end,.28,null),null);const preparationMs=performance.now()-prepareAt;
 const search=nav.findPathSteps(grid,end,.28,null,true,16,{yieldEvery}),times=[];let step;
 do{const at=performance.now();step=search.next();times.push(performance.now()-at);}while(!step.done);
 assert(step.value);referenceRoute??=step.value;assert.deepEqual(step.value,referenceRoute,'Yield frequency must not select another route');
 let previous=grid;for(const p of step.value){assert(nav.segmentClear(previous,p,.28,null,true));previous=p;}
 const ordered=[...times].sort((a,b)=>a-b);
 runs.push({yieldEvery,preparationMs,calls:times.length,totalMs:times.reduce((a,b)=>a+b,0),maximumMs:ordered.at(-1),p95Ms:ordered[Math.ceil(ordered.length*.95)-1],times,routeSha256:createHash('sha256').update(JSON.stringify(step.value)).digest('hex')});
}
const report={snapshotSha256:createHash('sha256').update(bytes).digest('hex'),navigationSourceSha256:createHash('sha256').update(readFileSync(new URL('../src/world/navigation.js',import.meta.url))).digest('hex'),order:'8/4/4/8',runs,scope:'AB/BA, independent fresh native navigation per case, ordinary failed origin route prepared first. Identical final native tail and swept validation. Under concurrent campaign CPU load; no isolated GPU, whole-frame, mobile, economic or campaign-speed acceptance.'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(runs.map(({times,...r})=>r),null,2));
