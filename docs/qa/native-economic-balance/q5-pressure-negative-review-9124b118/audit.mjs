import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {validateSnapshot} from '../../../../src/persistence/snapshots.js';
import {readNativeCase} from '../../../../tools/summarize-native-campaigns.mjs';
const dir=new URL('../pilot-pressure-9124b118-q5-no-walls-712-7/',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(name,dir),'utf8'));
const source=read('source.json'),report=read('report.json'),receipt=read('receipt.json');
const root=new URL('../../../../',import.meta.url);
for(const [path,expected] of Object.entries(source.sourceHashes)) {
 const committed=execFileSync('git',['show',`${source.gitHead}:${path}`],{cwd:root,maxBuffer:64*1024*1024});
 assert.equal(createHash('sha256').update(committed).digest('hex'),expected,`Frozen source ${path}`);
}
const snapshot=JSON.parse(gunzipSync(readFileSync(new URL('state.json.gz',dir))));
validateSnapshot(snapshot);
assert.equal(snapshot.result,'defeat');
assert.equal(receipt.status,'observed-native-defeat');
assert.equal(report.completedNights,6);
assert.equal(report.raidEvidence.status,'verified');
const summary=readNativeCase(dir.pathname.replace(/^\/([A-Za-z]:)/,'$1'));
assert.equal(summary.daily.length,7);
assert.equal(summary.money,32);
assert.ok(summary.idleFraction>.8);
assert.ok(report.raidEvidence.raids.every(r=>r.ended));
const ledgerSum=Object.values(snapshot.ledger.entries).reduce((n,e)=>n+BigInt(e.n)/BigInt(e.d),0n);
// Ledger entries contain movements; opening capital is not a credited delivery.
assert.equal(1500n+ledgerSum,BigInt(snapshot.ledger.balance.n)/BigInt(snapshot.ledger.balance.d));
const audit={gitHead:source.gitHead,verifiedSourceFiles:Object.keys(source.sourceHashes).length,snapshotValid:true,ledgerReconciled:true,raidObserver:report.raidEvidence.status,result:receipt.status,completedNights:6,observedDays:7,money:summary.money,idleFraction:summary.idleFraction,scope:'Negative native calibration evidence. Not acceptance of military balance, responsible management, rendering performance or 100-night survival.'};
writeFileSync(new URL('audit.json',import.meta.url),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit));
