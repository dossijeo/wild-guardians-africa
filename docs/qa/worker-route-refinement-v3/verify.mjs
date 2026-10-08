import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir)));
const raw=name=>gunzipSync(readFileSync(new URL(name,dir))),read=name=>JSON.parse(raw(name+'.json.gz'));
for(const p of receipt.pieces){const bytes=raw(p.path);assert.equal(bytes.length,p.rawBytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256);}
assert.equal(receipt.productionChanged,false);assert(receipt.exitCodes.every(x=>x===0));
const trace=read('landing-trace');assert.deepEqual(trace.rows.map(x=>x.stateSha256),trace.baselineHashes);assert.equal(trace.rows[1].valid,true);assert.equal(trace.rows[2].valid,false);
const strip=read('missed-strip');assert.equal(strip.accepted,true);assert.equal(strip.invalidRows.length,12);assert.deepEqual(strip.grids.map(x=>x.rejects),[0,0,1,2]);
const q=read('quality');assert.deepEqual(q.results.map(x=>x.violations),[2,0]);
const connector=read('connector');assert.equal(connector.reached,true);assert.equal(connector.steps,225);assert(connector.rows.every(x=>x.valid));
const b=read('benchmark');assert.deepEqual(b.runs.map(x=>x.mode),['reference','candidate','candidate','reference']);assert.deepEqual(b.runs[0].hashes,b.runs[3].hashes);assert.deepEqual(b.runs[1].hashes,b.runs[2].hashes);assert.deepEqual(b.firstDivergence,[-1,0,0,-1]);assert.equal(b.sourceHashes.candidate,createHash('sha256').update(raw('candidate-navigation.mjs.gz')).digest('hex'));
const returning=read('native-return');assert.equal(returning.rows.length,27);assert(returning.rows.every(x=>x.firstValid&&x.homeTick!==null));assert.equal(Math.max(...returning.rows.map(x=>x.homeTick)),684);
const restore=read('restore');assert.equal(restore.rows.length,40);assert(restore.rows.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
console.log('PASS archive integrity and scoped V3 outcomes; no production promotion');
