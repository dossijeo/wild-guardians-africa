import {prepareWorkerCheckpoint} from './prepare-worker-checkpoint.js';

export function workerCheckpointPolicy(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['physics','nativeAuthority'].includes(key)||typeof value[key]!=='boolean'))throw TypeError('Invalid worker checkpoint policy');
 return Object.freeze({physics:value.physics===true,nativeAuthority:value.nativeAuthority===true});
}

// Snapshot requests enter the simulation queue immediately. Repository writes
// remain ordered even when storage is asynchronous or an earlier write fails.
export function createWorkerSaveCoordinator({runtime,repository,slotId,now=()=>Date.now(),checkpointPolicy=null,experimentalPhysics=false,experimentalNativeAuthority=false,workerPersistence=false}){
 if(typeof runtime?.submit!=='function'||typeof repository?.save!=='function'||typeof slotId!=='string'||!slotId||typeof now!=='function')throw TypeError('Invalid worker save coordinator');
 if(checkpointPolicy!==null&&(experimentalPhysics||experimentalNativeAuthority))throw TypeError('Conflicting worker checkpoint policy');
 if(typeof workerPersistence!=='boolean'||workerPersistence&&typeof repository.saveWorkerCheckpoint!=='function')throw TypeError('Invalid worker persistence');
 const policy=workerCheckpointPolicy(checkpointPolicy??{physics:experimentalPhysics,nativeAuthority:experimentalNativeAuthority});
 let tail=Promise.resolve();
 function request(){
  let checkpoint;
  try{checkpoint=Promise.resolve(runtime.submit({kind:'snapshot',...(policy.physics?{physicsCheckpoint:'encoded'}:{}),...(policy.nativeAuthority?{nativeAuthorityCheckpoint:true}:{})})).then(value=>({value}),error=>({error}));}
  catch(error){checkpoint=Promise.resolve({error});}
  const operation=tail.then(async()=>{
   const outcome=await checkpoint;if(outcome.error)throw outcome.error;
   const result=outcome.value;
   if(workerPersistence)return repository.saveWorkerCheckpoint(result,{slotId,policy,savedAt:now()});
   const prepared=prepareWorkerCheckpoint(result,{slotId,policy,savedAt:now()});if(!prepared.saved)return prepared;
   await repository.save(prepared.state);
   return {saved:true,sequence:prepared.sequence,elapsed:prepared.elapsed};
  });
  tail=operation.catch(()=>{});return operation;
 }
 return {request};
}
