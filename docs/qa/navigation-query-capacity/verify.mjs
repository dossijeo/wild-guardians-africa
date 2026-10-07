import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url);
const capacity=JSON.parse(await readFile(new URL('capacity.json',base),'utf8'));
assert.equal(capacity.cases.length,4);
const quantile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
for(const c of capacity.cases){
 assert.equal(c.blocks.length,24);assert.equal(c.hotQueries,256);assert.equal(c.coldQueries,2);
 assert.equal(c.trueResults+c.falseResults,258);
 for(const arm of ['baseline','candidate']){
  const blocks=c.blocks.filter(b=>b.arm===arm);assert.equal(blocks.length,12);
  assert.equal(c.summary[arm].medianMs,quantile(blocks.map(b=>b.ms),.5));
  assert.equal(c.summary[arm].p95Ms,quantile(blocks.map(b=>b.ms),.95));
  for(const b of blocks){assert.equal(b.misses,arm==='candidate'?2:258);if(arm==='candidate')assert.equal(b.cacheSize,c.capacity);}
 }
}
const native=JSON.parse(await readFile(new URL('native.json',base),'utf8'));
assert.equal(native.ticks,100);assert.equal(native.stepSeconds,.1);
assert.equal(native.worlds[0].finalStateSha256,native.worlds[1].finalStateSha256);
for(const name of ['staff','walkMisses','segmentMisses','maxWalkKeys','maxSegmentKeys','alive','money'])assert.equal(native.worlds[0][name],native.worlds[1][name]);
assert.equal(capacity.sourceHash,native.sourceHashes.navigation);
console.log('PASS: capacity blocks, aggregate timings and native parity receipt are consistent; limited scopes retained.');
