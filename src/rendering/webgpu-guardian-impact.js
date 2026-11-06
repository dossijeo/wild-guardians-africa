// Validate the visible target before starting the guardian's provisional gesture.
// The simulation still decides whether the attack is accepted.
export function beginWebGpuGuardianImpact(guardian,roster,command){
 if(!roster?.canBeginImpact(command)||!guardian?.begin(command))return false;
 if(roster.beginImpact(command))return true;
 guardian.resolve(command.id,false);
 return false;
}
