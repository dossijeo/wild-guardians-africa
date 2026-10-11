import test from 'node:test';
import assert from 'node:assert/strict';
import {auditNativeDailyLedger} from '../tools/audit-native-daily-ledger.mjs';
function fixture(){return [1,2].map(day=>({day,money:100+day*5,finance:{opening:100+(day-1)*5,closing:100+day*5,net:5,income:10,refunds:0,wages:5,seeds:0,walls:0,centers:0,villages:0,repairs:0,otherCredits:0,otherDebits:0,reconciliationDifference:0,entries:[{id:'deliver:crate-'+day,coins:10,category:'income'},{id:'hire-'+day,coins:-5,category:'wages'}]}}));}
test('daily audit preserves input and reconciles entries across complete days',()=>{
 const rows=fixture(),before=structuredClone(rows),facts=auditNativeDailyLedger(rows);
 assert.deepEqual(rows,before);assert.equal(facts.completedRows,2);assert.equal(facts.opening,100);assert.equal(facts.closing,110);assert.equal(facts.incomeIds.size,2);assert.equal(facts.totals.income,20);assert.equal(facts.totals.wages,10);
});
test('rejects repeated payment, broken continuity, incorrect category totals and unsafe amounts',()=>{
 for(const mutate of [
  r=>r[1].finance.entries[0].id=r[0].finance.entries[0].id,
  r=>r[1].finance.opening++,
  r=>r[1].finance.seeds=1,
  r=>r[1].finance.net=6,
  r=>r[1].finance.entries[0].coins=.5,
  r=>r[1].finance.entries[0].coins=Number.MAX_SAFE_INTEGER+1,
  r=>r[1].day=3,
 ]){const rows=fixture();mutate(rows);assert.throws(()=>auditNativeDailyLedger(rows));}
 assert.throws(()=>auditNativeDailyLedger([]));
});
