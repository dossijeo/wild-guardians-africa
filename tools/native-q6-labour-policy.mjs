// Q6 only changes dawn funding. All service gates remain the frozen Q5 policy.
import {createQ5LabourPolicy} from './native-q5-labour-policy.mjs';
import {q4Workload} from './native-q4-labour-policy.mjs';
import {PROFILES} from '../src/simulation/workforce.js';
import {numberOf} from '../src/simulation/money.js';
export function createQ6LabourPolicy({profile='olderFemale'}={}){
 const base=createQ5LabourPolicy({profile}),p=PROFILES.find(p=>p.id===profile);
 const budget=(pendingRepair,seedCost)=>{if(!Number.isSafeInteger(pendingRepair)||pendingRepair<0||!Number.isSafeInteger(seedCost)||seedCost<=0)throw Error('Invalid Q6 integer budget');};
 const workingCapital=s=>({cash:numberOf(s.ledger.balance),recoveryReserve:base.reserve(),workingCapitalShortfall:Math.max(0,base.reserve()-numberOf(s.ledger.balance))});
 return {...base,workingCapital,
  canSpend(s,cost,{pendingRepair=0}={}){if(!Number.isSafeInteger(cost)||cost<0||!Number.isSafeInteger(pendingRepair)||pendingRepair<0)throw Error('Invalid Q6 spend budget');return numberOf(s.ledger.balance)>=base.reserve()+pendingRepair+cost;},
  dawn(s,{pendingRepair=0,seedCost=5}={}){
   budget(pendingRepair,seedCost);const cash=numberOf(s.ledger.balance),load=q4Workload(s),desired=load.some(c=>c.living||c.pending)?base.selectedStaff():1;
   const staff=Math.min(desired,Math.max(0,Math.floor(cash/p.wage))),cost=staff*p.wage,afterPayment=cash-cost,recoveryReserve=cost;
   const workingCapitalShortfall=Math.max(0,recoveryReserve-afterPayment);
   return {staff,cost,cash,desired,afterPayment,recoveryReserve,pendingRepair,seedCost,workingCapitalShortfall,purchaseBudgetShortfall:Math.max(0,recoveryReserve+pendingRepair+seedCost-afterPayment),risk:workingCapitalShortfall>0,capacityReduced:staff<desired,reason:staff<desired?'current salary cash-limited continuity':workingCapitalShortfall?'payable crew; working capital awaiting settled income':'payable funded crew continuity'};
  },
  additional(s,options={}){
   const plan=base.additional(s,options);if(!plan)return null;
   const capital=workingCapital(s);
   // The candidate renewal reserve belongs to the enlarged crew. Expose the
   // current crew separately; working-capital telemetry must not overwrite it.
   return {...capital,...plan,currentRecoveryReserve:capital.recoveryReserve,...(capital.workingCapitalShortfall?{count:0,reason:'working capital awaiting settled income'}:{})};
  }
 };
}
