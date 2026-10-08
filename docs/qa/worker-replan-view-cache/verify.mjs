import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir)));
const raw=p=>gunzipSync(readFileSync(new URL(p,dir))),report=n=>JSON.parse(raw(n+'.json.gz'));
for(const p of receipt.pieces){const b=raw(p.path);assert.equal(b.length,p.rawBytes);assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);}
assert.equal(receipt.productionChanged,false);assert.equal(receipt.benchmark,false);assert.equal(receipt.viewTests,6);assert(receipt.exitCodes.every(x=>x===0));
const r=report('replan');assert(r.reached&&r.allValid);assert.equal(r.steps,70);assert(r.rows.every(x=>x.valid));assert.equal(r.movement.rejected,1);
const s=report('blocked-restore');assert(s.reached);assert.equal(s.rejectionTick,7);assert.equal(s.steps,63);assert.equal(s.rows.length,63);
assert.deepEqual(report('quality').results.map(x=>x.violations),[2,0]);
assert.deepEqual(report('failed-views').results.map(x=>[x.calls,x.answers]),[[100,100],[1,100]]);
console.log('PASS V6 archive integrity and scoped outcomes; no production or timing acceptance');
