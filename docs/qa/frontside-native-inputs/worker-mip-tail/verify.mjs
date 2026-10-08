import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir))),sha=b=>createHash('sha256').update(b).digest('hex');
for(const p of receipt.pieces){const stored=readFileSync(new URL(p.path,dir)),b=p.gzip?gunzipSync(stored):stored;assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);}
assert.equal(receipt.productionChanged,false);assert.equal(receipt.candidateCompared,false);assert.equal(receipt.benchmark,false);assert.equal(receipt.tabClosed,783);
const r=JSON.parse(gunzipSync(readFileSync(new URL('report.json.gz',dir))));assert.equal(r.samples.length,0);assert(r.sourceColorTexels);assert.equal(r.sourceColorMipTail,true);assert.equal(r.sameFramebufferReadbacks.length,12);assert(r.sameFramebufferReadbacks.every(x=>x.changedBytes===0));
assert.equal(r.sourceOnlyDiagnosis.controls.length,30);assert.equal(Math.max(...r.sourceOnlyDiagnosis.controls.map(x=>x.differentBytes)),21);assert.equal(r.sourceOnlyDiagnosis.controlMetrics.passes,false);
const frames=r.sourceDrawAudit.frames;assert.equal(frames.length,31);
for(const name of ['uEnvDay','uEnvNight']){const rows=frames.map(f=>f.colorTexels.rows.find(x=>x.uniform===name));assert(rows.every(x=>x.status==='REQUESTED_MIP_TAIL_READ'&&x.boundMatchesMaterialTexture&&x.levels.length===8&&x.levels.every(l=>l.fingerprint)));assert(rows.every(x=>JSON.stringify(x)===JSON.stringify(rows[0])));}
for(const name of ['map','normalMap','roughnessMap','metalnessMap']){const rows=frames.map(f=>f.colorTexels.rows.find(x=>x.uniform===name));assert(rows.every(x=>x.status==='REQUESTED_MIP_TAIL_READ'&&x.boundMatchesMaterialTexture&&x.levels.length===11&&x.levels.every(l=>l.fingerprint)));assert(rows.every(x=>JSON.stringify(x)===JSON.stringify(rows[0])));}
console.log('PASS source-only texture evidence integrity; redraw control remains invalid, no asset approval');
