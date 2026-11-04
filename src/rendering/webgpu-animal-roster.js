import {createWebGpuConfirmedAnimal} from './webgpu-confirmed-animal.js';
import {ProvisionalBeastImpact} from './provisional-beast-impact.js';
import {attackTargetAvailable} from '../simulation/guardian-combat.js';
import {Raycaster,Vector3} from 'three';

// Reconciles only confirmed roster changes; model preparation never mutates
// simulation state. A pending creation cancelled by a later publication cannot
// reappear when its resources finally finish loading.
export function createWebGpuAnimalRoster({scene,residency,state,renderer,assetBank,bakedWalk=null,confirmedClock=null,experimentalProvisionalFall=false,onlyActorId=null,onError=()=>{},onReady=()=>{},createAnimal=createWebGpuConfirmedAnimal}={}){
 if(!scene||!residency||!state||!assetBank||typeof createAnimal!=='function'||typeof onError!=='function'||typeof onReady!=='function')throw TypeError('Invalid animal roster');
 const entries=new Map(),provisional=new ProvisionalBeastImpact(),ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0);let closed=false,poses=new Map(),falls=null,loadingFalls=null,fallLoadError=null;
 function requestFalls(){if(!loadingFalls)loadingFalls=import('./baked-beast-fallbacks.js').then(m=>m.loadBakedFalls()).then(value=>{if(!closed)falls=value;}).catch(error=>{fallLoadError=String(error?.message??error);});}
 function ground(x,z){const mesh=residency.get(Math.floor((x+24)/48),Math.floor((z+24)/48));if(!mesh)return 0;mesh.updateWorldMatrix(true,false);ray.set(origin.set(x,1000,z),down);return ray.intersectObject(mesh,false)[0]?.point.y??0;}
 function finishTarget(id){const item=provisional.byTarget.get(id);if(item)provisional.end(item.id);}
 function remove(id,entry){entries.delete(id);entry.controller.abort();entry.actor?.dispose();}
 function sync(){
  if(closed)return;const desired=new Map();for(const entity of state.raid?.animals??[]){if(entity.status==='gone'||onlyActorId!==null&&entity.id!==onlyActorId)continue;if(typeof entity.id!=='string'||!entity.id||desired.has(entity.id))throw Error('Invalid confirmed animal roster');desired.set(entity.id,entity);}
  for(const [id,entry] of entries){const entity=desired.get(id);if(!entity||entity.species!==entry.species)remove(id,entry);}
  for(const [id,entity] of desired){let entry=entries.get(id);if(entry){entry.actor?.update();continue;}entry={species:entity.species,controller:new AbortController(),actor:null};entries.set(id,entry);
   Promise.resolve().then(()=>createAnimal({scene,residency,state,renderer,actorId:id,assetBank,bakedWalk,confirmedClock,experimentalPoseReconciliation:experimentalProvisionalFall,getPose:()=>poses.get(id)??null,getProvisional:(animal,elapsed)=>provisional.sample(animal,elapsed,{holdUntilPhysical:true}),getFalls:()=>falls,onPhysical:()=>finishTarget(id),signal:entry.controller.signal})).then(actor=>{if(closed||entries.get(id)!==entry){actor.dispose();return;}entry.actor=actor;actor.update();onReady(id);}).catch(error=>{if(closed||entries.get(id)!==entry||entry.controller.signal.aborted)return;entries.delete(id);onError(error);});
  }
 }
 if(experimentalProvisionalFall)requestFalls();
 return {sync,beginImpact(command){if(closed)return false;const animal=state.raid?.animals.find(a=>a.id===command?.targetId);if(!entries.get(animal?.id)?.actor||!attackTargetAvailable(state,animal)||poses.has(animal.id))return false;const started=provisional.begin(command,state,ground);if(started&&experimentalProvisionalFall)requestFalls();return started;},resolveImpact(id,accepted){if(closed||accepted)return;const item=provisional.byCommand.get(id);if(!item)return;provisional.end(id);entries.get(item.targetId)?.actor?.update();},validatePoses(next){for(const [id,pose] of next)entries.get(id)?.actor?.validatePose(pose);},setPoses(next){if(closed)throw Error('Animal roster disposed');poses=next;},get(id){return entries.get(id)?.actor??null;},first(){for(const entry of entries.values())if(entry.actor)return entry.actor;return null;},tick(now){if(closed)return;assetBank.tick(now);for(const entry of entries.values())if(entry.actor?.isReconciling?.())entry.actor.update();for(const item of [...provisional.byCommand.values()]){if(now-item.startedAt>10000){provisional.end(item.id);entries.get(item.targetId)?.actor?.update();}else entries.get(item.targetId)?.actor?.update();}},status(){let ready=0,physicalApplied=0,bakedWalking=0,provisionalFalling=0;for(const entry of entries.values())if(entry.actor){ready++;if(entry.actor.isPhysical?.())physicalApplied++;if(entry.actor.isBakedWalking?.())bakedWalking++;if(entry.actor.isProvisionalFalling?.())provisionalFalling++;}return {closed,count:entries.size,ready,pending:entries.size-ready,physical:poses.size,physicalApplied,bakedWalking,provisionalFalling,fallsReady:!!falls,fallLoadError,provisionalImpacts:provisional.byCommand.size};},dispose(){if(closed)return;closed=true;poses.clear();provisional.clear();for(const [id,entry] of entries)remove(id,entry);assetBank.dispose();}};
}
