import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),read=file=>readFileSync(new URL(file,base)),hash=b=>createHash('sha256').update(b).digest('hex'),receipt=JSON.parse(read('receipt.json')),compressed=read('report.json.gz'),raw=gunzipSync(compressed),r=JSON.parse(raw);
assert.equal(hash(raw),receipt.rawSha256);assert.equal(hash(compressed),receipt.gzipSha256);assert.equal(hash(read('fixture.html')),receipt.fixtureSha256);
assert.equal(r.done,true);assert.equal(r.disposed,true);assert.equal(r.contextLost,true);assert.equal(r.logicalUnchanged,true);assert.deepEqual(r.errors,[]);assert.equal(r.chunkPhases,true);
assert.equal(r.isolatedPreparation,true);assert.equal(r.ownedCompilation,false);assert.equal(r.ownedWaits,false);assert.equal(r.residentPreparation.mode,'programs');assert.equal(r.actorReadiness.awaited,34);
assert.equal(r.duration,15);assert.equal(r.speed,12);assert.equal(r.distance,180);assert.equal(r.initialStream.created,25);assert.equal(r.finalStream.created,40);assert.equal(r.installs.length,15);
assert.equal(r.finalStream.failed,0);assert.equal(r.finalStream.fallbacks,0);
for(const key of ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','pending'])assert.equal(r.gpu[key],0);
assert.equal(r.gpu.samples.length,r.frames.length);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5);
for(const row of r.installs){const p=row.phases;assert.equal(p.slots.length,20);near(p.propsMs,p.slots.reduce((sum,slot)=>sum+slot.cpuMs,0));near(p.terrainOtherMs,Math.max(0,p.terrainMs-p.propsMs));near(p.adoptionOtherMs,Math.max(0,row.cpuMs-p.terrainMs));}
const summary=a=>{const sorted=a.slice().sort((a,b)=>a-b);return{count:a.length,p95:sorted[Math.ceil(a.length*.95)-1],max:sorted.at(-1),over100:a.filter(x=>x>100).length};};
const frames=summary(r.frames.flatMap(f=>f.intervalMs===null?[]:[f.intervalMs]));for(const key of ['count','p95','max','over100'])near(frames[key],r.frameSummary[key]);
console.log(JSON.stringify({passed:true,frames,cpu:summary(r.frames.map(f=>f.cpuMs)),gpu:summary(r.gpu.samples.map(s=>s.ms)),install:summary(r.installs.map(x=>x.cpuMs)),props:summary(r.installs.map(x=>x.phases.propsMs)),terrainOther:summary(r.installs.map(x=>x.phases.terrainOtherMs)),adoptionOther:summary(r.installs.map(x=>x.phases.adoptionOtherMs))},null,2));
