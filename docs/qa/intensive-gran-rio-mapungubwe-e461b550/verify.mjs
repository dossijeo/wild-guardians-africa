import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize} from '../../../src/persistence/snapshots.js';
import {summarizeIntensiveFarm} from '../../../tools/summarize_intensive_farm.mjs';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir))),raw={};
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const [kind,p] of Object.entries(receipt.files)){const gz=readFileSync(new URL(kind+'.json.gz',dir)),b=gunzipSync(gz);assert.equal(gz.length,p.gzipBytes);assert.equal(sha(gz),p.gzipSha256);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);raw[kind]=JSON.parse(b.toString());}
assert.equal(raw.process.outcome.code,0);assert.equal(raw.status.pid,20024);assert.equal(raw.status.status,'passed');assert.equal(raw.status.completedNights,100);assert.equal(raw.summary.result,'victory');
const state=deserialize(gunzipSync(readFileSync(new URL('state.json.gz',dir))).toString());
assert.deepEqual(summarizeIntensiveFarm({...raw.report,state}),raw.summary);
assert.equal(raw.summary.daily.length,100);assert(raw.summary.daily.every(x=>x.staff>0&&x.delivered>0));
assert.equal(raw.summary.cashflow.endingBalance,'538840');assert.equal(raw.summary.speciesObserved,8);
console.log('PASS archive integrity and recorded campaign invariants; not current-main replay');
