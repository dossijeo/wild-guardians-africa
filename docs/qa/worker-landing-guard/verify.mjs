import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir)));
for(const p of receipt.pieces){const raw=gunzipSync(readFileSync(new URL(p.path,dir)));assert.equal(raw.length,p.rawBytes);assert.equal(createHash('sha256').update(raw).digest('hex'),p.sha256);}
const read=name=>JSON.parse(gunzipSync(readFileSync(new URL(name+'.json.gz',dir))));
const report=read('benchmark'),connector=read('connector');
assert.deepEqual(report.runs.map(r=>r.mode),['reference','candidate','candidate','reference']);
assert.deepEqual(report.firstDivergence,[-1,1,1,-1]);
assert.deepEqual(report.runs[0].hashes,report.runs[3].hashes);assert.deepEqual(report.runs[1].hashes,report.runs[2].hashes);
for(const r of report.runs){assert.equal(r.staff,112);assert.equal(r.measuredTicks,75);assert.equal(r.samplesMs.length,75);assert.equal(r.hashes.length,100);}
assert.equal(connector.valid,true);assert.equal(connector.moved,0);assert.equal(connector.reached,false);assert.equal(connector.checks.rejected,30);
assert.equal(receipt.productionChanged,false);assert.equal(receipt.exitCode,0);
console.log('PASS: isolated landing guard prevents unsafe arrival but strands worker; ABBA trajectory divergence retained, candidate not promoted');
