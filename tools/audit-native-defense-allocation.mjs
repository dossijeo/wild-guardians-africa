// Read-only audit of actual settlement order, never a forecast or money grant.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {PROFILES} from '../src/simulation/workforce.js';
const [directory,output]=process.argv.slice(2);
if(!directory||!output||existsSync(output))throw Error('Provide terminal campaign directory and fresh output');
const r=JSON.parse(readFileSync(directory+'/report.json'));
const receipt=JSON.parse(readFileSync(directory+'/receipt.json'));
assert(['observed-horizon','observed-native-defeat'].includes(receipt.status),'Campaign must be terminal');
const mode=r.policy.defenseFunding??'contour';
assert.equal(r.defense?.funding??'contour',mode);
const integer=n=>{assert(Number.isSafeInteger(n),'Expected exact integer coins');return BigInt(n);};
const purchases=new Map();
for(const h of r.defense?.history??[])if(h.paidCost){assert(!purchases.has(h.paymentId),'Duplicate paid wall history');purchases.set(h.paymentId,h);}
const hires=new Map(r.labourHistory.map(h=>[h.id,h])),seen=new Set(),observations=[];
let payroll=0n,previous=null;
for(const day of r.daily){
 let balance=integer(day.finance.opening);
 if(previous!==null)assert.equal(balance,previous,'Daily ledger continuity');
 for(const e of day.finance.entries){
  assert(!seen.has(e.id),'Repeated settlement in daily finance');seen.add(e.id);
  const coins=integer(e.coins),hire=hires.get(e.id);
  if(hire){
   const profile=PROFILES.find(p=>p.id===(hire.profile??r.policy.profile));assert(profile);
   if(hire.kind==='daily')payroll=integer(hire.staff)*BigInt(profile.wage);
   else payroll+=integer(hire.count)*BigInt(profile.wage);
  }
  if(e.category==='walls'){
   const h=purchases.get(e.id);assert(h,'Native wall debit missing paid stroke history');
   assert.equal(-coins,integer(h.paidCost));
   const protectedCash=integer(h.protectedCash),pending=integer(h.pendingRepairCoins);
   const available=balance>protectedCash+pending?balance-protectedCash-pending:0n;
   const allowance=mode==='rolling'?available/2n:available;
   if(mode==='rolling'){
    assert(-coins<=allowance,'Paid new walls exceeded rolling allocation');
    assert(protectedCash>=payroll+5n,'Rolling wall purchase did not protect payroll and a minimum-price seed');
   }
   observations.push({day:day.day,id:e.id,cashBefore:String(balance),paidCoins:String(-coins),protectedCash:String(protectedCash),pendingRepairQuotes:String(pending),allocationCoins:String(allowance),payrollReserve:String(payroll)});
   purchases.delete(e.id);
  }
  balance+=coins;
 }
 assert.equal(balance,integer(day.finance.closing));assert.equal(balance,integer(day.money));previous=balance;
}
assert.equal(purchases.size,0,'Paid history without actual native debit');
writeFileSync(output,JSON.stringify({directory,mode,status:'verified',purchases:observations.length,observations,scope:'Actual daily native settlement order and paid wall history. Requires separate terminal, census, source and delivery audits. Does not establish survival, exact chosen-seed protection, human activity or performance.'},null,2)+'\n');
console.log(JSON.stringify({mode,status:'verified',purchases:observations.length}));
