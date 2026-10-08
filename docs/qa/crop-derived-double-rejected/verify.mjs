import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',dir))),hash=b=>createHash('sha256').update(b).digest('hex');
for(const p of m.pieces){const b=readFileSync(new URL(p.path,dir)),raw=p.gzip?gunzipSync(b):b;assert.equal(raw.length,p.rawBytes);assert.equal(hash(raw),p.sha256);}
const read=p=>JSON.parse(gunzipSync(readFileSync(new URL(p,dir))));
const r=read('report.json.gz');assert.equal(r.blenderStemReduction,true);assert.equal(r.samples.length,1);assert.equal(r.arms.length,4);assert.ok(r.arms.every(a=>a.includes('DoubleSide')));
const row=r.samples[0];assert.equal(row.growth,1);assert.equal(row.clock,1.75);assert.equal(row.controls.length,3);assert.ok(row.controls.every(c=>c.differentBytes===0&&c.maxByteDifference===0&&c.alphaDifferences===0));
const [indexed,...derived]=row.comparisons;assert.equal(indexed.passes,true);assert.equal(indexed.alphaIoU,1);assert.equal(indexed.linearRgbMae,0);assert.equal(indexed.missingPixels,0);assert.equal(indexed.addedPixels,0);
for(const c of derived){assert.equal(c.passes,false);assert.equal(c.missingPixels,50);assert.equal(c.addedPixels,224);assert.equal(c.alphaDistanceGate.missingBeyondOnePixel,13);assert.equal(c.alphaDistanceGate.addedBeyondOnePixel,159);assert.equal(c.alphaDistanceGate.passes,false);assert.equal(c.maxTileMae,.14401417526661278);}
assert.equal(m.promoted,false);assert.equal(m.gpuBenchmark,false);assert.deepEqual(read('console.json.gz'),[]);
console.log('PASS: archived Double-only quality rejection; no FrontSide, production promotion or GPU benchmark');
