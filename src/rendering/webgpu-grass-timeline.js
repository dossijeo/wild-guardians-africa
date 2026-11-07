// Presentation-only barrier for terrain and occupancy. Unknown terrain work
// never releases the barrier until its confirmed sequence has been supplied.
export function createGrassTimelineCoordinator({owner,initialSequence=0,initiallySuspended=true,maxPending=1024}={}){
 if(typeof owner?.suspend!=='function'||typeof owner?.resume!=='function'||!Number.isSafeInteger(initialSequence)||initialSequence<0||typeof initiallySuspended!=='boolean'||!Number.isSafeInteger(maxPending)||maxPending<1)throw TypeError('Invalid grass timeline coordinator');
 let closed=false,dirty=initiallySuspended,recovering=false,confirmedSequence=initialSequence,requiredSequence=initialSequence;const unassociated=new Set();
 const validate=sequence=>{if(!Number.isSafeInteger(sequence)||sequence<0)throw TypeError('Invalid grass timeline sequence');};
 const changed=keys=>keys==null||['structures','villages','plants','culture'].some(key=>keys.has(key));
 function invalidate(){if(closed)return false;if(!dirty)owner.suspend();dirty=true;return true;}
 function flush(){if(closed||recovering||!dirty||unassociated.size>0||requiredSequence>confirmedSequence)return false;owner.resume();dirty=false;return true;}
 return {
  terrainChanged(){if(closed||recovering)return null;if(!invalidate())return null;if(unassociated.size>=maxPending)throw Error('Grass timeline pending capacity exceeded');const token=Object.freeze({});unassociated.add(token);return token;},
  terrainApplied(sequence,token){if(closed)return false;validate(sequence);if(!dirty||!unassociated.delete(token))return false;requiredSequence=Math.max(requiredSequence,sequence);return flush();},
  cancel(token){return unassociated.delete(token);},
  confirmed(sequence,keys){if(closed)return false;validate(sequence);if(sequence<confirmedSequence)throw Error('Grass confirmation regressed');confirmedSequence=sequence;if(changed(keys))invalidate();return flush();},
  historicalChanged(sequence,keys){if(closed)return;validate(sequence);if(changed(keys)){invalidate();requiredSequence=Math.max(requiredSequence,sequence);}},
  beginRecovery(){if(closed||recovering)throw Error('Grass recovery unavailable');recovering=true;invalidate();unassociated.clear();},
  finishRecovery(sequence){if(closed||!recovering)throw Error('Grass recovery unavailable');validate(sequence);if(sequence<confirmedSequence)throw Error('Grass recovery confirmation regressed');owner.resume();confirmedSequence=sequence;requiredSequence=sequence;unassociated.clear();dirty=false;recovering=false;},
  status:()=>({closed,dirty,recovering,confirmedSequence,requiredSequence,unassociated:unassociated.size}),
  dispose(){closed=true;unassociated.clear();}
 };
}

// Match the logical terrain revision, independently from the graphical
// coordinator's publication epoch and revision. Only a newer visible owner
// may supersede an earlier identity for the same chunk.
export function createGrassTerrainMatcher({barrier}={}){
 if(typeof barrier?.terrainChanged!=='function'||typeof barrier?.terrainApplied!=='function'||typeof barrier?.cancel!=='function')throw TypeError('Invalid grass terrain matcher');
 const pending=new Map();
 const valid=(key,identity)=>typeof key==='string'&&/^-?\d+,-?\d+$/.test(key)&&identity&&typeof identity.epoch==='string'&&identity.epoch&&Number.isSafeInteger(identity.revision)&&identity.revision>0;
 const equal=(a,b)=>a.epoch===b.epoch&&a.revision===b.revision;
 return {
  published(key,identity){if(!valid(key,identity))throw TypeError('Invalid logical terrain identity');const old=pending.get(key);if(old&&equal(old.identity,identity))return old.token;const token=barrier.terrainChanged();if(token===null)return null;if(old)barrier.cancel(old.token);pending.set(key,{identity:{epoch:identity.epoch,revision:identity.revision},token});return token;},
  applied(key,identity,sequence){if(!valid(key,identity)||!Number.isSafeInteger(sequence)||sequence<0)throw TypeError('Invalid logical terrain boundary');const item=pending.get(key);if(!item||!equal(item.identity,identity))return false;pending.delete(key);barrier.terrainApplied(sequence,item.token);return true;},
  forget(key){const item=pending.get(key);if(!item)return false;pending.delete(key);barrier.cancel(item.token);return true;},
  clear(){for(const item of pending.values())barrier.cancel(item.token);pending.clear();},
  status:()=>({pending:pending.size})
 };
}
