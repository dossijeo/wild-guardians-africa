import {deserialize} from './snapshots.js';
import {confirmedStateSaveAvailable,deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateNativeAuthorityCheckpoint} from '../simulation/native-authority-checkpoint.js';
import {validateRaidWaitBindings} from '../simulation/raid-wait-handoff.js';

// This runs next to the storage transaction when an IndexedDB Worker owns
// persistence. It is also used by the compatibility path on the main thread.
export function prepareWorkerCheckpoint(result,{slotId,policy,savedAt}){
 if(!result||!Number.isSafeInteger(result.sequence)||result.sequence<0||typeof result.saveAvailable!=='boolean'||typeof result.snapshot!=='string')throw TypeError('Invalid worker checkpoint');
 const physical=!result.saveAvailable&&policy.physics&&typeof result.physicsCheckpoint==='string'?result.physicsCheckpoint:null;
 if(!result.saveAvailable&&!physical)return {saved:false,reason:'physics-active',sequence:result.sequence};
 const state=physical?deserializeConfirmedState(result.snapshot):deserialize(result.snapshot);
 if(state.slotId!==slotId)throw Error('Worker checkpoint slot mismatch');
 if(physical){if(state.pauses.includes('campaign-cinematic'))return {saved:false,reason:'physics-active',sequence:result.sequence};state.workerPhysicsCheckpoint=physical;}
 else if(!confirmedStateSaveAvailable(state))throw Error('Worker checkpoint is not restorable');
 validateRaidWaitBindings(state,result.raidWaitBindings);
 state.workerRaidWaitBindings=structuredClone(result.raidWaitBindings);
 if(policy.nativeAuthority){validateNativeAuthorityCheckpoint(result.nativeAuthorityCheckpoint);state.workerNativeAuthorityCheckpoint=structuredClone(result.nativeAuthorityCheckpoint);}
 state.savedAt=savedAt;return {saved:true,sequence:result.sequence,elapsed:state.elapsed,state};
}
