import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize} from '../../../src/persistence/snapshots.js';
import {auditIntensiveFarm} from '../../../tools/check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from '../../../tools/summarize_intensive_farm.mjs';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir))),raw={};
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const [kind,p] of Object.entries(receipt.files)){const gz=readFileSync(new URL(kind+'.json.gz',dir)),b=gunzipSync(gz);assert.equal(gz.length,p.gzipBytes);assert.equal(sha(gz),p.gzipSha256);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);raw[kind]=JSON.parse(b.toString());}
assert.equal(raw.process.outcome.code,0);assert.equal(raw.status.pid,49608);assert.equal(raw.status.status,'passed');assert.equal(raw.status.completedNights,100);assert.equal(raw.summary.result,'victory');
const state=deserialize(gunzipSync(readFileSync(new URL('state.json.gz',dir))).toString());
auditIntensiveFarm({...raw.report,state},{victory:true});assert.deepEqual(summarizeIntensiveFarm({...raw.report,state}),raw.summary);
assert.equal(raw.summary.daily.length,100);assert(raw.summary.daily.every(x=>x.staff>0&&x.delivered>0));
assert.equal(raw.summary.cashflow.endingBalance,'551366');assert.equal(raw.summary.speciesObserved,8);assert.equal(raw.summary.maximumLiving,1439);assert.equal(raw.summary.activity.unoccupiedFraction,.19926666666666668);
assert.equal(receipt.frozenRevision,'e461b5502212fd6116e0cf37d270a2836134438a');assert.equal(receipt.sourceCount,291);assert(receipt.childSourcesMatchFrozenParent&&receipt.frozenSourceHashesMatch);
console.log('PASS archive, native ledger/physical crate audit and exact 100-night summary; historical frozen campaign, not current-main replay');
