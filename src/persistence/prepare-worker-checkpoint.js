import {deserialize,validateSnapshot} from './snapshots.js';
import {confirmedStateSaveAvailable,deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateNativeAuthorityCheckpoint} from '../simulation/native-authority-checkpoint.js';
import {validateRaidWaitBindings} from '../simulation/raid-wait-handoff.js';
import {nativeEncounterCheckpointActors} from '../simulation/native-encounter-checkpoint.js';
import {validateRefugeReturnState} from '../world/native-refuge-return.js';

// This runs next to the storage transaction when an IndexedDB Worker owns
// persistence. It is also used by the compatibility path on the main thread.
export function prepareWorkerCheckpoint(result,{slotId,policy,savedAt}){
 if(!result||!Number.isSafeInteger(result.sequence)||result.sequence<0||typeof result.saveAvailable!=='boolean'||typeof result.snapshot!=='string')throw TypeError('Invalid worker checkpoint');
 const physical=!result.saveAvailable&&policy.physics&&typeof result.physicsCheckpoint==='string'?result.physicsCheckpoint:null;
 if(!result.saveAvailable&&!physical)return {saved:false,reason:'physics-active',sequence:result.sequence};
 const checkpoint=policy.nativeAuthority?validateNativeAuthorityCheckpoint(result.nativeAuthorityCheckpoint):null;
 const encounterHome=checkpoint?.encounter?.version===2;
 const state=physical||encounterHome?deserializeConfirmedState(result.snapshot):deserialize(result.snapshot);
 if(state.slotId!==slotId)throw Error('Worker checkpoint slot mismatch');
 if(encounterHome){
  const worker=state.workers[0];
  if(worker?.nativeRouteAdmission!=='native-home')throw Error('Saved encounter Home has no acquired source');
  delete worker.nativeRouteAdmission;
  validateSnapshot(state);
 }
 if(checkpoint?.encounter)nativeEncounterCheckpointActors(state,checkpoint.encounter);
 if(checkpoint?.refugeReturn)validateRefugeReturnState(state,checkpoint.refugeReturn);
 if(physical){if(state.pauses.includes('campaign-cinematic'))return {saved:false,reason:'physics-active',sequence:result.sequence};state.workerPhysicsCheckpoint=physical;}
 else if(!confirmedStateSaveAvailable(state))throw Error('Worker checkpoint is not restorable');
 validateRaidWaitBindings(state,result.raidWaitBindings);
 state.workerRaidWaitBindings=structuredClone(result.raidWaitBindings);
 if(checkpoint)state.workerNativeAuthorityCheckpoint=structuredClone(checkpoint);
 state.savedAt=savedAt;return {saved:true,sequence:result.sequence,elapsed:state.elapsed,state};
}
