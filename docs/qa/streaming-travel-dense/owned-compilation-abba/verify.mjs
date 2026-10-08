import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',base)));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const rows=[];let first;
const summarize=values=>{const sorted=[...values].sort((a,b)=>a-b);return {count:values.length,p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1),over100:values.filter(v=>v>100).length};};
for(const [index,record] of receipt.runs.entries()){
 const compressed=readFileSync(new URL(record.file,base)),raw=gunzipSync(compressed);
 assert.equal(hash(compressed),record.gzipSha256);assert.equal(hash(raw),record.rawSha256);
 const report=JSON.parse(raw);assert.equal(report.ownedCompilation,[false,true,true,false][index]);
 assert.equal(report.done,true);assert.equal(report.disposed,true);assert.equal(report.logicalUnchanged,true);assert.deepEqual(report.errors,[]);
 assert.equal(report.isolatedPreparation,true);assert.equal(report.residentPreparation.mode,'programs');
 assert.equal(report.actorReadiness.awaited,34);assert.equal(report.duration,15);assert.equal(report.distance,180);
 assert.equal(report.initialStream.created,25);assert.equal(report.finalStream.created,40);
 assert.equal(report.finalStream.failed,0);assert.equal(report.finalStream.fallbacks,0);
 assert.equal(report.gpu.supported,true);
 for(const key of ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','pending'])assert.equal(report.gpu[key],0,key);
 assert.equal(report.gpu.samples.length,report.frames.length);
 const identity=Object.fromEntries(['farm','device','initialEye','initialTarget','finalEye','finalTarget','biome','culture','seed','quality','initialStream','finalStream'].map(key=>[key,report[key]]));
 if(first)assert.deepEqual(identity,first);else first=identity;
 const frame=summarize(report.frames.flatMap(f=>f.intervalMs===null?[]:[f.intervalMs]));
 assert.equal(frame.count,report.frameSummary.count);assert.equal(frame.over100,report.frameSummary.over100);assert.equal(frame.max,report.frameSummary.max);assert.equal(frame.p95,report.frameSummary.p95);
 rows.push({arm:record.arm,frame,cpu:summarize(report.frames.map(f=>f.cpuMs)),gpu:summarize(report.gpu.samples.map(s=>s.ms))});
}
assert.equal(hash(readFileSync(new URL('endpoint-b2.png',base))),receipt.screenshotSha256);
console.log(JSON.stringify({passed:true,rows,scope:'Paired native AB/BA, no promotion or stability acceptance'},null,2));
