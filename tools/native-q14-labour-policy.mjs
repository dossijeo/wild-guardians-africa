// Opt-in QA allocation: stop discretionary planting from starving a measured hire.
// No grants, worker/task changes, plant quota or assumed future income.
import {createQ9LabourPolicy} from './native-q9-labour-policy.mjs';
import {numberOf} from '../src/simulation/money.js';
export function createQ14LabourPolicy(options={}){
 const base=createQ9LabourPolicy(options);let reservation=null;const decisions=[];
 const clearIfExpired=s=>{if(reservation&&(reservation.day!==s.day||s.time>=180||s.raid||s.result))reservation=null;};
 const reserved=()=>Math.max(base.reserve(),reservation?.labourCoins??0);
 return {...base,
  reserve:reserved,
  canSpend(s,cost,{pendingRepair=0}={}){
   if(!Number.isSafeInteger(cost)||cost<0||!Number.isSafeInteger(pendingRepair)||pendingRepair<0)throw Error('Invalid Q14 integer budget');
   clearIfExpired(s);return numberOf(s.ledger.balance)>=reserved()+pendingRepair+cost;
  },
  dawn(s,options={}){reservation=null;return base.dawn(s,options);},
  additional(s,options={}){
   clearIfExpired(s);const plan=base.additional(s,options);if(!plan)return null;
   reservation=null;
   if(plan.reason==='cash reserved for full renewal'&&plan.centerId&&Number.isSafeInteger(plan.cost)&&Number.isSafeInteger(plan.recoveryReserve)){
    reservation={day:s.day,centerId:plan.centerId,labourCoins:plan.cost+plan.recoveryReserve};
    decisions.push({day:s.day,time:s.time,centerId:plan.centerId,cash:plan.cash,required:plan.required,labourCoins:reservation.labourCoins});
   }
   return {...plan,plannedHireReserve:reserved(),plantingHold:!!reservation};
  },
  hired(s,count,options={}){base.hired(s,count,options);reservation=null;},
  report:()=>({...base.report(),plannedHireBudget:{reservation:reservation?{...reservation}:null,decisions:structuredClone(decisions),
   scope:'Player cash allocation after real service measurements; not a paid contract, action credit or throughput forecast.'}})
 };
}
