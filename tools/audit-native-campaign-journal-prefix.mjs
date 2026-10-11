// Read-only accounting check of captured completed rows, including a live run.
// This does not verify delivery observers, raids, survival or human activity.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const credits=new Set(['income','refunds','otherCredits']);
const categories=['income','refunds','wages','seeds','walls','centers','villages','repairs','otherCredits','otherDebits'];
const integer=value=>{assert(Number.isSafeInteger(value),'Coins must be safe integers');return BigInt(value);};

export function auditJournalPrefix(captured){
 const end=captured.lastIndexOf('\n');
 assert(end>=0,'No completed newline-terminated row');
 const prefix=captured.slice(0,end+1);
 const rows=prefix.trim().split(/\r?\n/).map(JSON.parse);
 const ids=new Set(),totals=Object.fromEntries(categories.map(key=>[key,0n]));
 for(const [index,row] of rows.entries()){
  assert.equal(row.day,index+1,'Nonconsecutive day');
  const f=row.finance;
  assert.equal(f.reconciliationDifference,0,'Recorded reconciliation failed');
  if(index)assert.equal(f.opening,rows[index-1].finance.closing,'Broken daily balance chain');
  const subtotals=Object.fromEntries(categories.map(key=>[key,0n]));
  let delta=0n;
  for(const e of f.entries){
   assert.equal(typeof e.id,'string');assert(e.id.length>0);
   assert(!ids.has(e.id),'Repeated transaction ID');ids.add(e.id);
   assert(Object.hasOwn(subtotals,e.category),'Unknown category');
   const coins=integer(e.coins);
   assert(credits.has(e.category)?coins>0n:coins<=0n,'Wrong transaction sign');
   delta+=coins;subtotals[e.category]+=coins<0n?-coins:coins;
  }
  assert.equal(integer(f.opening)+delta,integer(f.closing),'Unreconciled journal');
  assert.equal(integer(row.money),integer(f.closing),'Displayed money mismatch');
  assert.equal(integer(f.net),delta,'Net mismatch');
  for(const key of categories){assert.equal(integer(f[key]),subtotals[key],`${key} subtotal mismatch`);totals[key]+=subtotals[key];}
 }
 return {
  scope:'captured-completed-row-accounting-only',
  provesCampaignCompletion:false,provesPhysicalDeliveries:false,provesHumanActivity:false,
  prefixSha256:createHash('sha256').update(prefix).digest('hex'),
  capturedRows:rows.length,ignoredIncompleteTail:captured.length-end-1,
  transactions:ids.size,opening:rows[0].finance.opening,closing:rows.at(-1).finance.closing,
  totals:Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,value.toString()])),
  days:rows.map(row=>({day:row.day,money:row.money,living:row.living,destroyed:row.destroyed,income:row.finance.income,wages:row.finance.wages,seeds:row.finance.seeds,walls:row.finance.walls,repairs:row.finance.repairs})),
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [directory,output]=process.argv.slice(2);
 assert(directory&&output,'Pass campaign directory and fresh output path');
 const root=resolve(directory);
 const captured=readFileSync(join(root,'days.jsonl'),'utf8');
 const receiptBytes=readFileSync(join(root,'receipt.json'),'utf8');
 const sourceBytes=readFileSync(join(root,'source.json'),'utf8');
 const result={...auditJournalPrefix(captured),observedAt:new Date().toISOString(),directory:root,
  receiptStatus:JSON.parse(receiptBytes).status,
  receiptSha256:createHash('sha256').update(receiptBytes).digest('hex'),
  sourceManifestSha256:createHash('sha256').update(sourceBytes).digest('hex')};
 writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({capturedRows:result.capturedRows,transactions:result.transactions,closing:result.closing,scope:result.scope}));
}
