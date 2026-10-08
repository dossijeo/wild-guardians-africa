import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',dir))),hash=b=>createHash('sha256').update(b).digest('hex');
for(const p of m.pieces){const b=readFileSync(new URL(p.path,dir)),raw=p.gzip?gunzipSync(b):b;assert.equal(raw.length,p.rawBytes);assert.equal(hash(raw),p.sha256);}
const read=p=>JSON.parse(gunzipSync(readFileSync(new URL(p,dir))));
const r=read('report.json.gz'),a=r.sourceDrawAudit;assert.equal(r.samples.length,0);assert.equal(r.shadowsEnabled,false);assert.equal(r.conditions.gpuTiming,false);assert.equal(r.sourceSha256,m.sourceAssetSha256);assert.equal(r.unchangedOriginalControls.length,30);
assert.deepEqual([...new Set(r.unchangedOriginalControls.map(c=>c.differentBytes))].sort((a,b)=>a-b),[0,21]);assert.ok(r.unchangedOriginalControls.every(c=>c.alphaDifferences===0&&c.maxByteDifference===(c.differentBytes?59:0)));
const first=a.frames.find(f=>f.label==='reference');assert.equal(a.frames.length,31);assert.equal(first.mesh,'Mesh0');
for(const f of a.frames){const {label,...value}=f,{label:ignored,...base}=first;assert.deepEqual(value,base);assert.equal(f.uniforms.find(u=>u.name==='uNativeShadowOn').value,0);const sampler=f.textures.find(t=>t.uniform==='uNativeShadowFiltered');assert.equal(sampler.type,35682);assert.equal(sampler.textureParameters.compareMode,34894);assert.equal(sampler.textureParameters.compareFunc,515);}
assert.deepEqual(a.initialBuffers,a.finalBuffers);const logs=read('console.json.gz');assert.equal(logs.length,1);assert.equal(logs[0].level,'warn');assert.match(logs[0].message,/X4000.*potentially uninitialized variable \(f_environment4\)/);
console.log('PASS: 30 source-only controls with native shadow uniform zero; source jitter persists; no candidate/GPU acceptance');
