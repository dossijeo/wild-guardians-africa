import {Group} from 'three';
import {createActorTerrainSampler} from './webgpu-actor-terrain.js';

// Loose crates belong to confirmed presentation. Carried crates remain part
// of the worker rig; delivered history has no visual object.
export function createWebGpuCrateRoster({scene,residency,state,assetBank,onError=()=>{}}={}){
 if(!scene?.isScene||typeof residency?.get!=='function'||!state||typeof assetBank?.acquireCrate!=='function'||typeof onError!=='function')throw TypeError('Invalid crate roster');
 const entries=new Map();let closed=false;
 function remove(id,entry){entries.delete(id);entry.root?.removeFromParent();entry.lease?.release();}
 function update(entry,crate){if(!entry.root)return;const mesh=residency.get(Math.floor((crate.x+24)/48),Math.floor((crate.z+24)/48));entry.root.visible=!!mesh;if(mesh)entry.root.position.set(crate.x,entry.surface(crate.x,crate.z)+.025,crate.z);}
 function sync(){if(closed)return;const desired=new Map();for(const crate of state.crates??[]){if(crate.delivered||crate.carrierId)continue;if(typeof crate.id!=='string'||!crate.id||!Number.isFinite(crate.x)||!Number.isFinite(crate.z)||desired.has(crate.id))throw TypeError('Invalid confirmed crate');desired.set(crate.id,crate);}
  for(const [id,entry] of entries){const crate=desired.get(id);if(!crate||(crate.profile??'olderMale')!==entry.profile)remove(id,entry);}
  for(const [id,crate] of desired){let entry=entries.get(id);if(entry){update(entry,crate);continue;}entry={profile:crate.profile??'olderMale',root:null,lease:null,surface:createActorTerrainSampler(residency)};entries.set(id,entry);Promise.resolve().then(()=>assetBank.acquireCrate(entry.profile)).then(lease=>{if(closed||entries.get(id)!==entry){lease.release();return;}entry.lease=lease;entry.root=new Group();entry.root.userData.entityId=id;entry.root.add(lease.model);scene.add(entry.root);const current=(state.crates??[]).find(c=>c.id===id);if(current&&!current.delivered&&!current.carrierId)update(entry,current);else remove(id,entry);}).catch(error=>{if(closed||entries.get(id)!==entry)return;remove(id,entry);onError(error);});}
 }
 return {sync,status(){let ready=0;for(const entry of entries.values())if(entry.root?.visible)ready++;return {closed,count:entries.size,ready,pending:entries.size-ready};},dispose(){if(closed)return;closed=true;for(const [id,entry] of entries)remove(id,entry);}};
}
