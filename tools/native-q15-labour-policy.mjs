// Opt-in QA renewal decisions only; preserve cash for actual minimal recovery.
import {createQ14LabourPolicy} from './native-q14-labour-policy.mjs';
import {PROFILES} from '../src/simulation/workforce.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
export const Q15_SETTINGS=Object.freeze({minimumRecoveryHireCoins:HIRING_RESERVE});
export function liquidityRenewal(plan,wage){
 for(const key of ['cash','staff','desired','pendingRepair','seedCost'])assertInteger(plan[key],key,key==='seedCost'?1:0);
 assertInteger(wage,'wage',1);
 const retainedCash=HIRING_RESERVE+plan.seedCost+plan.pendingRepair;
 assertInteger(retainedCash,'retained cash',1);
 // A sole affordable worker remains allowed in genuine emergencies. The
 // policy neither grants recovery cash nor converts an unfunded reserve
 // into a paid contract. Native hiring still validates/payrolls the choice.
 const safe=Math.max(0,Math.floor((plan.cash-retainedCash)/wage));
 const affordable=Math.floor(plan.cash/wage);
 const staff=Math.min(plan.staff,safe||(affordable>0?1:0)),cost=staff*wage,afterPayment=plan.cash-cost;
 const recoveryReserve=cost,workingCapitalShortfall=Math.max(0,recoveryReserve-afterPayment);
 return {...plan,staff,cost,afterPayment,recoveryReserve,workingCapitalShortfall,
  purchaseBudgetShortfall:Math.max(0,recoveryReserve+plan.pendingRepair+plan.seedCost-afterPayment),
  risk:workingCapitalShortfall>0,capacityReduced:staff<plan.desired,priorLiquidityStaff:plan.staff,
  liquidityFloor:retainedCash,liquidityFloorShortfall:Math.max(0,retainedCash-afterPayment),
  liquidityDownsized:staff<plan.staff,
  reason:staff<plan.staff?'retain actual cash for minimum recovery':plan.reason};
}
function assertInteger(n,name,min){if(!Number.isSafeInteger(n)||n<min)throw Error('Invalid Q15 '+name);}
export function createQ15LabourPolicy({profile='olderFemale'}={}){
 const base=createQ14LabourPolicy({profile}),worker=PROFILES.find(p=>p.id===profile);if(!worker)throw Error('Unknown Q15 profile');
 const renewals=[];
 return {...base,dawn(s,options={}){
  const plan=base.dawn(s,options);if(s.day===1)return plan;
  const adjusted=liquidityRenewal(plan,worker.wage);
  renewals.push({day:s.day,time:s.time,cash:plan.cash,priorStaff:plan.staff,staff:adjusted.staff,
   paidCostIfConfirmed:adjusted.cost,retainedCashIfConfirmed:adjusted.afterPayment,
   liquidityFloor:adjusted.liquidityFloor,liquidityFloorShortfall:adjusted.liquidityFloorShortfall});
  return adjusted;
 },report:()=>({...base.report(),liquidityRenewal:{settings:Q15_SETTINGS,decisions:structuredClone(renewals),
  scope:'Unpaid native-command recommendations from actual cash. No forecast income, free hires, crop quota or action credit.'}})};
}
