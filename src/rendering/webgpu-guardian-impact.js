import {GUARDIAN_ATTACK_TIMING} from '../simulation/guardian-timing.js';

// Validate the visible target before starting the guardian's provisional gesture.
// The simulation still decides whether the attack is accepted.
export function beginWebGpuGuardianImpact(guardian,roster,command,beforeBegin=null,deferImpact=null){
 if(beforeBegin!==null&&typeof beforeBegin!=='function')throw TypeError('Invalid impact boundary');
 if(deferImpact!==null&&typeof deferImpact!=='function')throw TypeError('Invalid impact deferral');
 const eligible=()=>typeof guardian?.begin==='function'&&roster?.canBeginImpact(command)===true&&
  (typeof guardian?.canBegin!=='function'||guardian.canBegin(command)===true);
 if(!eligible())return false;
 // Suspending may finish and commit the current presentation boundary, so
 // check the authoritative target and gesture again after that transition.
 beforeBegin?.();
 if(!eligible())return false;
 const startedAt=performance.now();if(!guardian?.begin(command))return false;
 if(deferImpact){
  let started=false;
  const install=()=>{if(typeof guardian.status==='function'&&guardian.status().active?.id!==command.id)return;
   // A hidden tab or scheduling stall can outlive the first contact. Starting
   // the fall at an advanced age would visibly jump; wait for Rapier instead.
   if(performance.now()-startedAt>=GUARDIAN_ATTACK_TIMING.impact*1000)return;
   started=roster.canBeginImpact(command)&&roster.beginImpact(command,{startedAt});if(!started)guardian.resolve(command.id,false);};
  try{return deferImpact(`attack:${command.id}`,install)===true||started;}catch(error){guardian.resolve(command.id,false);throw error;}
 }
 if(roster.beginImpact(command))return true;
 guardian.resolve(command.id,false);
 return false;
}
