import test from 'node:test';
import assert from 'node:assert/strict';
import {auditJournalPrefix} from '../tools/audit-native-campaign-journal-prefix.mjs';

function row(day=1,opening=100){
 return {day,money:opening+7,living:1,destroyed:0,finance:{opening,closing:opening+7,net:7,reconciliationDifference:0,
  income:10,refunds:0,wages:3,seeds:0,walls:0,centers:0,villages:0,repairs:0,otherCredits:0,otherDebits:0,
  entries:[{id:`income-${day}`,coins:10,category:'income'},{id:`wage-${day}`,coins:-3,category:'wages'}]}};
}
const capture=rows=>rows.map(JSON.stringify).join('\n')+'\n';
test('captures a complete accounting prefix and excludes a concurrent unfinished append',()=>{
 const result=auditJournalPrefix(capture([row(),row(2,107)])+'{"day":3');
 assert.equal(result.capturedRows,2);assert.equal(result.transactions,4);assert.equal(result.closing,114);
 assert.equal(result.totals.income,'20');assert.equal(result.ignoredIncompleteTail,8);
 assert.equal(result.provesCampaignCompletion,false);assert.equal(result.provesPhysicalDeliveries,false);
});
test('rejects duplicate IDs across days, broken balances and incorrect subtotals',()=>{
 for(const mutate of [r=>r[1].finance.entries[0].id='income-1',r=>r[1].finance.opening=100,r=>r[1].finance.wages=4,r=>r[1].finance.net=6,r=>r[1].money=113]){
  const rows=[row(),row(2,107)];mutate(rows);assert.throws(()=>auditJournalPrefix(capture(rows)));
 }
});
test('rejects unsafe currency, wrong signs, unknown categories and discontinuous days',()=>{
 for(const mutate of [r=>r.finance.entries[0].coins=Number.MAX_SAFE_INTEGER+1,r=>r.finance.entries[1].coins=3,r=>r.finance.entries[1].category='invented',r=>r.day=2]){
  const r=row();mutate(r);assert.throws(()=>auditJournalPrefix(capture([r])));
 }
 assert.throws(()=>auditJournalPrefix('{"day":1'));
});
