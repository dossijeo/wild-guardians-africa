// Read-only audit usable before campaign termination. No outcome inference.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function auditNativeDailyLedger(rows){
 assert.ok(Array.isArray(rows)&&rows.length,'Complete daily rows required');
 const ids=new Set(),incomeIds=new Map(),totals={};
 const integer=(n,label)=>{assert.ok(Number.isSafeInteger(n),`Unsafe or fractional ${label}`);return BigInt(n);};
 for(const [index,d] of rows.entries()){
  assert.equal(d.day,index+1);assert.equal(d.finance.reconciliationDifference,0);
  if(index)assert.equal(d.finance.opening,rows[index-1].finance.closing);
  let delta=0n;
  const categories=Object.fromEntries(['income','refunds','wages','seeds','walls','centers','villages','repairs','otherCredits','otherDebits'].map(k=>[k,0n]));
  for(const e of d.finance.entries){
   assert.ok(typeof e.id==='string'&&e.id.length&&!ids.has(e.id),'Missing or duplicate paid economic entry');ids.add(e.id);
   const coins=integer(e.coins,'journal amount');delta+=coins;
   assert.ok(Object.hasOwn(categories,e.category),'Unknown journal category');
   const credit=['income','refunds','otherCredits'].includes(e.category);
   assert.ok(credit?coins>0n:coins<=0n,'Journal category has incorrect economic sign');
   categories[e.category]+=coins<0n?-coins:coins;
   if(e.category==='income')incomeIds.set(e.id,coins);
  }
  assert.equal(integer(d.finance.opening,'opening balance')+delta,integer(d.finance.closing,'closing balance'));
  assert.equal(integer(d.finance.net,'net'),delta);
  assert.equal(d.money,d.finance.closing);
  for(const [key,value] of Object.entries(categories)){
   assert.equal(integer(d.finance[key],key),value,`Incorrect ${key} subtotal`);
   totals[key]=(totals[key]??0)+d.finance[key];assert.ok(Number.isSafeInteger(totals[key]),'Unsafe accumulated total');
  }
 }
 return {incomeIds,totals,completedRows:rows.length,opening:rows[0].finance.opening,closing:rows.at(-1).finance.closing};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,...extra]=process.argv.slice(2);assert.ok(input&&!extra.length,'Use DAYS.jsonl');
 const text=readFileSync(input,'utf8').trim();
 const {incomeIds,...facts}=auditNativeDailyLedger(text.split(/\r?\n/).map(JSON.parse));
 console.log(JSON.stringify({...facts,confirmedIncomeEntries:incomeIds.size,status:'daily-ledger-verified',scope:'Only completed daily journals: no terminal result, physical-delivery audit, PID liveness or balance acceptance is inferred.'},null,2));
}
