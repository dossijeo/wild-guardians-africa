// Opt-in QA player policy; no native game state or economic overrides.
import {q4Workload} from './native-q4-labour-policy.mjs';
import {PROFILES,hiringCost} from '../src/simulation/workforce.js';
import {numberOf} from '../src/simulation/money.js';
export const Q5_SETTINGS=Object.freeze({evaluationSeconds:10,serviceWindowSeconds:30,backlogPerWorker:6,maximumClearanceSeconds:60});
export function createQ5LabourPolicy({profile='olderFemale'}={}){
 const p=PROFILES.find(p=>p.id===profile);if(!p)throw Error('Unknown Q5 profile');
 let selectedStaff=1,lastEvaluation=-Infinity,lastHire=-Infinity;
 const seen=new Set(),services=[];
 const budget=(pendingRepair,seedCost)=>{if(!Number.isSafeInteger(pendingRepair)||pendingRepair<0||!Number.isSafeInteger(seedCost)||seedCost<=0)throw Error('Invalid Q5 integer budget');};
 const observe=s=>{
  for(const e of s.events)if(!seen.has(e.id)){seen.add(e.id);if(['WaterSatisfied','CrateDelivered','RepairApplied'].includes(e.type)&&e.workerId){const w=s.workers.find(w=>w.id===e.workerId);if(w?.profile===profile)services.push({elapsed:s.elapsed,centerId:w.centerId});}}
  while(services.length&&services[0].elapsed<s.elapsed-Q5_SETTINGS.serviceWindowSeconds)services.shift();
 };
 return {
  observe,
  reserve:()=>selectedStaff*p.wage,
  selectedStaff:()=>selectedStaff,
  dawn(s,{pendingRepair=0,seedCost=5}={}){
   budget(pendingRepair,seedCost);const cash=numberOf(s.ledger.balance),load=q4Workload(s);
   const desired=load.some(c=>c.living||c.pending)?selectedStaff:1;
   const safe=Math.max(0,Math.floor((cash-pendingRepair-seedCost)/(2*p.wage)));
   const staff=Math.min(desired,safe)||(cash>=p.wage?1:0);
   return {staff,cost:staff*p.wage,cash,desired,recoveryReserve:staff*p.wage,pendingRepair,seedCost,emergency:staff>safe,reserveShortfall:Math.max(0,2*staff*p.wage+pendingRepair+seedCost-cash),capacityReduced:staff<desired,reason:staff>safe?'affordable emergency; renewal unfunded':staff<desired?'cash-limited continuity':'funded capacity continuity'};
  },
  additional(s,{pendingRepair=0,seedCost=5}={}){
   budget(pendingRepair,seedCost);observe(s);
   if(s.elapsed-lastEvaluation+1e-6<Q5_SETTINGS.evaluationSeconds)return null;
   lastEvaluation=s.elapsed;
   const cash=numberOf(s.ledger.balance),workload=q4Workload(s),base={count:0,cash,workload,recoveryReserve:selectedStaff*p.wage};
   if(s.raid||s.result||s.hiringPaidDay!==s.day||s.time>=p.end-20)return {...base,reason:'native contract unavailable'};
   const measurements=workload.map(c=>{
    const completed=services.filter(e=>e.centerId===c.centerId).length;
    const rate=completed/Q5_SETTINGS.serviceWindowSeconds;
    return {...c,completed,serviceRate:rate,backlogRatio:c.pending/Math.max(1,c.active),clearanceSeconds:rate?c.pending/rate:null};
   });base.measurements=measurements;
   const candidates=measurements.filter(c=>c.pending>0&&c.active>0&&c.busy===c.active&&c.backlogRatio>Q5_SETTINGS.backlogPerWorker&&c.completed>0&&c.clearanceSeconds>Q5_SETTINGS.maximumClearanceSeconds)
    .sort((a,b)=>b.backlogRatio-a.backlogRatio||a.centerId.localeCompare(b.centerId));
   const c=candidates[0];if(!c)return {...base,reason:'no measured service saturation'};
   if(!services.some(e=>e.elapsed>lastHire&&e.centerId===c.centerId))return {...base,reason:'await completed service after hire'};
   const cost=hiringCost({[profile]:1},{time:s.time}),recoveryReserve=(selectedStaff+1)*p.wage,required=cost+recoveryReserve+pendingRepair+seedCost;
   return {...base,count:cash>=required?1:0,centerId:c.centerId,cost,required,recoveryReserve,measurement:c,reason:cash>=required?'funded measured service saturation':'cash reserved for full renewal'};
  },
  hired(s,count,{daily=false}={}){
   if(!Number.isSafeInteger(count)||count<1)throw Error('Invalid Q5 settled hire');
   selectedStaff=daily?count:selectedStaff+count;lastHire=s.elapsed;
   if(daily){services.length=0;lastEvaluation=s.elapsed;}
  }
 };
}
