import test from 'node:test';
import assert from 'node:assert/strict';
import {auditNativeMagicDeliveries} from '../tools/audit-native-magic-deliveries.mjs';

const fixture=()=>({nativeEvidence:{status:'verified',coverageLost:false,deliveries:[{crateId:'c',eventId:'e',paymentId:'deliver:c',day:2,coins:'17'}]},
 agriculturalMagic:{additionalDeliveredIncome:6,deliveredBonuses:[{crateId:'c',id:'e',income:{n:'6',d:'1'}}],dailyPower:{1:{multiply:{paid:'6'}},2:{multiply:{paid:'0'}}}},
 daily:[{day:1,finance:{income:0,reconciliationDifference:0,entries:[]}},{day:2,finance:{income:17,reconciliationDifference:0,entries:[{id:'deliver:c',category:'income',coins:17}]}}]});

test('carryover bonus belongs to delivered day and is part of income, not another credit',()=>{
 const a=auditNativeMagicDeliveries(fixture());
 assert.equal(a.additionalDeliveredIncome,'6');
 assert.deepEqual(a.daily.map(x=>[x.day,x.totalIncome,x.baseIncome,x.additionalIncome]),[[1,'0','0','0'],[2,'17','11','6']]);
});
test('rejects duplicate or unmatched magic settlements',()=>{
 const duplicate=fixture();duplicate.agriculturalMagic.deliveredBonuses.push(duplicate.agriculturalMagic.deliveredBonuses[0]);
 assert.throws(()=>auditNativeMagicDeliveries(duplicate),/Duplicate magic/);
 const unmatched=fixture();unmatched.agriculturalMagic.deliveredBonuses[0].id='wrong';
 assert.throws(()=>auditNativeMagicDeliveries(unmatched),/events differ/);
 const unpaid=fixture();unpaid.daily[1].finance.entries=[];unpaid.daily[1].finance.income=0;
 assert.throws(()=>auditNativeMagicDeliveries(unpaid),/without ledger payment/);
});
test('rejects impossible bonus amounts and incorrect observed totals',()=>{
 for(const amount of [{n:'18',d:'1'},{n:'1',d:'2'},{n:'-1',d:'1'}]){
  const r=fixture();r.agriculturalMagic.deliveredBonuses[0].income=amount;
  assert.throws(()=>auditNativeMagicDeliveries(r));
 }
 const r=fixture();r.agriculturalMagic.additionalDeliveredIncome=7;
 assert.throws(()=>auditNativeMagicDeliveries(r));
});
