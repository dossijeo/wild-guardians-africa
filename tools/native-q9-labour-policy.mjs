// QA decisions only. Keeps Q8 startup and physical-delivery hiring gates.
import {createQ8LabourPolicy} from './native-q8-labour-policy.mjs';
import {q4Workload} from './native-q4-labour-policy.mjs';
import {Q5_SETTINGS} from './native-q5-labour-policy.mjs';
import {PROFILES} from '../src/simulation/workforce.js';
export const Q9_SETTINGS=Object.freeze({workUnitsPerRenewedWorker:Q5_SETTINGS.backlogPerWorker});
export function createQ9LabourPolicy({profile='olderFemale'}={}){
 const base=createQ8LabourPolicy({profile}),worker=PROFILES.find(p=>p.id===profile);
 return {...base,dawn(s,options={}){
  const plan=base.dawn(s,options);if(s.day===1)return plan;
  const workload=q4Workload(s);
  // Plants and queued tasks overlap: do not count both as separate workloads.
  // This is a renewal heuristic, not a cap on crops or productive capacity.
  const workloadStaff=Math.max(1,workload.reduce((n,c)=>n+Math.ceil(Math.max(c.living,c.pending)/Q9_SETTINGS.workUnitsPerRenewedWorker),0));
  const desired=Math.min(plan.desired,workloadStaff),staff=Math.min(plan.staff,desired);
  const cost=staff*worker.wage,afterPayment=plan.cash-cost,recoveryReserve=cost;
  const workingCapitalShortfall=Math.max(0,recoveryReserve-afterPayment);
  return {...plan,staff,cost,desired,afterPayment,recoveryReserve,workingCapitalShortfall,
   purchaseBudgetShortfall:Math.max(0,recoveryReserve+plan.pendingRepair+plan.seedCost-afterPayment),
   risk:workingCapitalShortfall>0,capacityReduced:staff<desired,
   priorDesired:plan.desired,workloadStaff,workload,downsized:staff<plan.staff,
   reason:staff<plan.staff?'renew smaller current native workload':plan.reason};
 },report:()=>({...base.report(),renewalSettings:Q9_SETTINGS})};
}
