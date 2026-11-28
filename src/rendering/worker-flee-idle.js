// workerPose uses Idle rather than Run while a non-physical fleeing worker has
// running explicitly false. This changes only presentation, never mobility.
export function isWorkerFleeIdle(worker){
 return worker?.status==='fleeing'&&worker.running===false&&!worker.gateWaiting&&!worker.incapacitated&&!worker.recovery&&!(worker.fallRemaining>0)&&!(worker.recoveryExitRemaining>0);
}
