// Read-only audit of archived native campaigns; never changes a campaign.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const dirs=process.argv.slice(2);
assert.ok(dirs.length,'Pass terminal campaign directories');
let referenceHashes;
const cases=dirs.map(dir=>{
 const root=resolve(dir),read=name=>JSON.parse(readFileSync(join(root,name),'utf8'));
 const receipt=read('receipt.json'),report=read('report.json'),source=read('source.json');
 assert.equal(receipt.status,'observed-horizon','Only completed observed horizons are accepted by this audit');
 assert.equal(receipt.result,null);assert.equal(report.result,null);
 const rows=readFileSync(join(root,'days.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
 assert.equal(rows.length,receipt.completedNights);assert.equal(report.completedNights,receipt.completedNights);
 assert.equal(report.nativeEvidence.status,'verified');assert.equal(report.nativeEvidence.coverageLost,false);
 assert.equal(report.raidEvidence.status,'verified');assert.equal(report.raidEvidence.coverageLost,false);
 assert.deepEqual(report.raidEvidence.issues,[]);
 assert.equal(report.entryTransport.preparer.failed,0);assert.equal(report.entryTransport.workerFailure,null);
 referenceHashes??=source.sourceHashes;assert.deepEqual(source.sourceHashes,referenceHashes,'Compared source hashes must match');
 const ids=new Set(),incomeIds=new Map(),totals={};
 for(const [index,d] of rows.entries()){
  assert.equal(d.day,index+1);assert.equal(d.finance.reconciliationDifference,0);
  if(index)assert.equal(d.finance.opening,rows[index-1].finance.closing);
  let delta=0n;
  for(const e of d.finance.entries){
   assert.ok(!ids.has(e.id),'Duplicate paid economic entry');ids.add(e.id);
   const coins=BigInt(e.coins);delta+=coins;
   if(e.category==='income'){assert.ok(coins>0n);incomeIds.set(e.id,coins);}
  }
  assert.equal(BigInt(d.finance.opening)+delta,BigInt(d.finance.closing));
  assert.equal(d.money,d.finance.closing);
  for(const key of ['income','refunds','wages','seeds','walls','centers','villages','repairs','otherCredits','otherDebits'])totals[key]=(totals[key]??0)+d.finance[key];
 }
 const delivered=new Set();
 for(const e of report.nativeEvidence.deliveries){
  assert.ok(!delivered.has(e.paymentId),'Duplicate observed crate delivery');delivered.add(e.paymentId);
  assert.equal(incomeIds.get(e.paymentId),BigInt(e.coins),'Income must match observed physical delivery');
 }
 assert.equal(delivered.size,incomeIds.size);
 assert.equal(report.money,rows.at(-1).money);
 const raids=report.raidEvidence.raids;
 assert.equal(raids.length,receipt.completedNights);
 let assigned=0,consumed=0,unused=0;
 for(const r of raids){assert.equal(r.ended,true);for(const v of Object.values(r.species)){
  assert.equal(v.initialHitBudget,v.observedBudgetConsumed+v.unconsumedOrUnobservedBudget);
  assigned+=v.initialHitBudget;consumed+=v.observedBudgetConsumed;unused+=v.unconsumedOrUnobservedBudget;
 }}
 return {directory:dir,seed:report.seed,strategy:report.strategy,completedNights:receipt.completedNights,money:report.money,living:rows.at(-1).living,centerHp:rows.at(-1).centerHp,destroyed:report.counts.CropDestroyed??0,totals,strikes:{assigned,consumed,unused},ledgerAndDeliveryMatch:true,sourceHashesMatch:true,scope:'Native fourteen-night evidence only; not hundred-night or human activity acceptance'};
});
console.log(JSON.stringify({cases},null,2));
