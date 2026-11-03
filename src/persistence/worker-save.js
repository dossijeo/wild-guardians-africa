import {deserialize} from './snapshots.js';
import {confirmedStateSaveAvailable} from '../simulation/confirmed-live-state.js';
import {validateRaidWaitBindings} from '../simulation/raid-wait-handoff.js';

// Snapshot requests enter the simulation queue immediately. Repository writes
// remain ordered even when storage is asynchronous or an earlier write fails.
export function createWorkerSaveCoordinator({runtime,repository,slotId,now=()=>Date.now()}){
 if(typeof runtime?.submit!=='function'||typeof repository?.save!=='function'||typeof slotId!=='string'||!slotId||typeof now!=='function')throw TypeError('Invalid worker save coordinator');
 let tail=Promise.resolve();
 function request(){
  let checkpoint;
  try{checkpoint=Promise.resolve(runtime.submit({kind:'snapshot'})).then(value=>({value}),error=>({error}));}
  catch(error){checkpoint=Promise.resolve({error});}
  const operation=tail.then(async()=>{
   const outcome=await checkpoint;if(outcome.error)throw outcome.error;
   const result=outcome.value;
   if(!result||!Number.isSafeInteger(result.sequence)||result.sequence<0||typeof result.saveAvailable!=='boolean'||typeof result.snapshot!=='string')throw TypeError('Invalid worker checkpoint');
   if(!result.saveAvailable)return {saved:false,reason:'physics-active',sequence:result.sequence};
   const state=deserialize(result.snapshot);
   if(state.slotId!==slotId)throw Error('Worker checkpoint slot mismatch');
   if(!confirmedStateSaveAvailable(state))throw Error('Worker checkpoint is not restorable');
   validateRaidWaitBindings(state,result.raidWaitBindings);
   state.workerRaidWaitBindings=structuredClone(result.raidWaitBindings);
   state.savedAt=now();
   await repository.save(state);
   return {saved:true,sequence:result.sequence,elapsed:state.elapsed};
  });
  tail=operation.catch(()=>{});return operation;
 }
 return {request};
}
