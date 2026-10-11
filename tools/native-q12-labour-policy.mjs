// Opt-in QA player policy. Profile fallback is a real paid dawn decision.
import {createQ10LabourPolicy} from './native-q10-labour-policy.mjs';
import {PROFILES} from '../src/simulation/workforce.js';
export function createQ12LabourPolicy({profile='youngFemale'}={}){
 const preferred=PROFILES.find(p=>p.id===profile);if(!preferred)throw Error('Unknown Q12 profile');
 const fallback=PROFILES.find(p=>p.male===preferred.male&&p.wage<preferred.wage);
 const policies=new Map([preferred,...(fallback?[fallback]:[])].map(p=>[p.id,createQ10LabourPolicy({profile:p.id})]));
 let active=preferred.id;const decisions=[];
 const current=()=>policies.get(active);
 return {
  profile:()=>active,
  dawn(s,options={}){
   const primary=policies.get(preferred.id).dawn(s,options);
   let plan=primary;active=preferred.id;
   if(!primary.staff&&fallback){
    const cheaper=policies.get(fallback.id).dawn(s,options);
    if(cheaper.staff){plan=cheaper;active=fallback.id;}
   }
   const result={...plan,profile:active,selection:{[active]:plan.staff},preferredProfile:preferred.id,
    fallbackUsed:active!==preferred.id,preferredAffordableStaff:primary.staff};
   decisions.push({day:s.day,profile:active,staff:plan.staff,cost:plan.cost,cash:plan.cash,fallbackUsed:result.fallbackUsed});
   return result;
  },
  additional(s,options){const plan=current().additional(s,options);return plan?{...plan,profile:active,selection:{[active]:plan.count}}:null;},
  hired:(...args)=>current().hired(...args),
  observe:s=>{for(const p of policies.values())p.observe(s);},
  reserve:()=>current().reserve(),
  selectedStaff:()=>current().selectedStaff(),
  workingCapital:s=>current().workingCapital(s),
  canSpend:(...args)=>current().canSpend(...args),
  report:()=>({preferredProfile:preferred.id,fallbackProfile:fallback?.id??null,decisions:structuredClone(decisions),
   profiles:Object.fromEntries([...policies].map(([id,p])=>[id,p.report()])),
   scope:'Q10 funding and Q7 native delivery gates; cheaper same-sex profile only when preferred dawn contract is unaffordable. No native price or production changes; not validated economic balance.'})
 };
}
