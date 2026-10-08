import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir)));
for(const p of receipt.pieces){let raw=readFileSync(new URL(p.path,dir));if(p.gzip)raw=gunzipSync(raw);assert.equal(raw.length,p.rawBytes);assert.equal(createHash('sha256').update(raw).digest('hex'),p.sha256);}
const read=name=>JSON.parse(gunzipSync(readFileSync(new URL(name+'-report.json.gz',dir))));
const crop=read('crop'),worker=read('worker');
assert.equal(crop.stemBudgetMax,true);assert.equal(crop.samples.length,1);
assert(crop.samples[0].controls.every(c=>c.differentBytes===0));
assert(crop.samples[0].comparisons[0].passes);
for(const c of crop.samples[0].comparisons.slice(1)){
 assert.equal(c.passes,false);assert.equal(c.missingPixels,55);assert.equal(c.addedPixels,193);
 assert.equal(c.alphaDistanceGate.missingBeyondOnePixel,13);assert.equal(c.alphaDistanceGate.addedBeyondOnePixel,149);
}
assert.equal(worker.candidate,null);assert.equal(worker.shadowsEnabled,false);
assert.equal(worker.sameFramebufferReadbacks.length,12);assert(worker.sameFramebufferReadbacks.every(r=>r.changedBytes===0&&r.alphaDifferences===0));
assert.equal(worker.sourceOnlyDiagnosis.controls.length,30);assert.equal(worker.sourceOnlyDiagnosis.controlMetrics.passes,false);
const frames=worker.sourceDrawAudit.frames;assert.equal(frames.length,31);
assert(frames.every(f=>f.mesh==='Mesh0'&&JSON.stringify(f.gpuInputs)===JSON.stringify(frames[0].gpuInputs)));
assert(frames.every(f=>f.gpuInputs.boneTexture.framebufferStatus===36053&&f.gpuInputs.boneTexture.cpuGpuFingerprintEqual&&f.gpuInputs.boneTexture.nonfiniteReadValues===0));
assert.equal(receipt.productionChanged,false);assert.equal(receipt.benchmark,false);
const anchor=JSON.parse(gunzipSync(readFileSync(new URL('anchor-report.json.gz',dir))));
assert.equal(anchor.stemAnchorNormals,true);assert.equal(anchor.samples.length,1);
assert(anchor.samples[0].controls.every(c=>c.differentBytes===0));
assert.equal(anchor.samples[0].comparisons[0].passes,true);
for(const c of anchor.samples[0].comparisons.slice(1)){
 assert.equal(c.passes,false);assert.equal(c.missingPixels,55);assert.equal(c.addedPixels,193);
 assert.equal(c.alphaDistanceGate.missingBeyondOnePixel,13);assert.equal(c.alphaDistanceGate.addedBeyondOnePixel,149);
 assert(c.maxTileMae>.14);assert(c.linearRgbMae<crop.samples[0].comparisons[c.arm-1].linearRgbMae);
}
console.log('PASS: 658 quality rejection retained; repeated framebuffer exact, worker redraw control invalid, observed GPU input fingerprints stable');
console.log('PASS: original-anchor normal restoration improves training RGB slightly, but remains rejected');
