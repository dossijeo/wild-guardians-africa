// Animal certificates use an array; worker certificates use named check lists.
// Diagnostic metadata must never throw or convert a failed proof to success.
export function nativeProofFailureDetails(proof){
 return {valid:proof.valid,reason:proof.reason,workerId:proof.workerId??null,
  targetId:proof.targetId??proof.incrementalFailure?.services?.targetId??(Array.isArray(proof.checks)?proof.checks.at(-1)?.services?.targetId:null)??null};
}
