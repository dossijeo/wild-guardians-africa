import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir)));
for(const p of receipt.pieces){const raw=gunzipSync(readFileSync(new URL(p.path,dir)));assert.equal(raw.length,p.rawBytes);assert.equal(createHash('sha256').update(raw).digest('hex'),p.sha256);}
const read=name=>JSON.parse(gunzipSync(readFileSync(new URL(name+'.json.gz',dir))));
for(const v of ['v1','v2']){
 const connector=read('connector-'+v);assert.equal(connector.reached,true);assert.equal(connector.allValid,true);assert.equal(connector.steps,225);assert(connector.rows.every(r=>r.valid));
 const r=read('benchmark-'+v);assert.deepEqual(r.runs.map(x=>x.mode),['reference','candidate','candidate','reference']);assert.deepEqual(r.firstDivergence,[-1,0,0,-1]);
 assert.deepEqual(r.runs[0].hashes,r.runs[3].hashes);assert.deepEqual(r.runs[1].hashes,r.runs[2].hashes);
}
const old=read('cache-owner-v1'),fixed=read('cache-owner-v2');assert.equal(old.cloned,true);assert.equal(old.nativeClone,false);assert.equal(old.sharedCache,true);
assert.equal(fixed.cloned,false);assert.equal(fixed.nativeClone,false);assert.equal(fixed.sharedCache,false);
const quality=read('quality-v2');assert.equal(quality.results[0].violations,2);assert.equal(quality.results[1].violations,1);
assert.equal(receipt.productionChanged,false);assert.deepEqual(receipt.exitCodes,[0,0]);
console.log('PASS: local detour and cache isolation verified; V2 still has one native invalid landing and is not promoted');
