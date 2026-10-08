import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir))),sha=b=>createHash('sha256').update(b).digest('hex');
for(const p of receipt.pieces){const stored=readFileSync(new URL(p.path,dir)),b=p.gzip?gunzipSync(stored):stored;assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);}
assert.equal(receipt.productionChanged,false);assert.equal(receipt.candidateCompared,false);assert.equal(receipt.benchmark,false);assert.equal(receipt.tabClosed,784);assert.equal(receipt.gpuDisposed,true);assert.deepEqual(receipt.warningErrorLogs,[]);
const r=JSON.parse(gunzipSync(readFileSync(new URL('report.json.gz',dir))));assert.equal(r.samples.length,0);assert.equal(r.shadowsEnabled,false);const p=r.sourcePrimitiveIsolation;assert.equal(p.mesh,'Mesh0');assert.equal(p.face,9365);assert.deepEqual(p.originalVertexIndices,[9072,9079,9080]);assert.equal(p.indexStart,28095);assert.equal(p.indexCount,3);assert.equal(p.visibleSourcePixels,7);assert(p.coverageWitness&&p.drawRangeRestored&&p.meshVisibilityRestored);assert.equal(p.otherOriginalMeshesHidden,24);
assert.equal(r.sameFramebufferReadbacks.length,12);assert(r.sameFramebufferReadbacks.every(x=>x.changedBytes===0&&x.alphaDifferences===0));assert.equal(r.sourceOnlyDiagnosis.controls.length,30);assert(r.sourceOnlyDiagnosis.controls.every(x=>x.differentBytes===0));assert.equal(r.sourceOnlyDiagnosis.controlMetrics.maxError,0);
const frames=r.sourceDrawAudit.frames;assert.equal(frames.length,31);assert(frames.every(f=>f.mesh==='Mesh0'&&f.side===0&&f.drawRange.start===28095&&f.drawRange.count===3));for(const key of Object.keys(frames[0]).filter(k=>k!=='label'))assert(frames.every(f=>JSON.stringify(f[key])===JSON.stringify(frames[0][key])),'Observed input changed: '+key);
console.log('PASS native primitive coverage, stable redraw/readback and archive integrity; no full-source/candidate acceptance');
