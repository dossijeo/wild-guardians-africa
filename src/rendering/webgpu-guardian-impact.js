// Validate the visible target before starting the guardian's provisional gesture.
// The simulation still decides whether the attack is accepted.
export function beginWebGpuGuardianImpact(guardian,roster,command,beforeBegin=null){
 if(beforeBegin!==null&&typeof beforeBegin!=='function')throw TypeError('Invalid impact boundary');
 const eligible=()=>typeof guardian?.begin==='function'&&roster?.canBeginImpact(command)===true&&
  (typeof guardian?.canBegin!=='function'||guardian.canBegin(command)===true);
 if(!eligible())return false;
 // Suspending may finish and commit the current presentation boundary, so
 // check the authoritative target and gesture again after that transition.
 beforeBegin?.();
 if(!eligible()||!guardian?.begin(command))return false;
 if(roster.beginImpact(command))return true;
 guardian.resolve(command.id,false);
 return false;
}
