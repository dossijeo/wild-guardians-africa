import test from 'node:test';
import assert from 'node:assert/strict';
import {auditNativeLiveJournal} from '../tools/audit-native-live-journal.mjs';
const row=()=>({day:1,before:100,money:81,living:2,staff:1,planted:1,delivered:1,destroyed:0,finance:{opening:100,closing:81,income:11,refunds:0,otherCredits:0,wages:30,seeds:0,walls:0,centers:0,villages:0,repairs:0,otherDebits:0,net:-19,reconciliationDifference:0,entries:[{id:'deliver:crate-1',coins:11,category:'income'},{id:'hire-1',coins:-30,category:'wages'}]}});
const journal=r=>JSON.stringify(r)+'\n';
test('completed rows reconcile while an unfinished append remains explicitly unverified',()=>{
 const result=auditNativeLiveJournal(journal(row())+'{"day":2');
 assert.equal(result.completeDailyRows,1);assert.equal(result.ignoredUnterminatedTail,true);
 assert.equal(result.daily[0].net,-19);assert.match(result.scope,/Does not prove final/);
});
test('a complete final line without newline is not mistaken for a verified append',()=>{
 assert.equal(auditNativeLiveJournal(JSON.stringify(row())).completeDailyRows,0);
});
test('synthetic income, duplicate ledger IDs, wrong signs and mismatched subtotals fail',()=>{
 for(const change of [r=>r.finance.entries[0].id='fake-income',r=>r.finance.entries[1].id=r.finance.entries[0].id,r=>r.finance.entries[1].coins=30,r=>r.finance.income=12]){
  const r=row();change(r);assert.throws(()=>auditNativeLiveJournal(journal(r)));
 }
});
test('daily continuity and exact cash reconciliation are checked independently',()=>{
 const r=row();r.finance.closing=82;r.money=82;assert.throws(()=>auditNativeLiveJournal(journal(r)));
 const second=row();second.day=2;second.finance.entries[0].id='deliver:crate-2';second.finance.entries[1].id='hire-2';
 assert.throws(()=>auditNativeLiveJournal(journal(row())+journal(second)));
});
