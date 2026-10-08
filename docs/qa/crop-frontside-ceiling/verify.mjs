import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('./',import.meta.url),r=JSON.parse(readFileSync(new URL('results.json',root)));
assert(r.completed&&r.restored&&r.glError===0);assert.deepEqual(r.errors,[]);assert.equal(r.blocks.length,32);
assert.equal(r.context.plants,1600);assert.deepEqual(r.context.buffer,[1280,720]);
for(const mode of ['total','color','depth','shadow']){
 const blocks=r.blocks.filter(b=>b.mode===mode);assert.equal(blocks.map(b=>b.arm).join(''),'ABBABAAB');
 assert.equal(r.summary[mode].A.count,480);assert.equal(r.summary[mode].B.count,480);
 for(const b of blocks){assert(b.gpu.supported);assert.equal(b.gpu.pending,0);assert.equal(b.gpu.samples.length,120);
  for(const k of ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures'])assert.equal(b.gpu[k],0);
  assert(b.gpu.samples.every(s=>Number.isFinite(s.ms)&&s.ms>=0));
 }
 const submission=blocks[0].submissions[0];assert(blocks.every(b=>b.submissions[0].calls===submission.calls&&b.submissions[0].triangles===submission.triangles),'Identical submissions across sides');
 const mean=arm=>{const samples=blocks.filter(b=>b.arm===arm).flatMap(b=>b.gpu.samples);return samples.reduce((a,s)=>a+s.ms,0)/samples.length;};
 assert(Math.abs(r.summary[mode].savedMs-(mean('A')-mean('B')))<1e-9);
}
const provenance=JSON.parse(readFileSync(new URL('provenance.json',root)));
if(provenance.files['docs/qa/crop-frontside-ceiling/world-results.json'])for(const file of ['world-results-initial.json','world-results.json']){
 const w=JSON.parse(readFileSync(new URL(file,root)));assert(w.completed&&w.restored&&w.glError===0);assert.deepEqual(w.errors,[]);
 assert.equal(w.context.plants,1122);assert.equal(w.blocks.map(b=>b.arm).join(''),'ABBABAAB');assert.equal(w.summary.A.count,360);assert.equal(w.summary.B.count,360);
 const original=gunzipSync(readFileSync(new URL('../../../docs/qa/intensive-sabana-mapungubwe-e461b550/state.json.gz',root)));
 assert.equal(createHash('sha256').update(original).digest('hex'),w.context.inputSha256);
 for(const b of w.blocks){assert(b.gpu.supported);assert.equal(b.gpu.pending,0);assert.equal(b.gpu.samples.length,90);for(const k of ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures'])assert.equal(b.gpu[k],0);}
 const submission=w.blocks[0].submissions[0];assert(w.blocks.every(b=>b.submissions[0].calls===submission.calls&&b.submissions[0].triangles===submission.triangles));
 console.log('PASS: '+file+' 720 full-world GPU samples; archived input hash and invariant submissions');
}
for(const [path,expected] of Object.entries(provenance.files)){
 const bytes=readFileSync(new URL('../../../'+path,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,path);
}
console.log('PASS: 3840 resolved GPU samples, balanced AB/BA, invariant submissions, originals restored, source hashes');
