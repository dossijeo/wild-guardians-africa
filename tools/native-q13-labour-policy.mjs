// QA player decisions only: fund payroll renewal before relying on new income.
import {createQ12LabourPolicy} from './native-q12-labour-policy.mjs';
import {PROFILES} from '../src/simulation/workforce.js';
export function q13FundedRenewalPlan(plan,wage){
 for(const v of [plan.cash,plan.pendingRepair,plan.seedCost,plan.staff,wage])if(!Number.isSafeInteger(v)||v<0)throw Error('Invalid Q13 planning integer');
 if(!wage||!plan.seedCost)throw Error('Invalid Q13 budget unit');
 const cash=BigInt(plan.cash),repair=BigInt(plan.pendingRepair),seed=BigInt(plan.seedCost),salary=BigInt(wage);
 const free=cash-repair-seed;
 const safe=free>0n?free/(2n*salary):0n;
 if(safe>=BigInt(plan.staff))return plan;
 const staff=safe>0n?Number(safe):cash>=salary?1:0;
 const cost=staff*wage,afterPayment=plan.cash-cost;
 return {...plan,staff,cost,afterPayment,recoveryReserve:cost,
  selection:plan.profile?{[plan.profile]:staff}:plan.selection,
  workingCapitalShortfall:Math.max(0,cost-afterPayment),
  purchaseBudgetShortfall:Math.max(0,cost+plan.pendingRepair+plan.seedCost-afterPayment),
  risk:safe===0n,capacityReduced:staff<plan.staff,priorFundedStaff:plan.staff,
  fundingScreen:{safeStaff:String(safe),emergency:safe===0n,forecastIncomeCoins:0},
  reason:safe===0n?'payable one-worker recovery; renewal unfunded':'fund full crew renewal and seed before dawn hire'};
}
export function createQ13LabourPolicy({profile='olderFemale'}={}){
 const base=createQ12LabourPolicy({profile});
 return {...base,dawn(s,options={}){
  const plan=base.dawn(s,options),p=PROFILES.find(p=>p.id===plan.profile);
  return q13FundedRenewalPlan(plan,p.wage);
 },report:()=>({...base.report(),fundedRenewal:'Q13: current wage + next wage + pending paid repair quote + one seed; no forecast income. Native emergency one-worker contract when full renewal is not fundable. Experimental QA policy, not production mechanics or validated balance.'})};
}
