import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',dir))),hash=b=>createHash('sha256').update(b).digest('hex');
for(const p of m.pieces){const b=readFileSync(new URL(p.path,dir)),raw=p.gzip?gunzipSync(b):b;assert.equal(raw.length,p.rawBytes);assert.equal(hash(raw),p.sha256);}
const read=p=>JSON.parse(gunzipSync(readFileSync(new URL(p,dir))));
const r=read('report.json.gz'),a=r.sourceDrawAudit,analysis=read('analysis.json.gz');assert.equal(r.samples.length,0);assert.equal(r.sourceSha256,m.sourceAssetSha256);assert.equal(r.conditions.gpuTiming,false);
assert.equal(r.unchangedOriginalControls.length,30);const changed=new Set(r.unchangedOriginalControls.map(c=>c.differentBytes));assert.deepEqual([...changed].sort((a,b)=>a-b),[0,21]);
for(const c of r.unchangedOriginalControls){assert.equal(c.alphaDifferences,0);assert.equal(c.maxByteDifference,c.differentBytes?59:0);}
assert.deepEqual(a.initialBuffers,a.finalBuffers);assert.equal(a.initialBuffers.length,25);assert.equal(a.programs.length,1);
const first=a.frames.filter(f=>f.label==='reference');assert.equal(first.length,1);assert.equal(first[0].mesh,'Mesh0');
for(const f of a.frames){const {label,...value}=f,{label:ignored,...original}=first[0];assert.deepEqual(value,original);}
assert.equal(analysis.referenceDraws,1);assert.equal(analysis.repeats.length,30);assert.ok(analysis.repeats.every(r=>r.differences.length===0));assert.equal(analysis.attributesUnchanged,true);assert.deepEqual(read('console.json.gz'),[]);
console.log('PASS: source-only GL state archive; 30 repeats, 0/21-byte source variation; no candidate approval or GPU timing');
