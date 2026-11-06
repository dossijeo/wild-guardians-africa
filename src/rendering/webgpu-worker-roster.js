import {admitRosterActor,disposePendingRosterActor,releaseRosterActor} from './webgpu-roster-admission.js';
import {bindWebGpuActorMotion} from './webgpu-actor-motion-binding.js';
import {createConfirmedGpuMotion} from './confirmed-gpu-motion.js';
import {createConfirmedGpuAnimationPhase} from './confirmed-gpu-animation-phase.js';
import {confirmedWalkingSamples} from './confirmed-animation-samples.js';
import {confirmedMotionYaw} from './confirmed-motion-yaw.js';
import {Group,Vector3} from 'three';
import {createWebGpuConfirmedWorker} from './webgpu-confirmed-worker.js';
import {hasBakedWorkerWalk} from './baked-worker-walk-profiles.js';

// Reconcile only from confirmed publications and release obsolete async work.
export function createWebGpuWorkerRoster({scene,residency,state,assetBank,renderer=null,bakedWalkBank=null,ownsAssetBank=true,pipelineAdmission=null,presentationWorkerHeadings=null,confirmedClock=null,experimentalHistoricalMotion=null,onError=()=>{},onBakedWalkError=()=>{},onReady=()=>{},onSelectableChange=()=>{},createWorker=createWebGpuConfirmedWorker}={}){
 if(!scene||!residency||!state||!assetBank||typeof ownsAssetBank!=='boolean'||pipelineAdmission!==null&&typeof pipelineAdmission.prepare!=='function'||bakedWalkBank!==null&&(typeof bakedWalkBank.get!=='function'||!pipelineAdmission||!renderer?.backend?.isWebGPUBackend)||presentationWorkerHeadings!==null&&!(presentationWorkerHeadings instanceof Map)||confirmedClock!==null&&(!confirmedClock.node?.isNode||!Number.isFinite(confirmedClock.elapsed))||typeof onError!=='function'||typeof onBakedWalkError!=='function'||typeof onReady!=='function'||typeof onSelectableChange!=='function'||typeof createWorker!=='function')throw TypeError('Invalid worker roster');
 const ids=[...(experimentalHistoricalMotion?.actorIds??[])];if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||experimentalHistoricalMotion&&(!experimentalHistoricalMotion.clock?.motionNode?.isNode||!pipelineAdmission||!bakedWalkBank))throw TypeError('Invalid historical worker selection');
 const selected=new Set(ids),entries=new Map();let closed=false,tasks=new Map(),historyRun=null;
 function requestBakedWalk(id,entry){if(!bakedWalkBank||!hasBakedWorkerWalk(entry.profile))return;const current=()=>!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&!!entry.actor;Promise.resolve().then(()=>bakedWalkBank.get(entry.profile)).then(async bake=>{if(!current())return;if(typeof entry.actor.installBakedWalk!=='function')throw Error('Worker cannot install baked walking');if(await entry.actor.installBakedWalk(bake,{pipelineAdmission,signal:entry.controller.signal})&&current())onSelectableChange();}).catch(error=>{if(current())onBakedWalkError(entry.profile,error);});}
 async function prepareHistorical(id,entry,actor){
  if(!selected.has(id))return actor;
  // Preparation may await resource admission. Keep the not-yet-admitted rig
  // out of the live scene throughout that interval.
  const parent=actor.root?.parent,staging=new Group();if(parent)staging.add(actor.root);
  try{if(!hasBakedWorkerWalk(entry.profile))return actor;const bake=await bakedWalkBank.get(entry.profile);if(closed||entries.get(id)!==entry||entry.controller.signal.aborted)return actor;
   if(!await actor.installBakedWalk(bake,{pipelineAdmission,signal:entry.controller.signal}))return actor;
   if(closed||entries.get(id)!==entry||entry.controller.signal.aborted)return actor;
   actor.root.updateWorldMatrix(true,true);const point=actor.root.getWorldPosition(new Vector3()),motion=createConfirmedGpuMotion({actorId:id,clock:experimentalHistoricalMotion.clock});motion.bootstrap({at:experimentalHistoricalMotion.clock.elapsed,x:point.x,y:point.y,z:point.z});
   try{entry.motionBinding=bindWebGpuActorMotion({root:actor.root,renderer,motion,actorId:id,getPickTime:()=>experimentalHistoricalMotion.clock.elapsed});entry.motion=motion;motion.reset();}catch(error){motion.dispose();throw error;}
  }catch(error){if(!entry.controller.signal.aborted)onBakedWalkError(entry.profile,error);}finally{if(parent&&actor.root.parent===staging){parent.add(actor.root);actor.root.visible=false;}}return actor;
 }
 function remove(id,entry){if(historyRun?.entries.has(id))historyRun.invalid=true;onSelectableChange();entries.delete(id);entry.entity=null;entry.controller.abort();entry.motionBinding?.dispose();entry.motion?.dispose();entry.phase?.dispose();releaseRosterActor(entry.actor,pipelineAdmission);disposePendingRosterActor(entry,pipelineAdmission);}
 function sync(){if(closed)return;const desired=new Map(),nextTasks=new Map();for(const task of state.tasks??[])if(!nextTasks.has(task?.id))nextTasks.set(task?.id,task);for(const entity of state.workers??[]){if(entity.status==='home')continue;if(typeof entity.id!=='string'||!entity.id||desired.has(entity.id))throw Error('Invalid confirmed worker roster');desired.set(entity.id,entity);}tasks=nextTasks;
  for(const [id,entry] of entries){const entity=desired.get(id);if(!entity||entity.profile!==entry.profile)remove(id,entry);}
  for(const [id,entity] of desired){let entry=entries.get(id);if(entry){entry.entity=entity;entry.actor?.update();continue;}entry={profile:entity.profile,entity,controller:new AbortController(),actor:null};if(selected.has(id))entry.phase=createConfirmedGpuAnimationPhase({clock:experimentalHistoricalMotion.clock});entries.set(id,entry);Promise.resolve().then(()=>createWorker({scene,residency,state,actorId:id,assetBank,renderer,presentationWorkerHeadings,confirmedClock:selected.has(id)?experimentalHistoricalMotion.clock:confirmedClock,phaseSource:entry.phase??null,getEntity:()=>entry.entity,getTask:taskId=>tasks.get(taskId),signal:entry.controller.signal})).then(actor=>prepareHistorical(id,entry,actor)).then(actor=>admitRosterActor({actor,entry,isCurrent:()=>!closed&&entries.get(id)===entry,pipelineAdmission,onReady:()=>{onSelectableChange();onReady(id);if(!selected.has(id))requestBakedWalk(id,entry);}})).catch(error=>{if(closed||entries.get(id)!==entry||entry.controller.signal.aborted)return;entries.delete(id);entry.entity=null;entry.phase?.dispose();onError(error);});}
 }
 const preparedTokens=new WeakMap();
 function prepareHistoricalMotion(preview,support){
  const paths=preview?.trace?.actors,grounds=support?.actors;
  if(closed||historyRun)return {ok:false,reason:'roster-busy'};
  if(preview?.sequence!==support?.sequence||typeof support?.valid!=='function'||!support.valid()||!Array.isArray(paths)||!Array.isArray(grounds))return {ok:false,reason:'support-unavailable'};
  const prepared=[];for(const id of ids){const entry=entries.get(id),matches=paths.filter(p=>p.actorId===id),heights=grounds.filter(g=>g.actorId===id),path=matches[0],ground=heights[0];
   if(matches.length!==1||heights.length!==1||!entry?.actor||entry.actor.root?.visible!==true||!entry.motion||entry.actor.isBakedWalking?.()!==true||!Array.isArray(ground.segments)||!ground.segments.length)return {ok:false,reason:'worker-not-ready',actorId:id};
   const root=entry.actor.root.getWorldPosition(new Vector3());if(root.x!==path.start.x||root.z!==path.start.z||Math.abs(root.y-ground.startHeight-.025)>1e-6)return {ok:false,reason:'worker-anchor',actorId:id};
   const yawSamples=confirmedMotionYaw(preview,id,entry.actor.root),phaseSamples=confirmedWalkingSamples(preview,id,'worker',entry.entity);if(!yawSamples||!phaseSamples||!entry.phase)return {ok:false,reason:'worker-animation',actorId:id};
   prepared.push({id,entry,entity:entry.entity,phaseSamples,trace:{actorId:id,continuous:true,timed:true,start:{...path.start,y:ground.startHeight+.025},end:{...path.end,y:ground.endHeight+.025},segments:ground.segments.map(segment=>({...segment,y0:segment.y0+.025,y1:segment.y1+.025})),yawSamples}});
  }
  const token={};preparedTokens.set(token,{preview,support,prepared,ids:[...ids],trace:JSON.stringify(preview.trace),grounds:JSON.stringify(support.actors)});return {ok:true,token};
 }
 function startHistoricalMotion(preview,support,token=null){
  const proof=preview?.certificates;
  if(preview?.safeForAutonomousPlayback!==true||!proof||proof.sequence!==preview.sequence||!Array.isArray(proof.actorIds)||ids.some(id=>!proof.actorIds.includes(id))||proof.animationSynchronized!==true||proof.otherActorsSynchronized!==true||proof.effectsSynchronized!==true||proof.continuousCollision!==true||proof.inputSynchronized!==true)return false;
  const checked=token===null?prepareHistoricalMotion(preview,support):{ok:true,token};if(!checked.ok)return false;const pending=preparedTokens.get(checked.token);preparedTokens.delete(checked.token);
  if(!pending||pending.preview!==preview||pending.support!==support||closed||historyRun||support.valid()!==true||pending.trace!==JSON.stringify(preview.trace)||pending.grounds!==JSON.stringify(support.actors)||ids.length!==pending.ids.length||ids.some((id,index)=>id!==pending.ids[index])||pending.prepared.some(value=>{const entry=value.entry,root=entry.actor?.root;if(entries.get(value.id)!==entry||entry.entity!==value.entity||!root?.visible||entry.actor.isBakedWalking?.()!==true)return true;const position=root.getWorldPosition(new Vector3());return position.x!==value.trace.start.x||position.y!==value.trace.start.y||position.z!==value.trace.start.z||!confirmedMotionYaw(preview,value.id,root);}))return false;
  const prepared=pending.prepared;
  const installed=[];try{for(const value of prepared){installed.push(value);value.entry.phase.install(value.phaseSamples,preview);value.entry.motion.install(value.trace,preview.sequence);}}catch{for(const value of installed){value.entry.phase.reset();value.entry.motion.reset();}return false;}
  historyRun={sequence:preview.sequence,entries:new Map(prepared.map(value=>[value.id,value.entry])),support,invalid:false};return true;
 }
 function historicalMotionCurrent(preview){if(!historyRun||historyRun.invalid||historyRun.sequence!==preview?.sequence||closed||historyRun.support.valid()!==true)return false;for(const [id,entry] of historyRun.entries)if(entries.get(id)!==entry||entry.actor?.root.visible!==true||entry.actor?.isBakedWalking?.()!==true)return false;return true;}
 function finishHistoricalMotion(preview){if(!historicalMotionCurrent(preview))throw Error('Historical worker motion is no longer current');for(const entry of historyRun.entries.values()){entry.motion.reset();entry.phase.reset();}historyRun=null;}
 function abortHistoricalMotion(){if(!historyRun)return;if(!experimentalHistoricalMotion.clock.status().active){cancelHistoricalMotion();return;}const run=historyRun;run.invalid=true;for(const entry of run.entries.values())try{entry.motion.hold(experimentalHistoricalMotion.clock.elapsed);}catch{}}
 function cancelHistoricalMotion(){if(!historyRun)return;for(const entry of historyRun.entries.values()){entry.motion.reset();entry.phase.reset();}historyRun=null;}
 function setHistoricalActors(next){if(closed||historyRun)throw Error('Historical selection is busy');if(!Array.isArray(next)||next.some(id=>typeof id!=='string'||!id)||new Set(next).size!==next.length)throw TypeError('Invalid historical worker selection');ids.splice(0,ids.length,...next);selected.clear();for(const id of next)selected.add(id);}
 return {sync,...(experimentalHistoricalMotion?{setHistoricalActors,historicalActorIds:()=>[...ids],prepareHistoricalMotion,startHistoricalMotion,historicalMotionCurrent,finishHistoricalMotion,abortHistoricalMotion,cancelHistoricalMotion}:{}),...(import.meta.env?.DEV?{bindMotion(actorId,motion,renderer,getPickTime){const entry=entries.get(actorId);if(closed||!entry?.actor||entry.motionBinding)throw Error('Actor motion binding unavailable');const binding=bindWebGpuActorMotion({root:entry.actor.root,renderer,motion,actorId,getPickTime});entry.motionBinding=binding;return {dispose(){if(entry.motionBinding===binding)entry.motionBinding=null;binding.dispose();}};}}:{}),tick(now){assetBank.tick?.(now);},get(id){return entries.get(id)?.actor??null;},status(){let ready=0;for(const entry of entries.values())if(entry.actor)ready++;return {closed,count:entries.size,ready,pending:entries.size-ready,assets:assetBank.status?.()??null};},dispose(){if(closed)return;closed=true;for(const [id,entry] of entries)remove(id,entry);if(ownsAssetBank)assetBank.dispose();}};
}
