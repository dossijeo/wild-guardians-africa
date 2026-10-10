// QA player policy. Reads native tasks/contracts and uses ordinary paid hires.
// Six queued tasks is a heuristic trigger, not a production capacity claim.
import {activeCrops} from '../src/simulation/active-crops.js';
import {operational} from '../src/simulation/rules.js';
import {hiringCost,PROFILES,contractExpired} from '../src/simulation/workforce.js';
import {numberOf} from '../src/simulation/money.js';
export function q4Workload(s){
 const centers=new Map(s.structures.filter(operational).map(c=>[c.id,{centerId:c.id,pending:0,active:0,busy:0,living:0}]));
 const plants=new Map(activeCrops(s.plants).map(p=>[p.id,p]));
 const structures=new Map(s.structures.map(c=>[c.id,c]));
 for(const p of plants.values())if(centers.has(p.centerId))centers.get(p.centerId).living++;
 const active=new Map();
 for(const w of s.workers){const profile=PROFILES.find(p=>p.id===w.profile);if(!profile||contractExpired(w,s)||s.time>=profile.end||w.incapacitated||w.recovering||!centers.has(w.centerId))continue;active.set(w.id,w);const c=centers.get(w.centerId);c.active++;if(w.taskId||w.crateId)c.busy++;}
 for(const t of s.tasks){const c=centers.get(t.centerId);if(!c||t.blocked||t.workerId&&active.has(t.workerId))continue;
  const valid=t.kind==='repair'?structures.has(t.targetId)&&structures.get(t.targetId).hp<structures.get(t.targetId).maxHp:plants.has(t.targetId);
  if(valid)c.pending++;
 }
 return [...centers.values()];
}
export function q4RecoveryReserve(s,wage){return Math.max(1,q4Workload(s).filter(c=>c.living||c.pending).length)*wage;}
const budgetUnits=(pendingRepair,seedCost)=>{if(!Number.isSafeInteger(pendingRepair)||pendingRepair<0||!Number.isSafeInteger(seedCost)||seedCost<=0)throw Error('Invalid Q4 integer recovery budget');};
export function q4DawnPlan(s,{profile='olderFemale',pendingRepair=0,seedCost=5}={}){
 budgetUnits(pendingRepair,seedCost);const p=PROFILES.find(p=>p.id===profile);if(!p)throw Error('Unknown Q4 labour profile');
 const desired=Math.max(1,q4Workload(s).filter(c=>c.living||c.pending).length),cash=numberOf(s.ledger.balance);
 // Preserve legal recovery budget if possible. If not, disclose that no safe
 // contract fits; never mint funds or override native dawnMinimum/GameOver.
 const affordable=Math.max(0,Math.floor((cash-pendingRepair-seedCost)/(2*p.wage)));
 const staff=Math.min(desired,affordable);
 return {staff,cost:staff*p.wage,cash,desired,pendingRepair,seedCost,recoveryReserve:staff*p.wage,reason:staff?'minimum productive centre coverage':'no safe funded contract'};
}
export function q4AdditionalPlan(s,{profile='olderFemale',pendingRepair=0,seedCost=5,backlogPerWorker=6}={}){
 budgetUnits(pendingRepair,seedCost);const p=PROFILES.find(p=>p.id===profile);if(!p)throw Error('Unknown Q4 labour profile');
 if(!Number.isSafeInteger(backlogPerWorker)||backlogPerWorker<1)throw Error('Invalid Q4 backlog heuristic');
 const workload=q4Workload(s),cash=numberOf(s.ledger.balance),recoveryReserve=q4RecoveryReserve(s,p.wage);
 if(s.raid||s.result||s.hiringPaidDay!==s.day||s.time>=p.end-20)return {count:0,reason:'native contract unavailable',cash,workload};
 const c=workload.filter(c=>c.pending>0&&(!c.active||c.busy===c.active&&c.pending>=backlogPerWorker)).sort((a,b)=>b.pending-a.pending||a.centerId.localeCompare(b.centerId))[0];
 if(!c)return {count:0,reason:'no saturated native backlog',cash,workload,recoveryReserve};
 const cost=hiringCost({[profile]:1},{time:s.time}),required=cost+recoveryReserve+pendingRepair+seedCost;
 return {count:cash>=required?1:0,centerId:c.centerId,cost,cash,required,recoveryReserve,pendingRepair,seedCost,workload,reason:cash>=required?'funded native backlog':'cash reserved for recovery/repair'};
}
