import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const receipt=JSON.parse(await readFile(new URL('receipt.json',import.meta.url),'utf8')),rows={};
for(const [name,record] of Object.entries(receipt.records)){
 const raw=gunzipSync(await readFile(new URL(name+'.json.gz',import.meta.url)));
 assert.equal(raw.length,record.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),record.sha256);rows[name]=JSON.parse(raw);
}
const {summary,report,state,process}=rows;
assert.equal(process.outcome.code,0);assert.equal(process.outcome.signal,null);assert.equal(process.stderr,'');
for(const r of [summary,report,state]){assert.equal(r.biome,'gran-rio');assert.equal(r.culture,'musgum');assert.equal(r.result,'victory');assert.equal(r.completedNights,100);}
assert.equal(state.day,101);assert.equal(summary.campaign100,'verified');assert.equal(summary.daily.length,100);
// The summary adds an idle-reason breakdown absent from the raw report.
for(const [key,value] of Object.entries(report.activity))assert.deepEqual(summary.activity[key],value);
assert.equal(summary.money,report.money);
assert.equal(BigInt(state.ledger.balance.n),BigInt(summary.money)*BigInt(state.ledger.balance.d));
const activity=summary.activity;
assert.equal(activity.daylightSeconds,30000);assert.equal(activity.unoccupiedSeconds,6100);
assert.equal(activity.unoccupiedFraction,activity.unoccupiedSeconds/activity.daylightSeconds);
assert.equal(summary.daily.reduce((total,d)=>total+d.idle.budget+d.idle['shift-end'],0),6100);
assert.equal(receipt.idleCriterion,.2);assert.equal(receipt.idleAccepted,false);
assert.ok(activity.unoccupiedFraction>=receipt.idleCriterion);
assert.equal(receipt.domainFilesCompared,54);assert.equal(receipt.domainMismatches.length,8);
assert.equal(summary.provenance.gitHead,receipt.ambientRecordedHead);
console.log('PASS: historical 100-night victory and hashes; idle 20.33% fails the <20% target. Eight domain differences prevent current-main acceptance.');
