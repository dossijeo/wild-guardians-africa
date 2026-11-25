import {WORKER_SPATIAL_PROFILE} from '../world/wild-engine/spatial-movement-profiles.js';
import {urgentWork} from './locomotion.js';
import {contractExpired,PROFILES} from './workforce.js';
import {isIntactRepairTarget} from './rules.js';
const profileEnd=new Map(PROFILES.map(p=>[p.id,p.end]));

// Dispatch existing native requests at authority boundaries. Like DetourCrowd's
// updateMoveRequest, requests stay on their agents and results revalidate their
// source. There is no copied request queue, movement clock or retry timer here.
export function createNativeIntentProduction({state,planner,bodyId,getPublication,getResources,publicationSequence,terrainManifest=()=>null,stationaryTaskNavigation=null,restoreRuinedWall=null,ruinedWallWakeKey=null,onError=()=>{}}){
 if(!state||!planner||[bodyId,getPublication,getResources,publicationSequence,terrainManifest,onError].some(f=>typeof f!=='function'))throw TypeError('Invalid native intent production');
 let closed=false,fault=null,active=null,last=null,quiescence=null;
 const rejectedRuins=new Map();
 function next(onlyActor=null){
  for(const actorId of rejectedRuins.keys())if(!state.workers.some(w=>w.id===actorId&&w.nativeRouteAdmission==='native-action'))rejectedRuins.delete(actorId);
  // Rotate the existing roster after the last attempt. A blocked native source
  // must not starve another ready agent; no duplicate request queue is retained.
  if(state.raid?.animals.length===1&&!state.pauses.length){
   const animal=state.raid.animals[0],actorId=animal.id;
   if(onlyActor===null||onlyActor===actorId){
    const r=planner.nativeAnimalCropState?.(actorId);
    if(r?.mode===1&&planner.nativeRaidFlightMember?.(state,animal)?.nativeRouteAdmission!=='pending-farm-flight-stop')return {actorId,kind:'animal-crop-route',operation:'startNativeAnimalCropRouteAfterGpuQuiescence',prepare:'prepareNativeAnimalCropRouteResources',requestSequence:r.requestSequence};
    if(r?.mode===2&&!r.retreat&&r.arrived)return {actorId,kind:'animal-crop-strike',operation:'startNativeAnimalCropStrikeAfterGpuQuiescence',prepare:'prepareNativeAnimalCropStrikeResources',requestSequence:r.requestSequence};
   }
  }
  const workers=state.workers,start=onlyActor===null?(workers.findIndex(w=>w.id===last?.actorId)+1)%Math.max(1,workers.length):0;
  for(let i=0;i<workers.length;i++){
   const worker=workers[(start+i)%workers.length];
   const actorId=worker.id,marker=worker.nativeRouteAdmission;
   if(onlyActor!==null&&actorId!==onlyActor)continue;
   if(marker==='pending-farm-arrival-resources'&&planner.nativeFarmArrivalRequestReference?.(actorId))return {actorId,kind:'farm-arrival',operation:'startNativeFarmArrivalAfterGpuQuiescence',prepare:'prepareNativeFarmArrivalResources',urgent:!worker.raidReturn&&urgentWork(state,worker)};
   if(marker==='pending-farm-flight-stop'){
    const stopRequest=planner.nativeFarmFlightStopRequest(actorId);
    if(stopRequest)return {actorId,kind:'farm-arrival-stop',operation:'stopFarmForRaidFlight',prepare:'prepareNativeGateResources',stopRequest};
   }
   if(marker==='native-farm-arrival'){
    const stopRequest=planner.nativeFarmArrivalStopRequest?.(actorId);
    if(stopRequest)return {actorId,kind:'farm-arrival-stop',operation:'stopNativeFarmArrivalAfterGpuQuiescence',prepare:'prepareNativeGateResources',stopRequest};
    const farmIdleSource=planner.nativeFarmArrivalIdleSource?.(actorId);
    if(farmIdleSource){const stroll=farmIdleSource.approach;return {actorId,kind:stroll?'idle-stroll':'idle-cycle',operation:stroll?'startNativeIdleStrollAfterGpuQuiescence':'startNativeIdleCycleAfterGpuQuiescence',prepare:stroll?'prepareNativeIdleStrollResources':'prepareNativeIdleCycleResources',farmIdleSource};}
   }
   if(marker==='native-farm-arrival-held'&&planner.nativeFarmArrivalContinuationSource?.(actorId))return {actorId,kind:'farm-arrival-continuation',operation:'continueNativeFarmArrivalAfterGpuQuiescence',prepare:'prepareNativeFarmArrivalResources'};
   if(marker==='native-idle-stroll'){
    const stopRequest=planner.nativeIdleStrollStopRequest?.(actorId);
    if(stopRequest)return {actorId,kind:'idle-stroll-stop',operation:'stopNativeIdleStrollAfterGpuQuiescence',prepare:'prepareNativeGateResources',stopRequest};
   }
   if(marker==='pending-idle-resources'&&planner.nativeInitialIdleRequestReference(actorId))return {actorId,kind:'initial-idle-body',operation:'startNativeInitialIdleBodyAfterGpuQuiescence',prepare:'prepareNativeInitialIdleBodyResources'};
   if(marker==='pending-stroll-resources'&&planner.nativeIdleStrollRequestReference(actorId))return {actorId,kind:'idle-stroll',operation:'startNativeIdleStrollAfterGpuQuiescence',prepare:'prepareNativeIdleStrollResources'};
   if((marker==='pending-home-resources'||marker==='pending-raid-flight-resources'&&planner.nativeRaidFlightMember?.(state,state.raid?.animals[0])===worker)&&planner.nativeHomeRequestReference(actorId)||!marker&&worker.status==='returning'&&planner.nativeTaskSettlementBinding(actorId)?.reference.home)return {actorId,kind:'home-route',operation:'startNativeHomeRouteAfterGpuQuiescence',prepare:'prepareNativeHomeRouteResources'};
   if(marker==='native-home'&&planner.nativeHomeRouteExecution(actorId)?.arrived)return {actorId,kind:'home-arrival',operation:'startNativeHomeArrivalAfterGpuQuiescence',prepare:'prepareNativeHomeArrivalResources'};
   if(marker==='native-idle'){
    const cycle=planner.nativeIdleCycleExecution(actorId),request=cycle&&planner.nativeIdleCycleNextRequest(actorId);
    if(!cycle&&planner.nativeInitialIdleBodyState(actorId)||request){const stroll=request?.idleState.mode==='walk';return {actorId,kind:stroll?'idle-stroll':'idle-cycle',operation:stroll?'startNativeIdleStrollAfterGpuQuiescence':'startNativeIdleCycleAfterGpuQuiescence',prepare:stroll?'prepareNativeIdleStrollResources':'prepareNativeIdleCycleResources'};}
   }
   if(marker==='native-idle-stroll'&&!contractExpired(worker,state)&&state.time<profileEnd.get(worker.profile)&&planner.nativeIdleStrollExecution(actorId)?.arrived)return {actorId,kind:'idle-cycle',operation:'startNativeIdleCycleAfterGpuQuiescence',prepare:'prepareNativeIdleCycleResources'};
   if(marker==='native-task'){
    const stopRequest=planner.nativeTaskRouteStopRequest?.(actorId);
    if(stopRequest)return {actorId,kind:'task-route-stop',operation:'stopNativeTaskForHomeAfterGpuQuiescence',prepare:'prepareNativeGateResources',stopRequest};
    const stopped=planner.nativeTaskCancellationSource?.(actorId);
    if(stopped?.phase===25)return {actorId,kind:'stopped-task-idle',operation:'startNativeInitialIdleBodyAfterGpuQuiescence',prepare:'prepareNativeInitialIdleBodyResources',returnStoppedTaskToIdle:true,stopped};
    // A completed expired Task waits for its native Home request; never start
    // a newly prepared action after the ordinary shift has ended.
    if(contractExpired(worker,state)||state.time>=profileEnd.get(worker.profile))return null;
   }
   if(marker==='pending-resources'){
    const request=planner.pendingTaskRoute(actorId),id=bodyId(actorId);
    if(request&&id!==undefined)return {actorId,kind:'task-start',operation:'startNativeTaskRouteAfterGpuQuiescence',prepare:'prepareNativeTaskStartResources',request,policy:{bodyId:id,radius:WORKER_SPATIAL_PROFILE.radius,urgent:urgentWork(state,worker),runRemaining:worker.runRemaining,runPhase:worker.runPhase??0,walkPhase:worker.walkPhase??0,carryPhase:worker.carryPhase??0}};
   }
   if((marker==='native-task'||marker==='pending-action-resources')&&!planner.nativeTaskActionBinding(actorId)){
    const request=planner.nativeTaskActionRequest(actorId);if(request)return {actorId,kind:'task-action',operation:'startNativeTaskActionAfterGpuQuiescence',prepare:'prepareNativeTaskActionResources',request};
   }
   // The acquired pose is publishable while paused. Its automatic successor
   // changes gameplay and waits for the authority to resume.
   if(marker==='native-action'&&!state.pauses?.length){
    const action=planner.nativeTaskActionExecution(actorId);
    if(action?.completed){
     const {actionKind:kind,targetId}=action.binding.reference.request;
     if(kind==='harvest')return {actorId,kind:'task-consequence',operation:'startNativeTaskConsequenceAfterGpuQuiescence',prepare:'prepareNativeTaskConsequenceResources'};
     if(restoreRuinedWall&&kind==='repair'&&state.structures.some(target=>target.id===`structure-${targetId}`&&target.kind==='wall'&&!target.gate&&target.hp===0&&target.status==='ruined')){const wakeKey=ruinedWallWakeKey?.(actorId);if(onlyActor===null&&wakeKey!==undefined&&rejectedRuins.get(actorId)===wakeKey)continue;return {actorId,kind:'ruined-wall-repair',prepare:'prepareNativeBarrierAdditionResources'};}
     const intactRepair=kind==='repair'&&state.structures.some(target=>target.id===`structure-${targetId}`&&isIntactRepairTarget(target));
     if(stationaryTaskNavigation&&(intactRepair||['initial','water'].includes(kind)))return {actorId,kind:'stationary-task',operation:'startNativeInitialIdleBodyAfterGpuQuiescence',prepare:'prepareNativeInitialIdleBodyResources',stationaryTaskNavigation};
    }
   }
   if(marker==='native-delivery'&&planner.nativeDeliveryExecution(actorId)?.arrived)return {actorId,kind:'task-settlement',operation:'startNativeTaskSettlementAfterGpuQuiescence',prepare:'prepareNativeTaskSettlementResources'};
  }
  return null;
 }
 function sourceIdentity(request){
  const actor=request.actorId;
  switch(request.kind){
   case 'animal-crop-route':case 'animal-crop-strike':return request.requestSequence;
   case 'farm-arrival':return JSON.stringify([planner.nativeFarmArrivalRequestReference(actor),request.urgent]);
   case 'farm-arrival-continuation':{const source=planner.nativeFarmArrivalContinuationSource(actor);return source&&JSON.stringify({...source,executedThrough:0});}
   case 'task-route-stop':
   case 'farm-arrival-stop':return JSON.stringify(request.stopRequest);
   case 'idle-stroll-stop':return JSON.stringify(request.stopRequest);
   case 'initial-idle-body':return JSON.stringify(planner.nativeInitialIdleRequestReference(actor));
   case 'idle-stroll':return JSON.stringify(request.farmIdleSource??planner.nativeIdleStrollRequestReference(actor)??planner.nativeIdleCycleBinding(actor));
   case 'idle-cycle':return JSON.stringify(request.farmIdleSource??planner.nativeInitialIdleBodyBinding(actor)??planner.nativeIdleCycleBinding(actor)??planner.nativeIdleStrollBinding(actor));
   case 'home-route':return JSON.stringify(planner.nativeHomeRequestReference(actor)??planner.nativeTaskSettlementBinding(actor));
   case 'home-arrival':return JSON.stringify(planner.nativeHomeRouteBinding(actor));
   case 'task-start':return JSON.stringify([request.request.requestHandle,request.request.requestSequence,request.policy]);
   case 'task-action':{const {executedThrough,...source}=request.request;return JSON.stringify(source);}
   case 'ruined-wall-repair':case 'stationary-task':case 'task-consequence':return JSON.stringify(planner.nativeTaskActionBinding(actor));
   case 'stopped-task-idle':return JSON.stringify(request.stopped);
   case 'task-settlement':return JSON.stringify(planner.nativeTaskConsequenceBinding(actor));
  }
 }
 function reportError(error){fault=String(error?.message??error);try{onError(error);}catch{}}
 function wake(){try{return dispatch();}catch(error){if(!closed)reportError(error);return Promise.resolve(null);}}
 function dispatch(){
  if(closed||fault)return Promise.resolve(null);
  if(active){
   const current=next(active.actorId);
   if(!current||current.kind!==active.kind||sourceIdentity(current)!==active.source){active.obsolete=true;active.controller.abort();}
   return active.promise;
  }
  if(quiescence)return Promise.resolve(null);
  const publication=getPublication(),resources=getResources();
  if(!publication?.status().coherent||publication.status().closed||resources?.status().phase!=='running'||resources.status().pending||resources.status().retained)return Promise.resolve(null);
  // Geometry revisions come from the existing terrain publisher. A source
  // without that owner yet waits for a real boundary, not a fabricated stamp.
  const manifest=terrainManifest();if(!manifest)return Promise.resolve(null);
  const request=next();if(!request)return Promise.resolve(null);
  const wakeKey=request.kind==='ruined-wall-repair'?ruinedWallWakeKey?.(request.actorId):undefined;
  const transaction={controller:new AbortController(),actorId:request.actorId,kind:request.kind,source:sourceIdentity(request),obsolete:false,promise:null,minSequence:publicationSequence()};active=transaction;
  if(['task-start','task-action','stationary-task','task-consequence','ruined-wall-repair'].includes(request.kind))transaction.taskId=state.workers.find(worker=>worker.id===request.actorId)?.taskId;
  transaction.promise=(async()=>{
   try{
    const {operation,prepare,...options}=request,result=await (request.kind==='ruined-wall-repair'?restoreRuinedWall:planner[operation])({...options,getPublication,signal:transaction.controller.signal,
     prepareResources:({resources:proposal,signal,deferredStart,nativeBarrierWallEntities})=>resources[prepare](proposal,{signal,...(nativeBarrierWallEntities?{nativeBarrierWallEntities}:{}),...(prepare==='prepareNativeGateResources'?{}:{deferredStart}),minSequence:transaction.minSequence,terrainManifest:manifest})});
    if(closed)return null;
    if(transaction.obsolete&&result.status==='control-failed'){last={actorId:request.actorId,kind:request.kind,status:'cancelled'};return {...result,status:'cancelled'};}
    if(wakeKey!==undefined&&['unsupported','blocked'].includes(result.status))rejectedRuins.set(request.actorId,wakeKey);else rejectedRuins.delete(request.actorId);
    last={actorId:request.actorId,kind:request.kind,status:result.status,...(result.status==='committed'?{publicationSequence:publicationSequence()}:{}),...(result.error?{error:String(result.error)}:{})};
    if(result.status==='committed-control-failed')throw Error('Native production committed without a live graphical control');
    if(result.status==='control-failed')throw Error(result.error??'Native production control failed');
    return result;
   }catch(error){if(!closed)reportError(error);return null;}
   finally{if(active===transaction)active=null;}
  })();
  // A commit changes Game semantics. Its next transition waits for a real
  // publication of those values (e.g. pending20 -> acquired20 before21).
  // An invalidating command already published its replacement source, so its
  // coalesced wake can run as soon as the cancelled slot is released.
  transaction.promise.then(()=>{if(!closed&&transaction.obsolete)wake();});
  return transaction.promise;
 }
 function quiesce({cancelTask=null}={}){
  if(closed||fault)return Promise.reject(Error(fault?'Native intent production failed: '+fault:'Native intent production closed'));
  if(quiescence)return quiescence.promise;
  if(active&&!active.promise)return Promise.reject(Error('Native intent production operation is not ready'));
  // Holding dispatch is not completion. Only the existing operation's actual
  // settlement can certify a stable source; its errors remain terminal.
  const hold={receipt:Object.freeze({}),settled:false,promise:null};quiescence=hold;
  if(cancelTask&&active?.actorId===cancelTask.actorId&&active.taskId&&active.taskId===cancelTask.taskId){
   active.obsolete=true;active.controller.abort();
  }
  hold.promise=Promise.resolve(active?.promise).then(()=>{
   if(closed||fault)throw Error(fault?'Native intent production failed: '+fault:'Native intent production closed');
   if(quiescence!==hold)throw Error('Native production quiescence became obsolete');
   hold.settled=true;return hold.receipt;
  });
  return hold.promise;
 }
 function resume(receipt){
  if(closed||fault)throw Error(fault?'Native intent production failed: '+fault:'Native intent production closed');
  if(!quiescence?.settled||receipt!==quiescence.receipt)throw Error('Invalid native production quiescence receipt');
  quiescence=null;wake();return true;
 }
 return {wake,quiesce,resume,status:()=>({phase:closed?'closed':fault?'failed':quiescence?quiescence.settled?'suspended':'quiescing':active?'preparing':'idle',fault,active:active?{actorId:active.actorId,kind:active.kind}:null,last:last&&{...last}}),
  dispose(){if(closed)return;closed=true;active?.controller.abort();}};
}
