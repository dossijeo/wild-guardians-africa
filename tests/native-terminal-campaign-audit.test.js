// Synthetic parser fixtures only; these tests are not campaign acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
function run(change=()=>{}){
 const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'wild-guardians-audit-test-'));
 assert.equal(dirname(resolve(dir)),parent);
 const finance={opening:100,closing:105,income:10,refunds:0,wages:5,seeds:0,walls:0,centers:0,villages:0,repairs:0,otherCredits:0,otherDebits:0,reconciliationDifference:0,entries:[{id:'deliver:crate-1',coins:10,category:'income'},{id:'hire-1',coins:-5,category:'wages'}]};
 const fixture={receipt:{status:'observed-horizon',result:null,completedNights:1},source:{sourceHashes:{fixture:'synthetic-unit-data'}},rows:[{day:1,money:105,living:9,centerHp:[600],result:null,finance}],report:{result:null,completedNights:1,money:105,seed:1,strategy:'good',counts:{CropDestroyed:1},nativeEvidence:{status:'verified',coverageLost:false,deliveries:[{paymentId:'deliver:crate-1',coins:10}]},raidEvidence:{status:'verified',coverageLost:false,issues:[],raids:[{day:1,ended:true,exposedLivingAtSpawn:10,cropsDestroyed:1,species:{warthog:{initialHitBudget:1,observedBudgetConsumed:1,unconsumedOrUnobservedBudget:0}}}]},entryTransport:{preparer:{failed:0},workerFailure:null}}};
 try{
  change(fixture);
  for(const k of ['receipt','source','report'])writeFileSync(join(dir,k+'.json'),JSON.stringify(fixture[k]));
  writeFileSync(join(dir,'days.jsonl'),fixture.rows.map(d=>JSON.stringify(d)).join('\n')+'\n');
  return spawnSync(process.execPath,['tools/audit-native-terminal-campaigns.mjs',dir],{encoding:'utf8'});
 }finally{
  // Only this invocation's newly created direct temporary child is removed.
  assert.equal(dirname(resolve(dir)),parent);assert.ok(dir.startsWith(join(parent,'wild-guardians-audit-test-')));
  rmSync(dir,{recursive:true});
 }
}
test('accepts consistent fixture and rejects subtotal corruption despite unchanged saldo',()=>{
 assert.equal(run().status,0);
 const r=run(f=>{f.rows[0].finance.wages=4;});assert.notEqual(r.status,0);assert.match(r.stderr,/Incorrect wages subtotal/);
});
test('rejects missing physical-delivery observation, duplicate entry and incorrect credit sign',()=>{
 assert.notEqual(run(f=>{f.report.nativeEvidence.deliveries=[];}).status,0);
 assert.notEqual(run(f=>{f.rows[0].finance.entries[1].id='deliver:crate-1';}).status,0);
 assert.notEqual(run(f=>{f.rows[0].finance.entries[1].category='refunds';}).status,0);
});
test('rejects transport failures and incomplete native strike accounting',()=>{
 assert.notEqual(run(f=>{f.report.entryTransport.preparer.failed=1;}).status,0);
 assert.notEqual(run(f=>{f.report.raidEvidence.raids[0].species.warthog.observedBudgetConsumed=0;}).status,0);
});
test('accepts terminal defeat row without inventing an extra completed night',()=>{
 assert.equal(run(f=>{f.receipt.status='observed-native-defeat';f.receipt.result='defeat';f.receipt.completedNights=0;f.report.result='defeat';f.report.completedNights=0;f.rows[0].result='defeat';}).status,0);
 assert.notEqual(run(f=>{f.receipt.status='incomplete-harness-error';}).status,0);
});
