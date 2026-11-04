import {createWebGpuConfirmedWorker} from './webgpu-confirmed-worker.js';

// Reconcile only from confirmed publications and release obsolete async work.
export function createWebGpuWorkerRoster({scene,residency,state,assetBank,onError=()=>{},onReady=()=>{},createWorker=createWebGpuConfirmedWorker}={}){
 if(!scene||!residency||!state||!assetBank||typeof onError!=='function'||typeof onReady!=='function'||typeof createWorker!=='function')throw TypeError('Invalid worker roster');
 const entries=new Map();let closed=false;
 function remove(id,entry){entries.delete(id);entry.controller.abort();entry.actor?.dispose();}
 function sync(){if(closed)return;const desired=new Map();for(const entity of state.workers??[]){if(entity.status==='home')continue;if(typeof entity.id!=='string'||!entity.id||desired.has(entity.id))throw Error('Invalid confirmed worker roster');desired.set(entity.id,entity);}
  for(const [id,entry] of entries){const entity=desired.get(id);if(!entity||entity.profile!==entry.profile)remove(id,entry);}
  for(const [id,entity] of desired){let entry=entries.get(id);if(entry){entry.actor?.update();continue;}entry={profile:entity.profile,controller:new AbortController(),actor:null};entries.set(id,entry);Promise.resolve().then(()=>createWorker({scene,residency,state,actorId:id,assetBank,signal:entry.controller.signal})).then(actor=>{if(closed||entries.get(id)!==entry){actor.dispose();return;}entry.actor=actor;actor.update();onReady(id);}).catch(error=>{if(closed||entries.get(id)!==entry||entry.controller.signal.aborted)return;entries.delete(id);onError(error);});}
 }
 return {sync,get(id){return entries.get(id)?.actor??null;},status(){let ready=0;for(const entry of entries.values())if(entry.actor)ready++;return {closed,count:entries.size,ready,pending:entries.size-ready};},dispose(){if(closed)return;closed=true;for(const [id,entry] of entries)remove(id,entry);assetBank.dispose();}};
}
