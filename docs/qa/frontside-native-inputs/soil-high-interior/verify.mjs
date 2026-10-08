import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
for(const p of JSON.parse(readFileSync(new URL('receipt.json',dir))).pieces){const b=gunzipSync(readFileSync(new URL(p.path,dir)));assert.equal(b.length,p.rawBytes);assert.equal(hash(b),p.sha256);}
for(const p of JSON.parse(readFileSync(new URL('outputs.json',dir)))){const b=readFileSync(new URL(p.path,dir));assert.equal(b.length,p.bytes);assert.equal(hash(b),p.sha256);}
const r=JSON.parse(readFileSync(new URL('report.json',dir)));assert.equal(r.status,'VISUAL_SCREEN_NOT_APPROVED');assert(r.blenderSoilReduction);assert.equal(r.samples.length,1);assert.deepEqual(r.samples[0].comparisons.map(x=>x.passes),[true,false,false]);
const c=r.samples[0].comparisons[1];assert.equal(c.missingPixels,520);assert.equal(c.addedPixels,525);assert.equal(c.alphaDistanceGate.missingBeyondOnePixel,245);assert.equal(c.alphaDistanceGate.addedBeyondOnePixel,301);
console.log('PASS soil-only rejection evidence integrity; candidate not approved');
