import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const read=name=>readFile(new URL(name,import.meta.url));
const proof=JSON.parse(await read('proof.json'));
for(const [name,hash] of Object.entries(proof.files))assert.equal(createHash('sha256').update(await read(name)).digest('hex'),hash,name);
const names=['baseline-sabana','candidate-c1-sabana','candidate-c2-sabana','baseline-a2-sabana'];
const rows=[];
for(const name of [...names,'candidate-gran-rio']){
 const r=JSON.parse(gunzipSync(await read(name+'.json.gz')));
 assert.equal(r.done,true);assert.equal(r.logicalUnchanged,true);assert.deepEqual(r.errors,[]);
 assert.equal(r.finalStream.failed,0);assert.equal(r.finalStream.discarded,0);assert.equal(r.finalStream.fallbacks,0);
 assert.equal(r.finalStream.worker,true);assert.ok(r.frames.every(f=>!f.hidden));
 const values=r.frames.flatMap(f=>f.intervalMs===null?[]:[f.intervalMs]).sort((a,b)=>a-b);
 const quantile=p=>values[Math.ceil(values.length*p)-1];
 assert.equal(r.frameSummary.count,values.length);assert.equal(r.frameSummary.p95,quantile(.95));
 assert.equal(r.frameSummary.p99,quantile(.99));assert.equal(r.frameSummary.max,values.at(-1));
 assert.equal(r.frameSummary.over100,values.filter(v=>v>100).length);
 assert.equal(r.gpu.disjointEvents,0);
 assert.ok(r.gpu.samples.every(s=>s.frame>=0&&s.frame<r.frames.length&&s.ms>=0));
 if(names.includes(name)){
  assert.equal(r.duration,30);assert.equal(r.speed,12);assert.equal(r.distance,360);assert.equal(r.initialStream.created,25);assert.equal(r.finalStream.created,60);
  if(rows.length){assert.deepEqual(r.finalEye,rows[0].finalEye);assert.deepEqual(r.finalTarget,rows[0].finalTarget);assert.deepEqual(r.device,rows[0].device);}
  rows.push(r);
 }
}
console.log(JSON.stringify({verifiedArtifacts:Object.keys(proof.files).length,checkpoints:rows.map(r=>r.frameSummary),sameFinalCamera:true,logicalUnchanged:true},null,2));
