// An incapacitated worker can move again after physical recovery. Preserve the
// original pose choice while keeping physical and recovery transitions on their
// dedicated paths. This predicate never affects authoritative movement.
export function isWorkerIncapacitatedPresentation(worker){
 return worker?.status==='incapacitated'&&worker.incapacitated===true&&!worker.recovery&&!(worker.fallRemaining>0)&&!(worker.recoveryExitRemaining>0);
}
