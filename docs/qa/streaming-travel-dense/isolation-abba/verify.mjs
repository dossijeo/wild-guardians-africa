import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(fs.readFileSync(new URL('receipt.json',dir)));
const summary=values=>{const sorted=values.toSorted((a,b)=>a-b),q=p=>sorted[Math.ceil(sorted.length*p)-1];return {count:values.length,p50:q(.5),p95:q(.95),p99:q(.99),max:sorted.at(-1),over33:values.filter(v=>v>1000/30).length,over50:values.filter(v=>v>50).length,over100:values.filter(v=>v>100).length};};
let baseline;
for(const name of receipt.order){
 const raw=gunzipSync(fs.readFileSync(new URL(name+'.json.gz',dir))),r=JSON.parse(raw);
 assert.equal(createHash('sha256').update(raw).digest('hex'),receipt.rawSha256[name]);
 assert.equal(r.done,true);assert.equal(r.logicalUnchanged,true);assert.deepEqual(r.errors,[]);
 assert.equal(r.isolatedPreparation,name.startsWith('b'));assert.equal(r.frames.some(f=>f.hidden),false);
 assert.deepEqual(summary(r.frames.flatMap(f=>f.intervalMs===null?[]:[f.intervalMs])),r.frameSummary);
 assert.deepEqual(summary(r.frames.map(f=>f.cpuMs)),r.cpuSummary);
 assert.equal(r.finalStream.created-r.initialStream.created,15);
 assert.equal(r.finalStream.failed,0);assert.equal(r.finalStream.fallbacks,0);
 assert.equal(r.gpu.disjointEvents,0);assert.equal(r.gpu.pending,0);
 baseline??=r;for(const key of ['farm','device','initialEye','initialTarget','finalEye','finalTarget','duration','speed','quality'])assert.deepEqual(r[key],baseline[key],key);
}
console.log('Isolated preparation ABBA archive hashes, frame quantiles, state/camera/chunk invariants: PASS');
