// Read-only early checks. A live receipt is never economic acceptance or defeat.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const credits=['income','refunds','otherCredits'];
const debits=['wages','seeds','walls','centers','villages','repairs','otherDebits'];
export function auditNativeLiveJournal(text){
 const lines=text.split('\n'),pendingTail=lines.pop();
 const rows=lines.filter(line=>line.trim()).map(JSON.parse),ids=new Set(),daily=[];
 let previous=null;
 for(const r of rows){
  const f=r.finance;assert.ok(f,'Missing native finance journal');
  for(const key of ['opening','closing',...credits,...debits]){
   assert.ok(Number.isSafeInteger(f[key]),'Noninteger native amount: '+key);
   if(key!=='opening'&&key!=='closing')assert.ok(f[key]>=0,'Negative category total');
  }
  assert.equal(r.before,f.opening);assert.equal(r.money,f.closing);
  if(previous){assert.equal(r.day,previous.day+1);assert.equal(f.opening,previous.money);}
  const categoryTotals=Object.fromEntries([...credits,...debits].map(key=>[key,0]));
  for(const e of f.entries){
   assert.ok(e.id&&!ids.has(e.id),'Duplicate native ledger movement: '+e.id);ids.add(e.id);
   assert.ok(Number.isSafeInteger(e.coins));assert.ok(Object.hasOwn(categoryTotals,e.category));
   assert.ok(credits.includes(e.category)?e.coins>=0:e.coins<=0,'Wrong ledger sign');
   if(e.category==='income')assert.ok(e.id.startsWith('deliver:'),'Income must identify native crate delivery');
   categoryTotals[e.category]+=Math.abs(e.coins);
  }
  for(const key of Object.keys(categoryTotals))assert.equal(categoryTotals[key],f[key],'Category mismatch: '+key);
  const net=credits.reduce((sum,key)=>sum+f[key],0)-debits.reduce((sum,key)=>sum+f[key],0);
  assert.equal(f.opening+net,f.closing,'Unreconciled native daily balance');
  assert.equal(f.reconciliationDifference,0);assert.equal(f.net,net);
  daily.push({day:r.day,money:r.money,living:r.living,staff:r.staff,planted:r.planted,delivered:r.delivered,destroyed:r.destroyed,income:f.income,wages:f.wages,seeds:f.seeds,walls:f.walls,repairs:f.repairs,net,
   diagnostics:{noDeliveredIncome:f.income===0,noNewPlanting:r.planted===0,cashBelowNextWageReserve:Number.isSafeInteger(r.nextLabourReserve)?r.money<r.nextLabourReserve:null,scope:'Uses the journal declared next-wage reserve; diagnostic only, never a terminal verdict'}});
  previous=r;
 }
 return {completeDailyRows:rows.length,ignoredUnterminatedTail:!!pendingTail.trim(),ledgerRowsChecked:ids.size,daily,scope:'Completed daily journal accounting only. Does not prove final native result, delivery geometry, route validity, performance, or human activity.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.ok(process.argv[2],'Pass native days.jsonl');
 console.log(JSON.stringify(auditNativeLiveJournal(readFileSync(process.argv[2],'utf8')),null,2));
}
