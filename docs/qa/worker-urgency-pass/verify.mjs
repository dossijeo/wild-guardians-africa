import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const p of manifest.pieces){const raw=gunzipSync(readFileSync(new URL(p.path,dir)));assert.equal(raw.length,p.rawBytes);assert.equal(hash(raw),p.rawSha256,p.path);}
assert.equal(manifest.referenceFilesVerified,Object.keys(manifest.referenceHashes).length);
const read=name=>JSON.parse(gunzipSync(readFileSync(new URL(name,dir))));
const recovery=read('reconstruction.log.gz');assert.equal(recovery.fullStateEqual,true);assert.equal(recovery.ticks,20);assert.equal(recovery.reassigned,32);
assert.match(gunzipSync(readFileSync(new URL('reconstruction-negative.log.gz',dir))).toString(),/AssertionError \[ERR_ASSERTION\]: Full state at step 0/);
const final=read('benchmark.json.gz');assert.equal(final.cases.length,4);
for(const report of [final,read('pilot-unconditional.json.gz'),read('pilot-reconstruction.json.gz')]){
 assert.equal(report.cases.length,4);
 for(const row of report.cases){
  const input=gunzipSync(readFileSync(new URL('../'+row.source+'/state.json.gz',dir)));
  assert.equal(hash(input),row.inputSha256);
  assert.equal(row.checkpoints.length,9);assert.equal(row.samples.length,200);
  assert.equal(row.wages,row.staff*30);
  assert.equal(row.timing.reference.samples,200);assert.equal(row.timing.candidate.samples,200);
  for(const mode of ['reference','candidate']){
   const values=row.samples.map(s=>s[mode+'Ms']).sort((a,b)=>a-b),t=row.timing[mode];
   assert.ok(values.every(n=>Number.isFinite(n)&&n>=0));
   assert.equal(t.medianMs,(values[99]+values[100])/2);
   assert.equal(t.p95Ms,values[189]);assert.equal(t.maxMs,values[199]);
   assert.equal(t.totalMs,values.reduce((a,b)=>a+b,0));
  }
  assert.deepEqual(row.checkpoints,final.cases.find(c=>c.source===row.source).checkpoints,'Repeated full-state checkpoints');
 }
}
console.log(JSON.stringify({pieces:manifest.pieces.length,referenceFiles:manifest.referenceFilesVerified,cases:4,checkpointsPerRun:36,ticksPerRun:1400,scope:'Archive integrity and recorded comparisons; does not rerun simulation or certify GPU/phone/campaign acceptance.'}));
