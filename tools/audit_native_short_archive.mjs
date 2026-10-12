import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const folder=resolve(process.argv[2]??'docs/qa/native-balance-parallel-short'),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(folder+'/archive-manifest.json'));
for(const[name,r]of Object.entries(manifest.files)){const stored=readFileSync(folder+'/native-original/'+name);assert.equal(stored.length,r.bytes,name);assert.equal(sha(stored),r.sha256,name);const raw=r.rawGzip?stored:gunzipSync(stored);assert.equal(raw.length,r.rawBytes,name);assert.equal(sha(raw),r.rawSHA256,name);}
const json=name=>JSON.parse(gunzipSync(readFileSync(folder+'/native-original/'+name+'.gz')));
const report=json('report.json'),receipt=json('receipt.json'),state=JSON.parse(gunzipSync(readFileSync(folder+'/native-original/state.json.gz'))),timing=json('timing-terminal.json'),source=json('source.json');
assert.equal(receipt.status,'observed-horizon');assert.equal(report.completedNights,7);assert.equal(report.result,null);assert.equal(state.completedNights,7);assert.equal(state.day,8);assert.equal(report.money,731);assert.equal(report.daily.length,7);
assert.equal(state.ledger.balance.d,'1');let balance=1500n;for(const q of Object.values(state.ledger.entries)){assert.equal(q.d,'1');balance+=BigInt(q.n);}assert.equal(balance,BigInt(state.ledger.balance.n));assert.equal(balance,731n);
for(const day of report.daily)assert.equal(day.finance.reconciliationDifference,0);
assert.equal(report.nativeEvidence.status,'verified');assert.equal(report.raidEvidence.status,'verified');assert.equal(report.counts.CrateDelivered,440);assert.equal(report.defense.paidCost,780);assert.equal(report.nativeEvidence.repairSettlements.paidCoins,'0');
assert.equal(source.gitHead,manifest.sourceHead);assert.equal(Object.keys(source.sourceHashes).length,441);assert.deepEqual(source.trackedChanges,[]);assert.equal(timing.count,2711);assert.equal(timing.slowWindows,1);assert.ok(timing.maximumMs>6000);
if(process.argv[3]){for(const[path,hash]of Object.entries(source.sourceHashes))assert.equal(sha(readFileSync(resolve(process.argv[3],path))),hash,path);}
console.log(JSON.stringify({status:'verified',payloads:Object.keys(manifest.files).length,sourceCount:441,sourceChecked:!!process.argv[3],sevenNights:true,ledgerFinal:balance.toString(),physicalDeliveries:440,paidWalls:780,paidRepairs:0,longWindowMs:timing.maximumMs,inactivityHistorical:report.nativeEvidence.meaningfulActivity.unoccupiedFraction,scope:'Native seven-night result and preserved diagnostic CPU evidence; inactivity no longer an acceptance gate, no100/180/GPU claim'}));
