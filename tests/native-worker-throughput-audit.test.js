import test from 'node:test';
import assert from 'node:assert/strict';
import {auditNativeWorkerThroughput} from '../tools/audit-native-worker-throughput.mjs';
function fixture(){return {policy:{profile:'olderFemale'},daily:[{day:1,delivered:1,finance:{wages:45,income:11,net:-34,seeds:0,repairs:0,entries:[{id:'daily',category:'wages',coins:-30},{id:'extra',category:'wages',coins:-15},{id:'deliver:c1',category:'income',coins:11}]}}],labourHistory:[{id:'daily',day:1,time:0,kind:'daily',staff:1,paidCoins:30},{id:'extra',day:1,time:150,kind:'additional',count:1,paidCoins:15}],labourObservations:[{day:1,time:10,workload:[{active:1,busy:1,pending:5}]},{day:1,time:150,workload:[{active:2,busy:1,pending:3}]}],nativeEvidence:{deliveries:[{day:1,crateId:'c1',paymentId:'deliver:c1',workerId:'w1',coins:'11'}]}};}
test('native prorated contracts and delivered cash reconcile without crediting capacity as activity',()=>{
 const p=auditNativeWorkerThroughput(fixture()),d=p.daily[0];
 assert.equal(d.paidCoins,45);assert.equal(d.paidContractSeconds,450);assert.equal(d.deliveredCoins,11);
 assert.equal(d.observedWorkload.busyFraction,2/3);assert.match(p.scope,/not measured working time/);
});
test('invalid wages, duplicate delivery, missing payment and impossible busy counts fail',()=>{
 for(const mutate of [p=>p.labourHistory[1].paidCoins=19,p=>p.nativeEvidence.deliveries.push({...p.nativeEvidence.deliveries[0]}),p=>p.daily[0].finance.entries.pop(),p=>p.labourObservations[0].workload[0].busy=2]){
  const p=fixture();mutate(p);assert.throws(()=>auditNativeWorkerThroughput(p));
 }
});
test('declared original profile defines native wages and shift length',()=>{
 const p=fixture();p.policy.profile='youngFemale';p.labourHistory[0].paidCoins=40;p.labourHistory[1].paidCoins=20;
 p.daily[0].finance.entries[0].coins=-40;p.daily[0].finance.entries[1].coins=-20;p.daily[0].finance.wages=60;
 const r=auditNativeWorkerThroughput(p);assert.equal(r.originalWage,40);assert.equal(r.originalShiftEnd,300);
});
