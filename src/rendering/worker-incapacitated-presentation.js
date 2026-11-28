import {RECOVERY_EXIT_SECONDS} from '../simulation/worker-recovery.js';

// An incapacitated worker can move again after physical recovery. Preserve the
// original pose choice while keeping physical and recovery transitions on their
// dedicated paths. This predicate never affects authoritative movement.
export function isWorkerIncapacitatedPresentation(worker){
 return worker?.status==='incapacitated'&&worker.incapacitated===true&&!worker.recovery&&!(worker.fallRemaining>0)&&!(worker.recoveryExitRemaining>0);
}
// At the completed GetUp boundary the ordinary exit blend is entirely Idle(0).
export function isWorkerWaitingWoundedHome(worker){
 return worker?.nativeRouteAdmission==='pending-home-resources'&&worker.status==='incapacitated'&&
  worker.incapacitated===true&&worker.hits===2&&worker.recoveryExitRemaining===RECOVERY_EXIT_SECONDS&&
  !worker.recovery&&!worker.fallRemaining&&worker.running===false&&worker.gateWaiting===false;
}
