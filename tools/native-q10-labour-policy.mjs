// Opt-in QA candidate: anticipate paid replanting after an empty harvest.
// No native rules, purchases, wage settlement or income are altered here.
import {createQ9LabourPolicy,Q9_SETTINGS} from './native-q9-labour-policy.mjs';
import {q4Workload} from './native-q4-labour-policy.mjs';
import {PROFILES} from '../src/simulation/workforce.js';
import {repairCost} from '../src/simulation/game.js';

export function q10EmptyFieldPlan(s,plan,wage){
 const workload=q4Workload(s);
 if(s.day===1||!workload.length||workload.some(c=>c.living))return plan;
 for(const value of [plan.cash,plan.pendingRepair,plan.seedCost,wage])if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid Q10 integer planning input');
 if(!wage||!plan.seedCost)throw Error('Invalid Q10 zero budget unit');
 let quoted=0n;
 for(const t of s.structures)if(['wall','center'].includes(t.kind)&&t.hp<t.maxHp){
  const q=repairCost(t),n=BigInt(q.n),d=BigInt(q.d);
  if(n<0n)throw Error('Negative native repair quote');
  quoted+=(n+d-1n)/d;
 }
 const cash=BigInt(plan.cash),pending=BigInt(plan.pendingRepair);
 const repairs=quoted>pending?quoted:pending; // Existing tasks overlap quoted damage.
 const salary=BigInt(wage),seed=BigInt(plan.seedCost);
 const safe=(cash-repairs-seed)/(2n*salary);
 if(cash<repairs+seed+2n*salary||safe<1n)return {...plan,replanting:{mode:'insufficient funded recovery capital',quotedRepairs:String(repairs),forecastOnly:true}};
 // Smallest crew whose workload heuristic covers the cash-funded seed forecast.
 // Subsequent real deliveries can finance more plants; this is never a quota.
 const divisor=2n*salary+BigInt(Q9_SETTINGS.workUnitsPerRenewedWorker)*seed;
 const target=(cash-repairs+divisor-1n)/divisor;
 const staff=Number(target<safe?target:safe),cost=staff*wage,afterPayment=plan.cash-cost;
 const forecast=(cash-repairs-2n*BigInt(cost))/seed;
 return {...plan,staff,cost,desired:Number(target),afterPayment,recoveryReserve:cost,
  workingCapitalShortfall:Math.max(0,cost-afterPayment),
  purchaseBudgetShortfall:Number(cash<repairs+2n*BigInt(cost)+seed?repairs+2n*BigInt(cost)+seed-cash:0n),
  risk:false,capacityReduced:BigInt(staff)<target,priorDesired:plan.desired,priorStaff:plan.staff,downsized:staff<plan.staff,
  replanting:{mode:'funded empty-field replanting forecast',quotedRepairs:String(repairs),forecastCropPurchases:String(forecast),workUnitsPerWorker:Q9_SETTINGS.workUnitsPerRenewedWorker,forecastOnly:true},
  reason:'anticipate native replanting after empty harvest'};
}

export function createQ10LabourPolicy({profile='olderFemale'}={}){
 const base=createQ9LabourPolicy({profile}),worker=PROFILES.find(p=>p.id===profile);
 if(!worker)throw Error('Unknown Q10 profile');
 return {...base,dawn(s,options={}){return q10EmptyFieldPlan(s,base.dawn(s,options),worker.wage);},
  report:()=>({...base.report(),replantingPolicy:'funded empty-field forecast; Q9 otherwise; opt-in Q10 campaign policy'})};
}
