// A baked fall owns authoritative movement just like a Rapier body. Missing
// bookkeeping cannot certify a quiet interval: the caller fails closed.
export function workerPhysicsActivity(physics){
 if(physics===null)return false;
 const manager=physics?.manager;
 if(!(manager?.entries instanceof Map)||!(manager.baked?.entries instanceof Map))throw TypeError('Invalid Worker physics activity');
 return manager.entries.size>0||manager.baked.entries.size>0;
}
