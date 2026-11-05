import {Group} from 'three';
import {createActorTerrainSampler} from './webgpu-actor-terrain.js';

// Loose crates belong to confirmed presentation. Carried crates remain part
// of the worker rig; delivered history has no visual object.
export function createWebGpuCrateRoster({scene,residency,state,assetBank,pipelineAdmission=null,onError=()=>{},onSelectableChange=()=>{}}={}){
 if(!scene?.isScene||typeof residency?.get!=='function'||!state||typeof assetBank?.acquireCrate!=='function'||pipelineAdmission!==null&&typeof pipelineAdmission.prepare!=='function'||typeof onError!=='function'||typeof onSelectableChange!=='function')throw TypeError('Invalid crate roster');
 const entries=new Map();let closed=false;
 function remove(id,entry){onSelectableChange();entries.delete(id);entry.controller.abort();entry.root?.removeFromParent();entry.lease?.release();entry.lease=null;}
 function update(entry,crate){if(!entry.root)return;const mesh=residency.get(Math.floor((crate.x+24)/48),Math.floor((crate.z+24)/48));const y=mesh?entry.surface(crate.x,crate.z)+.025:entry.root.position.y;if(entry.root.visible!==!!mesh||entry.root.position.x!==crate.x||entry.root.position.y!==y||entry.root.position.z!==crate.z)onSelectableChange();entry.root.visible=!!mesh;if(mesh)entry.root.position.set(crate.x,y,crate.z);}
 function sync(){if(closed)return;const desired=new Map();for(const crate of state.crates??[]){if(crate.delivered||crate.carrierId)continue;if(typeof crate.id!=='string'||!crate.id||!Number.isFinite(crate.x)||!Number.isFinite(crate.z)||desired.has(crate.id))throw TypeError('Invalid confirmed crate');desired.set(crate.id,crate);}
  for(const [id,entry] of entries){const crate=desired.get(id);if(!crate||(crate.profile??'olderMale')!==entry.profile)remove(id,entry);}
  for(const [id,crate] of desired){let entry=entries.get(id);if(entry){update(entry,crate);continue;}entry={profile:crate.profile??'olderMale',root:null,lease:null,controller:new AbortController(),surface:createActorTerrainSampler(residency)};entries.set(id,entry);Promise.resolve().then(()=>assetBank.acquireCrate(entry.profile)).then(async lease=>{if(closed||entries.get(id)!==entry){lease.release();return;}entry.lease=lease;const root=new Group();root.visible=false;root.userData.entityId=id;root.add(lease.model);if(pipelineAdmission)await pipelineAdmission.prepare(root,{signal:entry.controller.signal});if(closed||entries.get(id)!==entry)return;entry.root=root;scene.add(root);onSelectableChange();const current=(state.crates??[]).find(c=>c.id===id);if(current&&!current.delivered&&!current.carrierId)update(entry,current);else remove(id,entry);}).catch(error=>{if(closed||entries.get(id)!==entry)return;remove(id,entry);onError(error);});}
 }
 return {sync,status(){let ready=0;for(const entry of entries.values())if(entry.root?.visible)ready++;return {closed,count:entries.size,ready,pending:entries.size-ready};},dispose(){if(closed)return;closed=true;for(const [id,entry] of entries)remove(id,entry);}};
}
