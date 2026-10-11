// Opt-in QA experiment: allow early productive reinvestment while
// retaining a complete crew renewal target at the end of the working day.
import {createQ10LabourPolicy} from './native-q10-labour-policy.mjs';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
import {numberOf} from '../src/simulation/money.js';
export const Q11_SETTINGS=Object.freeze({rampStartSeconds:140,daySeconds:300});
export function q11PlantingReserve(time,fullRenewal){
 if(!Number.isFinite(time)||time<0||!Number.isSafeInteger(fullRenewal)||fullRenewal<0)throw Error('Invalid Q11 reserve input');
 const fraction=Math.max(0,Math.min(1,(time-Q11_SETTINGS.rampStartSeconds)/(Q11_SETTINGS.daySeconds-Q11_SETTINGS.rampStartSeconds)));
 return Math.max(HIRING_RESERVE,Math.ceil(fullRenewal*fraction));
}
export function createQ11LabourPolicy(options={}){
 const base=createQ10LabourPolicy(options);
 return {...base,
  plantingReserve:s=>q11PlantingReserve(s.time,base.reserve()),
  workingCapital:s=>({...base.workingCapital(s),plantingReserve:q11PlantingReserve(s.time,base.reserve())}),
  canSpend(s,cost,{pendingRepair=0}={}){
   if(!Number.isSafeInteger(cost)||cost<0||!Number.isSafeInteger(pendingRepair)||pendingRepair<0)throw Error('Invalid Q11 planting budget');
   return numberOf(s.ledger.balance)>=q11PlantingReserve(s.time,base.reserve())+pendingRepair+cost;
  },
  report:()=>({...base.report(),plantingReserveSettings:Q11_SETTINGS,plantingReservePolicy:'early native minimum, linear full renewal target by shift end; opt-in Q11'})};
}
