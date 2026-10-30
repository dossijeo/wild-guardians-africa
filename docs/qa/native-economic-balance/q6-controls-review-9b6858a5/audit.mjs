import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {validateSnapshot} from '../../../../src/persistence/snapshots.js';
import {readNativeCase} from '../../../../tools/summarize-native-campaigns.mjs';
const audits=[];let hashes;
for(const strategy of ['no-walls','no-shield']){
 const dir=new URL(`../pilot-pressure-9b6858a5-q6-${strategy}-712-7/`,import.meta.url);
 const read=name=>JSON.parse(readFileSync(new URL(name,dir),'utf8'));
 const source=read('source.json'),report=read('report.json'),receipt=read('receipt.json');
 if(hashes)assert.deepEqual(source.sourceHashes,hashes);else hashes=source.sourceHashes;
 assert.equal(source.gitHead.slice(0,8),'9b6858a5');assert.equal(receipt.status,'observed-horizon');
 const snapshot=JSON.parse(gunzipSync(readFileSync(new URL('state.json.gz',dir))));validateSnapshot(snapshot);
 assert.equal(snapshot.result,null);assert.equal(report.completedNights,7);
 assert.equal(report.raidEvidence.status,'verified');assert.ok(report.raidEvidence.raids.every(r=>r.ended));
 const moves=Object.values(snapshot.ledger.entries).reduce((n,e)=>n+BigInt(e.n)/BigInt(e.d),0n);
 assert.equal(1500n+moves,BigInt(snapshot.ledger.balance.n)/BigInt(snapshot.ledger.balance.d));
 const summary=readNativeCase(dir.pathname.replace(/^\/([A-Za-z]:)/,'$1'));
 assert.equal(summary.daily.length,7);assert.ok(summary.idleFraction>.25);
 assert.equal(report.policy.shieldEnabled,strategy==='no-walls');
 if(strategy==='no-shield')assert.ok(report.raidEvidence.raids.every(r=>r.shieldContacts===0));
 audits.push({strategy,gitHead:source.gitHead,snapshotValid:true,ledgerReconciled:true,observer:report.raidEvidence.status,completedNights:7,money:summary.money,living:summary.living,idleFraction:summary.idleFraction,shieldEnabled:report.policy.shieldEnabled});
}
writeFileSync(new URL('audit.json',import.meta.url),JSON.stringify({identicalSourceHashes:true,audits,scope:'Native seven-night controls; different decisions can alter RNG and agricultural pressure. Neither policy passes activity acceptance. No extrapolation to100/180, GPU or visual acceptance.'},null,2)+'\n');
console.log(JSON.stringify(audits));
