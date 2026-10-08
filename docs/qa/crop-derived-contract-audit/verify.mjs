import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const piece of manifest.pieces){
  const bytes=readFileSync(new URL(piece.path,dir));
  const raw=piece.gzip?gunzipSync(bytes):bytes;
  assert.equal(raw.length,piece.rawBytes,piece.path);
  assert.equal(hash(raw),piece.sha256,piece.path);
}
const read=name=>JSON.parse(gunzipSync(readFileSync(new URL(name,dir))));
const report=read('report.json.gz'),analysis=read('analysis.json.gz');
assert.equal(report.blenderStemReduction,true);
assert.equal(report.samples.length,1);
assert.equal(report.arms.length,4);
assert(report.arms.every(a=>a.includes('DoubleSide')));
const sample=report.samples[0];
assert.equal(sample.controls.length,3);
assert(sample.controls.every(c=>c.differentBytes===0&&c.maxByteDifference===0&&c.alphaDifferences===0));
assert.equal(sample.comparisons[0].passes,true);
assert.equal(sample.comparisons[0].linearRgbMae,0);
for(const c of sample.comparisons.slice(1)){
  assert.equal(c.passes,false);
  assert.equal(c.missingPixels,50);assert.equal(c.addedPixels,224);
  assert.equal(c.alphaDistanceGate.missingBeyondOnePixel,13);
  assert.equal(c.alphaDistanceGate.addedBeyondOnePixel,159);
}
assert.equal(analysis.sourceDraws,1);
assert.equal(analysis.rows.length,3);
for(const [index,row] of analysis.rows.entries()){
  assert.equal(row.cpuMatricesEqual,true);assert.equal(row.iGrowthEqual,true);
  assert.equal(row.instanceMatrixEqual,true);
  assert.equal(row.sourceTangentPresent,false);assert.equal(row.candidateTangentPresent,false);
  assert(row.materialDifferences.every(d=>d.length===0));
  assert.equal(row.boundsEqual,index===0);
  for(const draw of row.shaderDraws){
    assert.equal(draw.sameProgram,true);assert.equal(draw.programSourcesEqual,true);
    assert.equal(draw.uniformsEqual,true);assert.equal(draw.texturesEqual,true);
    assert.equal(draw.matricesEqual,true);
    assert.deepEqual(draw.changedUniforms,[]);
    assert.deepEqual(draw.vertexAttributeLayoutDifferences,[]);
  }
}
assert.deepEqual(read('console.json.gz'),[]);
assert.equal(manifest.promoted,false);assert.equal(manifest.gpuBenchmark,false);
console.log('PASS: archived native crop contracts; visual rejection retained, no causal or GPU acceptance');
