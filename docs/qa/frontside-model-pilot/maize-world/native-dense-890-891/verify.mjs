import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),read=n=>fs.readFileSync(new URL(n,base)),json=n=>JSON.parse(read(n));
const manifest=json('manifest.json');
for(const file of manifest.files){const bytes=read(file.path);assert.equal(bytes.length,file.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256);}
const review=json('review-890.json'),bindings=json('bindings-891.json');
for(const r of [review,bindings]){assert.equal(r.visualAcceptancePolicyVersion,3);assert.equal(r.scenario.matureMaizeCount,1257);assert.equal(r.scenario.changedCount,1239);assert.equal(r.cleanup.closed,true);assert.equal(r.cleanup.contextLost,true);assert.deepEqual(r.errors,[]);assert.deepEqual(r.cleanup.errors,[]);assert.equal(r.visualReview.status,'HUMAN_REVIEW_PENDING');}
assert.equal(review.campaign,'review');assert.equal(bindings.campaign,'bindings');
const probe=bindings.liveGrowthBindings.probe;
assert.equal(probe.records.length,48);assert.equal(probe.records.filter(r=>r.status==='BOUND_GPU_BYTES_DIFFER').length,17);assert.equal(probe.records.filter(r=>r.status==='BOUND_GPU_BYTES_MATCH_CPU').length,31);
assert.equal(probe.readBytes,1572864);assert.deepEqual(probe.errors,[]);
for(const r of probe.records){assert.equal(r.bufferToken,1);assert.equal(r.bufferBytes,32768);assert.equal(r.isBuffer,true);}
console.log('PASS immutable 890 review and 891 retained binding differences; no growth or GPU approval');
