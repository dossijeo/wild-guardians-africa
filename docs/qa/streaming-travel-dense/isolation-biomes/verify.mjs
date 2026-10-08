import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const receipt=JSON.parse(await readFile(new URL('receipt.json',import.meta.url),'utf8'));
assert.deepEqual(receipt.runs.map(run=>run.biome).toSorted(),['desierto','gran-canon','manglares','volcanes']);
const summarize=values=>{
 const sorted=values.toSorted((a,b)=>a-b),q=p=>sorted[Math.ceil(sorted.length*p)-1];
 return {count:values.length,p50:q(.5),p95:q(.95),p99:q(.99),max:sorted.at(-1),over33:values.filter(v=>v>1000/30).length,over50:values.filter(v=>v>50).length,over100:values.filter(v=>v>100).length};
};
for(const run of receipt.runs){
 const raw=gunzipSync(await readFile(new URL(run.biome+'.json.gz',import.meta.url)));
 assert.equal(createHash('sha256').update(raw).digest('hex'),run.sha256);
 const report=JSON.parse(raw);
 assert.equal(report.biome,run.biome);assert.equal(report.culture,run.culture);
 assert.equal(report.done,true);assert.equal(report.logicalUnchanged,true);assert.deepEqual(report.errors,[]);
 assert.equal(report.isolatedPreparation,true);assert.ok(report.residentPreparation);
 assert.equal(report.duration,15);assert.equal(report.speed,12);assert.equal(report.distance,180);
 assert.equal(report.quality,'media');assert.equal(report.seed,'712');
 assert.equal(report.farm.fixture,'new-village');assert.equal(report.farm.plants,0);assert.equal(report.farm.workers,0);
 assert.ok(report.frames.length>0);assert.ok(report.frames.every(frame=>frame.hidden===false));
 assert.equal(report.finalStream.failed,0);assert.equal(report.finalStream.fallbacks,0);
 assert.equal(report.finalStream.created-report.initialStream.created,run.newChunks);
 const summary=summarize(report.frames.flatMap(frame=>frame.intervalMs===null?[]:[frame.intervalMs]));
 assert.deepEqual(summary,report.frameSummary);assert.deepEqual(summary,run.frameSummary);
}
console.log('PASS: four archived functional routes, hashes, frame summaries and reported invariants. No browser rerun or performance comparison.');
