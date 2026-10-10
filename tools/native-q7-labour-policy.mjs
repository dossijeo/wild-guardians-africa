// Opt-in QA player decisions only. No changes to native wages/tasks/production.
import {createQ6LabourPolicy} from './native-q6-labour-policy.mjs';
import {PROFILES} from '../src/simulation/workforce.js';
import {cropSpec} from '../src/simulation/rules.js';
import {numberOf} from '../src/simulation/money.js';
export const Q7_SETTINGS=Object.freeze({openingStaff:3,lastTrialTime:180});
export function createQ7LabourPolicy({profile='olderFemale'}={}){
 const base=createQ6LabourPolicy({profile}),p=PROFILES.find(p=>p.id===profile);
 let started=false,trial=null;const seen=new Set(),history=[];
 const observe=s=>{
  base.observe(s);
  for(const e of s.events)if(!seen.has(e.id)){
   seen.add(e.id);if(e.type!=='CrateDelivered')continue;
   const crate=s.crates.find(c=>c.id===e.targetId),payment=s.ledger.entries['deliver:'+e.targetId];
   if(!crate?.delivered||!payment||payment.d!=='1'||numberOf(payment)<=0)throw Error('Q7 requires settled native crate receipt');
   if(!trial||crate.centerId!==trial.centerId)continue;
   const income=numberOf(payment),seedCost=cropSpec(crate.species).plant_cost;
   trial.income+=income;trial.replacementMargin+=income-seedCost;trial.centerDeliveries++;
   if(trial.workerIds.includes(e.workerId)){trial.newWorkerDeliveries++;trial.firstDeliveryDelay??=s.elapsed-trial.elapsed;}
   trial.receipts.push({id:e.targetId,workerId:e.workerId,elapsed:s.elapsed,income,seedCost});
  }
 };
 return {...base,observe,
  dawn(s,options={}){
   const plan=base.dawn(s,options);if(started||s.day!==1)return plan;
   const staff=Math.min(Q7_SETTINGS.openingStaff,Math.floor(plan.cash/p.wage)),cost=staff*p.wage,afterPayment=plan.cash-cost;
   return {...plan,staff,cost,desired:Q7_SETTINGS.openingStaff,afterPayment,recoveryReserve:cost,workingCapitalShortfall:Math.max(0,cost-afterPayment),purchaseBudgetShortfall:Math.max(0,cost+plan.pendingRepair+plan.seedCost-afterPayment),risk:afterPayment<cost,capacityReduced:staff<Q7_SETTINGS.openingStaff,reason:'explicit payable three-worker startup'};
  },
  additional(s,options={}){
   observe(s);const plan=base.additional(s,options);if(!plan)return null;
   const credit=trial?{newWorkerDeliveries:trial.newWorkerDeliveries,replacementMargin:trial.replacementMargin,requiredTrialMargin:trial.paidCoins+p.wage,trialWorkerIds:[...trial.workerIds]}:null;
   if(s.time>=Q7_SETTINGS.lastTrialTime)return {...plan,count:0,trialCredit:credit,reason:'late trial postponed until dawn'};
   if(trial&&!trial.newWorkerDeliveries)return {...plan,count:0,trialCredit:credit,reason:'await last new worker native delivery'};
   if(trial&&trial.replacementMargin<trial.paidCoins+p.wage)return {...plan,count:0,trialCredit:credit,reason:'await settled replacement margin for last trial'};
   return {...plan,trialCredit:credit};
  },
  hired(s,count,options={}){
   observe(s);
   if(!options.daily){
    const {workerIds,centerId,id}=options,payment=s.ledger.entries[id];
    if(count!==1||!Array.isArray(workerIds)||workerIds.length!==1||!payment||payment.d!=='1'||numberOf(payment)>=0||!s.workers.some(w=>w.id===workerIds[0]&&w.centerId===centerId&&w.profile===profile&&w.contractDay===s.day))throw Error('Q7 trial needs new native employee and paid hire receipt');
    trial={id,day:s.day,elapsed:s.elapsed,centerId,workerIds:[...workerIds],paidCoins:-numberOf(payment),income:0,replacementMargin:0,centerDeliveries:0,newWorkerDeliveries:0,firstDeliveryDelay:null,receipts:[]};history.push(trial);
   }else{trial=null;started=true;}
   base.hired(s,count,options);
  },
  report:()=>structuredClone({settings:Q7_SETTINGS,history,scope:'Actual receipt screen, not causal marginal profit; no cash is granted from diagnostic replacement margin.'})
 };
}
