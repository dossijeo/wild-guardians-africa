import {createWebGpuConfirmedAnimal} from './webgpu-confirmed-animal.js';

// Reconciles only confirmed roster changes; model preparation never mutates
// simulation state. A pending creation cancelled by a later publication cannot
// reappear when its resources finally finish loading.
export function createWebGpuAnimalRoster({scene,residency,state,renderer,assetBank,onlyActorId=null,onError=()=>{},onReady=()=>{},createAnimal=createWebGpuConfirmedAnimal}={}){
 if(!scene||!residency||!state||!assetBank||typeof createAnimal!=='function'||typeof onError!=='function'||typeof onReady!=='function')throw TypeError('Invalid animal roster');
 const entries=new Map();let closed=false;
 function remove(id,entry){entries.delete(id);entry.controller.abort();entry.actor?.dispose();}
 function sync(){
  if(closed)return;const desired=new Map();for(const entity of state.raid?.animals??[]){if(entity.status==='gone'||onlyActorId!==null&&entity.id!==onlyActorId)continue;if(typeof entity.id!=='string'||!entity.id||desired.has(entity.id))throw Error('Invalid confirmed animal roster');desired.set(entity.id,entity);}
  for(const [id,entry] of entries){const entity=desired.get(id);if(!entity||entity.species!==entry.species)remove(id,entry);}
  for(const [id,entity] of desired){let entry=entries.get(id);if(entry){entry.actor?.update();continue;}entry={species:entity.species,controller:new AbortController(),actor:null};entries.set(id,entry);
   Promise.resolve().then(()=>createAnimal({scene,residency,state,renderer,actorId:id,assetBank,signal:entry.controller.signal})).then(actor=>{if(closed||entries.get(id)!==entry){actor.dispose();return;}entry.actor=actor;actor.update();onReady(id);}).catch(error=>{if(closed||entries.get(id)!==entry||entry.controller.signal.aborted)return;entries.delete(id);onError(error);});
  }
 }
 return {sync,get(id){return entries.get(id)?.actor??null;},first(){for(const entry of entries.values())if(entry.actor)return entry.actor;return null;},tick(now){if(!closed)assetBank.tick(now);},status(){let ready=0;for(const entry of entries.values())if(entry.actor)ready++;return {closed,count:entries.size,ready,pending:entries.size-ready};},dispose(){if(closed)return;closed=true;for(const [id,entry] of entries)remove(id,entry);assetBank.dispose();}};
}
