import {deserialize} from './snapshots.js';
import {confirmedStateSaveAvailable,deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateNativeAuthorityCheckpoint} from '../simulation/native-authority-checkpoint.js';
import {validateRaidWaitBindings} from '../simulation/raid-wait-handoff.js';

// Snapshot requests enter the simulation queue immediately. Repository writes
// remain ordered even when storage is asynchronous or an earlier write fails.
export function createWorkerSaveCoordinator({runtime,repository,slotId,now=()=>Date.now(),experimentalPhysics=false,experimentalNativeAuthority=false}){
 if(typeof runtime?.submit!=='function'||typeof repository?.save!=='function'||typeof slotId!=='string'||!slotId||typeof now!=='function')throw TypeError('Invalid worker save coordinator');
 let tail=Promise.resolve();
 function request(){
  let checkpoint;
  try{checkpoint=Promise.resolve(runtime.submit({kind:'snapshot',...(experimentalPhysics?{physicsCheckpoint:'encoded'}:{}),...(experimentalNativeAuthority?{nativeAuthorityCheckpoint:true}:{})})).then(value=>({value}),error=>({error}));}
  catch(error){checkpoint=Promise.resolve({error});}
  const operation=tail.then(async()=>{
   const outcome=await checkpoint;if(outcome.error)throw outcome.error;
   const result=outcome.value;
   if(!result||!Number.isSafeInteger(result.sequence)||result.sequence<0||typeof result.saveAvailable!=='boolean'||typeof result.snapshot!=='string')throw TypeError('Invalid worker checkpoint');
   const physical=!result.saveAvailable&&experimentalPhysics&&typeof result.physicsCheckpoint==='string'?result.physicsCheckpoint:null;
   if(!result.saveAvailable&&!physical)return {saved:false,reason:'physics-active',sequence:result.sequence};
   const state=physical?deserializeConfirmedState(result.snapshot):deserialize(result.snapshot);
   if(state.slotId!==slotId)throw Error('Worker checkpoint slot mismatch');
   if(physical){if(state.pauses.includes('campaign-cinematic'))return {saved:false,reason:'physics-active',sequence:result.sequence};state.workerPhysicsCheckpoint=physical;}
   else if(!confirmedStateSaveAvailable(state))throw Error('Worker checkpoint is not restorable');
   validateRaidWaitBindings(state,result.raidWaitBindings);
   state.workerRaidWaitBindings=structuredClone(result.raidWaitBindings);
   if(experimentalNativeAuthority){validateNativeAuthorityCheckpoint(result.nativeAuthorityCheckpoint);state.workerNativeAuthorityCheckpoint=structuredClone(result.nativeAuthorityCheckpoint);}
   state.savedAt=now();
   await repository.save(state);
   return {saved:true,sequence:result.sequence,elapsed:state.elapsed};
  });
  tail=operation.catch(()=>{});return operation;
 }
 return {request};
}
