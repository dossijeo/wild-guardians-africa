// The gate controller holds these actors in place. Match workerPose's Idle
// override only for the non-physical, non-carrying locomotion states.
export function isWorkerGateIdle(worker){
 return worker?.gateWaiting===true&&['walking','arriving','returning','fleeing','idle','waiting'].includes(worker.status)&&!worker.running&&!worker.incapacitated&&!worker.recovery&&!(worker.fallRemaining>0)&&!(worker.recoveryExitRemaining>0);
}
