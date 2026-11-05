import {deserialize} from './snapshots.js';
import {confirmedStateSaveAvailable,deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateNativeAuthorityCheckpoint} from '../simulation/native-authority-checkpoint.js';
import {validateRaidWaitBindings} from '../simulation/raid-wait-handoff.js';

export function workerCheckpointPolicy(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['physics','nativeAuthority'].includes(key)||typeof value[key]!=='boolean'))throw TypeError('Invalid worker checkpoint policy');
 return Object.freeze({physics:value.physics===true,nativeAuthority:value.nativeAuthority===true});
}

// Snapshot requests enter the simulation queue immediately. Repository writes
// remain ordered even when storage is asynchronous or an earlier write fails.
export function createWorkerSaveCoordinator({runtime,repository,slotId,now=()=>Date.now(),checkpointPolicy=null,experimentalPhysics=false,experimentalNativeAuthority=false}){
 if(typeof runtime?.submit!=='function'||typeof repository?.save!=='function'||typeof slotId!=='string'||!slotId||typeof now!=='function')throw TypeError('Invalid worker save coordinator');
 if(checkpointPolicy!==null&&(experimentalPhysics||experimentalNativeAuthority))throw TypeError('Conflicting worker checkpoint policy');
 const policy=workerCheckpointPolicy(checkpointPolicy??{physics:experimentalPhysics,nativeAuthority:experimentalNativeAuthority});
 let tail=Promise.resolve();
 function request(){
  let checkpoint;
  try{checkpoint=Promise.resolve(runtime.submit({kind:'snapshot',...(policy.physics?{physicsCheckpoint:'encoded'}:{}),...(policy.nativeAuthority?{nativeAuthorityCheckpoint:true}:{})})).then(value=>({value}),error=>({error}));}
  catch(error){checkpoint=Promise.resolve({error});}
  const operation=tail.then(async()=>{
   const outcome=await checkpoint;if(outcome.error)throw outcome.error;
   const result=outcome.value;
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
   state.savedAt=now();
   await repository.save(state);
   return {saved:true,sequence:result.sequence,elapsed:state.elapsed};
  });
  tail=operation.catch(()=>{});return operation;
 }
 return {request};
}
