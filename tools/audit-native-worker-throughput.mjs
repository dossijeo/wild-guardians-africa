// Observed cashflow per paid contract capacity, never simulated future income.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PROFILES,hiringCost} from '../src/simulation/workforce.js';
export function auditNativeWorkerThroughput(report){
 const profile=PROFILES.find(p=>p.id===report.policy.profile);assert.ok(profile,'Unknown declared worker profile');
 const deliveryIds=new Set(),hireIds=new Set(),daily=[];
 for(const row of report.daily){
  const hires=report.labourHistory.filter(h=>h.day===row.day);
  let paidCoins=0,contractSeconds=0;const dayProfiles=new Set();
  for(const h of hires){
   assert.ok(h.id&&!hireIds.has(h.id),'Duplicate paid hire');hireIds.add(h.id);
   assert.ok(['daily','additional'].includes(h.kind));
   const count=h.kind==='daily'?h.staff:h.count;
   assert.ok(Number.isSafeInteger(count)&&count>0);assert.ok(Number.isFinite(h.time)&&h.time>=0);
   if(h.kind==='daily')assert.equal(h.time,0,'Daily renewal must start at dawn');
   const selection=h.selection??{[h.profile??profile.id]:count};
   assert.equal(Object.values(selection).reduce((n,v)=>n+v,0),count,'Selected profiles must cover declared contract count');
   if(h.profile!==undefined)assert.ok(Object.entries(selection).every(([id,n])=>!n||id===h.profile),'Declared profile contradicts selection');
   const expected=hiringCost(selection,h.kind==='daily'?{}:{time:h.time});
   assert.equal(h.paidCoins,expected,'Hire differs from original native wage');
   const payment=row.finance.entries.find(e=>e.id===h.id);
   assert.ok(payment&&payment.category==='wages');assert.equal(payment.coins,-expected);
   paidCoins+=expected;
   for(const [id,n] of Object.entries(selection))if(n){const p=PROFILES.find(p=>p.id===id);dayProfiles.add(id);contractSeconds+=n*(p.end-h.time);}
  }
  assert.equal(paidCoins,row.finance.wages,'All wages need declared paid contracts');
  const deliveries=report.nativeEvidence.deliveries.filter(d=>d.day===row.day),workers=new Set();let deliveredCoins=0;
  for(const d of deliveries){
   assert.ok(d.crateId&&!deliveryIds.has(d.crateId),'Duplicate delivered crate');deliveryIds.add(d.crateId);
   assert.equal(d.paymentId,'deliver:'+d.crateId);assert.ok(d.workerId);workers.add(d.workerId);
   const coins=Number(d.coins);assert.ok(Number.isSafeInteger(coins)&&coins>0);
   const payment=row.finance.entries.find(e=>e.id===d.paymentId);
   assert.ok(payment&&payment.category==='income');assert.equal(payment.coins,coins);deliveredCoins+=coins;
  }
  assert.equal(deliveredCoins,row.finance.income,'Income must reconcile to native delivery receipts');
  assert.equal(deliveries.length,row.delivered);
  const shiftEnd=dayProfiles.size?Math.max(...[...dayProfiles].map(id=>PROFILES.find(p=>p.id===id).end)):profile.end;
  const observations=report.labourObservations.filter(o=>o.day===row.day&&o.time<shiftEnd);
  let active=0,busy=0,pending=0;
  for(const o of observations)for(const c of o.workload){
   for(const value of [c.active,c.busy,c.pending])assert.ok(Number.isSafeInteger(value)&&value>=0);
   assert.ok(c.busy<=c.active);active+=c.active;busy+=c.busy;pending+=c.pending;
  }
  daily.push({day:row.day,profile:dayProfiles.size===1?[...dayProfiles][0]:dayProfiles.size?'mixed':profile.id,profiles:[...dayProfiles],paidCoins,paidContractSeconds:contractSeconds,deliveredCoins,deliveredCrates:deliveries.length,distinctDeliveringWorkers:workers.size,
   incomePerPaidWorkerSecond:contractSeconds?deliveredCoins/contractSeconds:null,
   wagesPerDeliveredCrate:deliveries.length?paidCoins/deliveries.length:null,
   actualNetCashflow:row.finance.net,seedExpenditure:row.finance.seeds,repairExpenditure:row.finance.repairs,
   observedWorkload:{samples:observations.length,summedActive:active,summedBusy:busy,summedPending:pending,busyFraction:active?busy/active:null}});
 }
 return {profile:profile.id,originalWage:profile.wage,originalShiftEnd:profile.end,daily,
  scope:'Native paid contracts and delivered cashflow only. Contract capacity is not measured working time. Busy fractions are discrete snapshots, not continuous utilization or human activity. Deliveries may originate in earlier crop/contract cycles; ratios do not prove causal worker profitability or forecast future income.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.ok(process.argv[2],'Pass native terminal report.json');
 console.log(JSON.stringify(auditNativeWorkerThroughput(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));
}
