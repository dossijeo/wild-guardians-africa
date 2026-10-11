// Read-only settlement audit: attribute magic income to delivery, not cast day.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

export function auditNativeMagicDeliveries(report){
 assert.equal(report.nativeEvidence.status,'verified');
 assert.equal(report.nativeEvidence.coverageLost,false);
 const delivered=new Map(),payments=new Map(),days=new Map();
 for(const e of report.nativeEvidence.deliveries){
  assert(!delivered.has(e.crateId),'Duplicate delivered crate');
  delivered.set(e.crateId,e);
 }
 for(const day of report.daily){
  assert.equal(day.finance.reconciliationDifference,0);
  assert(!days.has(day.day),'Duplicate day');
  let income=0n;
  for(const e of day.finance.entries){
   assert(!payments.has(e.id),'Duplicate ledger payment');
   payments.set(e.id,{...e,day:day.day});
   if(e.category==='income')income+=BigInt(e.coins);
  }
  assert.equal(income,BigInt(day.finance.income));
  days.set(day.day,{day:day.day,totalIncome:income,additionalIncome:0n,benefitedDeliveries:0});
 }
 const seen=new Set();let additional=0n;
 for(const bonus of report.agriculturalMagic.deliveredBonuses){
  assert(!seen.has(bonus.crateId),'Duplicate magic settlement');seen.add(bonus.crateId);
  const delivery=delivered.get(bonus.crateId);assert(delivery,'Bonus without native delivery');
  assert.equal(bonus.id,delivery.eventId,'Bonus and delivery events differ');
  const payment=payments.get(delivery.paymentId);assert(payment,'Delivery without ledger payment');
  assert.equal(payment.id,'deliver:'+bonus.crateId);
  assert.equal(payment.category,'income');assert.equal(payment.day,delivery.day);
  assert.equal(BigInt(payment.coins),BigInt(delivery.coins));
  const n=BigInt(bonus.income.n),d=BigInt(bonus.income.d);
  assert(d>0n&&n>=0n&&n%d===0n,'Paid bonus must be a nonnegative integer');
  const coins=n/d;assert(coins<=BigInt(payment.coins),'Bonus exceeds delivered income');
  const day=days.get(delivery.day);assert(day,'Delivery outside recorded daily horizon');
  day.additionalIncome+=coins;if(coins)day.benefitedDeliveries++;
  additional+=coins;
 }
 assert(Number.isSafeInteger(report.agriculturalMagic.additionalDeliveredIncome));
 assert.equal(additional,BigInt(report.agriculturalMagic.additionalDeliveredIncome));
 const daily=[...days.values()].map(d=>({day:d.day,totalIncome:String(d.totalIncome),additionalIncome:String(d.additionalIncome),baseIncome:String(d.totalIncome-d.additionalIncome),benefitedDeliveries:d.benefitedDeliveries}));
 return {status:'verified',additionalDeliveredIncome:String(additional),daily,
  scope:'Already included in native ledger income, never an extra credit. Attributed to actual delivery day, including effects committed earlier. Does not establish causal growth profitability or human action time.'};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [directory,output]=process.argv.slice(2);
 if(!directory||!output||existsSync(output))throw Error('Terminal campaign directory and fresh output required');
 const receipt=JSON.parse(readFileSync(join(directory,'receipt.json'),'utf8'));
 assert(['observed-horizon','observed-native-defeat'].includes(receipt.status));
 const result=auditNativeMagicDeliveries(JSON.parse(readFileSync(join(directory,'report.json'),'utf8')));
 writeFileSync(output,JSON.stringify({directory,...result},null,2)+'\n');
 console.log(JSON.stringify({directory,status:result.status,additionalDeliveredIncome:result.additionalDeliveredIncome}));
}
