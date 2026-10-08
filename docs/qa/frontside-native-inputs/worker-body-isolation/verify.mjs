import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir))),sha=b=>createHash('sha256').update(b).digest('hex');
for(const p of receipt.pieces){const stored=readFileSync(new URL(p.path,dir)),b=p.gzip?gunzipSync(stored):stored;assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);}
assert.equal(receipt.productionChanged,false);assert.equal(receipt.candidateCompared,false);assert.equal(receipt.benchmark,false);assert.equal(receipt.tabClosed,786);assert.equal(receipt.gpuDisposed,true);assert.deepEqual(receipt.warningErrorLogs,[]);assert.equal(receipt.possibleBlenderOverlap.reportedExitCode,0);
const r=JSON.parse(gunzipSync(readFileSync(new URL('report.json.gz',dir))));assert.equal(r.candidate,null);assert.equal(r.samples.length,0);assert.equal(r.shadowsEnabled,false);
const body=r.sourceBodyIsolation;assert.equal(body.mesh,'Mesh0');assert.equal(body.face,null);assert.equal(body.indexStart,0);assert.equal(body.indexCount,59853);assert.equal(body.otherOriginalMeshesHidden,24);assert.equal(body.visibleSourcePixels,137604);assert(body.coverageWitness&&body.drawRangeRestored&&body.meshVisibilityRestored);
assert.equal(r.sameFramebufferReadbacks.length,12);assert(r.sameFramebufferReadbacks.every(x=>x.changedBytes===0&&x.alphaDifferences===0));
assert.equal(r.sourceOnlyDiagnosis.controls.length,30);assert.equal(Math.max(...r.sourceOnlyDiagnosis.controls.map(x=>x.differentBytes)),21);assert(r.sourceOnlyDiagnosis.controls.every(x=>x.alphaDifferences===0));assert.equal(r.sourceOnlyDiagnosis.controlMetrics.passes,false);
const frames=r.sourceDrawAudit.frames;assert.equal(frames.length,31);assert(frames.every(f=>f.mesh==='Mesh0'&&f.side===0&&f.drawRange.start===0&&f.drawRange.count===null));for(const key of Object.keys(frames[0]).filter(k=>k!=='label'))assert(frames.every(f=>JSON.stringify(f[key])===JSON.stringify(frames[0][key])),'Observed input changed: '+key);
console.log('PASS native body coverage, preserved source variability and observed input stability; no candidate or causal acceptance');
