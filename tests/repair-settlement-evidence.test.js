import test from 'node:test';
import assert from 'node:assert/strict';
import {createRepairSettlementEvidence} from '../tools/repair-settlement-evidence.mjs';
const state=()=>({slotId:'qa',seed:'712',biome:'sabana',culture:'mapungubwe',elapsed:0,events:[{id:'opening',type:'DayStarted'}],ledger:{entries:{}}});
function repair(s,id='task-1',cost=2){
 s.elapsed++;s.ledger.entries[`repair:${id}`]={n:String(-cost),d:'1'};
 s.events.push({id:`event-${id}`,type:'RepairApplied',workerId:'worker',targetId:'wall',
  repair:{taskId:id,paymentId:`repair:${id}`,paidCoins:cost,previousHp:287.5,previousStatus:'intact',restoredHp:300,maxHp:300},
  presentation:{elapsed:s.elapsed,x:5,z:7,yaw:0}});
}
test('observer deduplicates retained events and survives state reload without changing inputs',()=>{
 let s=state();const observer=createRepairSettlementEvidence(s);repair(s);const original=JSON.stringify(s);
 observer.observe(s);observer.observe(s);s=JSON.parse(original);observer.observe(s);
 assert.equal(JSON.stringify(s),original);
 const report=observer.report(s);assert.equal(report.status,'verified');assert.equal(report.completedRepairs,1);
 assert.equal(report.paidCoins,'2');assert.equal(report.restoredHp,12.5);
 report.receipts[0].paidCoins=999;assert.equal(observer.report(s).paidCoins,'2');
});
test('lost event window remains incomplete even when surviving receipts reconcile',()=>{
 const s=state(),observer=createRepairSettlementEvidence(s);repair(s,'lost');s.events=[];repair(s,'visible');observer.observe(s);
 const report=observer.report(s);assert.equal(report.status,'incomplete');assert.equal(report.coverageLost,true);
 assert.deepEqual(report.unobservedPayments,['repair:lost']);assert.equal(report.completedRepairs,1);
});
test('pre-existing payments are excluded and unobserved new payments cannot pass',()=>{
 const s=state();repair(s,'old');const observer=createRepairSettlementEvidence(s);
 repair(s,'new');assert.equal(observer.report(s).status,'incomplete');observer.observe(s);
 const report=observer.report(s);assert.equal(report.status,'verified');assert.deepEqual(report.baselinePayments,['repair:old']);assert.equal(report.completedRepairs,1);
});
test('ledger mismatch, repeated settlement and missing metadata are rejected',()=>{
 for(const corrupt of ['cost','denominator','missing']){
  const s=state(),observer=createRepairSettlementEvidence(s);repair(s);
  if(corrupt==='cost')s.ledger.entries['repair:task-1'].n='-1';
  if(corrupt==='denominator')s.ledger.entries['repair:task-1'].d='2';
  if(corrupt==='missing')delete s.events.at(-1).repair;
  assert.throws(()=>observer.observe(s));
 }
 const s=state(),observer=createRepairSettlementEvidence(s);repair(s);observer.observe(s);
 s.events.push({...s.events.at(-1),id:'different-completion'});assert.throws(()=>observer.observe(s),/two completed repairs/);
});
test('cross-game collection and a rewind are rejected',()=>{
 const s=state(),observer=createRepairSettlementEvidence(s);repair(s);observer.observe(s);
 assert.throws(()=>observer.observe({...s,seed:'713'}),/different games/);
 assert.throws(()=>observer.observe({...s,elapsed:0}),/rewind/);
});
