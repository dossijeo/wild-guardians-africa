import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [protectedPath,controlPath,output]=process.argv.slice(2);assert(protectedPath&&controlPath&&output&&!existsSync(output));
const hash=b=>createHash('sha256').update(b).digest('hex'),reports=[protectedPath,controlPath].map(p=>JSON.parse(readFileSync(p)));
assert.deepEqual(reports[0].sourceHashes,reports[1].sourceHashes);
for(const r of reports){
 assert.equal(r.status,'observed-native-paid-repair');assert.equal(r.reconciliationDifference,0);assert.equal(r.day,2);assert.equal(r.time,300);assert.equal(r.result,null);
 assert.equal(r.requestCharged,false);assert.equal(r.repeatedCommandRejected,true);assert.equal(r.reload.pendingRepair,true);
 assert.equal(r.payments.length,1);assert.equal(r.repairs.length,1);
 assert.equal(r.payments[0].coins,-r.expectedCost);assert.equal(r.repairs[0].repair.paymentId,r.payments[0].id);
 assert.equal(r.repairs[0].repair.paidCoins,r.expectedCost);assert.equal(r.repairs[0].repair.previousHp,r.requestedTarget.hp);
 assert.equal(r.finalTarget.hp,r.requestedTarget.maxHp);assert.equal(r.finalTarget.status,'intact');
 const t=r.requestedTarget;assert.equal(r.expectedCost,Math.ceil(t.cost*(t.maxHp-t.hp)/t.maxHp));
 assert.equal(r.entries.reduce((n,e)=>n+e.coins,0),r.closing-r.opening);assert.equal(r.entries.find(e=>e.id==='repair-day-hire').coins,-30);
 assert.equal(hash(readFileSync(r.input)),r.inputSha256);
}
const rows=reports.map((r,i)=>({defense:i===0?'paid-perimeter':'native-wall-removal',income:r.income,wages:30,repairCoins:r.expectedCost,net:r.closing-r.opening,opening:r.opening,closing:r.closing,repairPendingAtReload:true}));
const result={status:'verified-native-paid-repair-pair',inputs:[protectedPath,controlPath],reportHashes:[protectedPath,controlPath].map(p=>hash(readFileSync(p))),sameEngineSources:true,rows,
 observedDay2NetDifference:rows[0].net-rows[1].net,
 scope:'Second-day native ledger reconciliation and one physical repair after the retained first-night comparison. Same wages and no new crops or magic. Fewer surviving crops in the no-wall case are actual prior damage. No extrapolation to wall payback, larger hordes or campaign survival; cash levels retain genuine wall-removal refunds.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
