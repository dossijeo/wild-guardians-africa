import {WORKER_SPATIAL_PROFILE} from '../world/wild-engine/spatial-movement-profiles.js';
import {urgentWork} from './locomotion.js';

// Dispatch existing native requests at authority boundaries. Like DetourCrowd's
// updateMoveRequest, requests stay on their agents and results revalidate their
// source. There is no copied request queue, movement clock or retry timer here.
export function createNativeIntentProduction({state,planner,bodyId,getPublication,getResources,publicationSequence,terrainManifest=()=>null,onError=()=>{}}){
 if(!state||!planner||[bodyId,getPublication,getResources,publicationSequence,terrainManifest,onError].some(f=>typeof f!=='function'))throw TypeError('Invalid native intent production');
 let closed=false,fault=null,active=null,last=null,quiescence=null;
 function next(onlyActor=null){
  // Rotate the existing roster after the last attempt. A blocked native source
  // must not starve another ready agent; no duplicate request queue is retained.
  const workers=state.workers,start=onlyActor===null?(workers.findIndex(w=>w.id===last?.actorId)+1)%Math.max(1,workers.length):0;
  for(let i=0;i<workers.length;i++){
   const worker=workers[(start+i)%workers.length];
   const actorId=worker.id,marker=worker.nativeRouteAdmission;
   if(onlyActor!==null&&actorId!==onlyActor)continue;
   if(marker==='native-farm-arrival'){
    const stopRequest=planner.nativeFarmArrivalStopRequest?.(actorId);
    if(stopRequest)return {actorId,kind:'farm-arrival-stop',operation:'stopNativeFarmArrivalAfterGpuQuiescence',prepare:'prepareNativeGateResources',stopRequest};
   }
   if(marker==='native-farm-arrival-held'&&planner.nativeFarmArrivalContinuationSource?.(actorId))return {actorId,kind:'farm-arrival-continuation',operation:'continueNativeFarmArrivalAfterGpuQuiescence',prepare:'prepareNativeFarmArrivalResources'};
   if(marker==='pending-idle-resources'&&planner.nativeInitialIdleRequestReference(actorId))return {actorId,kind:'initial-idle-body',operation:'startNativeInitialIdleBodyAfterGpuQuiescence',prepare:'prepareNativeInitialIdleBodyResources'};
   if(marker==='pending-stroll-resources'&&planner.nativeIdleStrollRequestReference(actorId))return {actorId,kind:'idle-stroll',operation:'startNativeIdleStrollAfterGpuQuiescence',prepare:'prepareNativeIdleStrollResources'};
   if(marker==='pending-home-resources'&&planner.nativeHomeRequestReference(actorId)||!marker&&worker.status==='returning'&&planner.nativeTaskSettlementBinding(actorId)?.reference.home)return {actorId,kind:'home-route',operation:'startNativeHomeRouteAfterGpuQuiescence',prepare:'prepareNativeHomeRouteResources'};
   if(marker==='native-home'&&planner.nativeHomeRouteExecution(actorId)?.arrived)return {actorId,kind:'home-arrival',operation:'startNativeHomeArrivalAfterGpuQuiescence',prepare:'prepareNativeHomeArrivalResources'};
   if(marker==='native-idle'){
    const cycle=planner.nativeIdleCycleExecution(actorId),request=cycle&&planner.nativeIdleCycleNextRequest(actorId);
    if(!cycle&&planner.nativeInitialIdleBodyState(actorId)||request){const stroll=request?.idleState.mode==='walk';return {actorId,kind:stroll?'idle-stroll':'idle-cycle',operation:stroll?'startNativeIdleStrollAfterGpuQuiescence':'startNativeIdleCycleAfterGpuQuiescence',prepare:stroll?'prepareNativeIdleStrollResources':'prepareNativeIdleCycleResources'};}
   }
   if(marker==='native-idle-stroll'&&planner.nativeIdleStrollExecution(actorId)?.arrived)return {actorId,kind:'idle-cycle',operation:'startNativeIdleCycleAfterGpuQuiescence',prepare:'prepareNativeIdleCycleResources'};
   if(marker==='pending-resources'){
    const request=planner.pendingTaskRoute(actorId),id=bodyId(actorId);
    if(request&&id!==undefined)return {actorId,kind:'task-start',operation:'startNativeTaskRouteAfterGpuQuiescence',prepare:'prepareNativeTaskStartResources',request,policy:{bodyId:id,radius:WORKER_SPATIAL_PROFILE.radius,urgent:urgentWork(state,worker),runRemaining:worker.runRemaining,runPhase:worker.runPhase??0,walkPhase:worker.walkPhase??0,carryPhase:worker.carryPhase??0}};
   }
   if((marker==='native-task'||marker==='pending-action-resources')&&!planner.nativeTaskActionBinding(actorId)){
    const request=planner.nativeTaskActionRequest(actorId);if(request)return {actorId,kind:'task-action',operation:'startNativeTaskActionAfterGpuQuiescence',prepare:'prepareNativeTaskActionResources',request};
   }
   if(marker==='native-action'&&planner.nativeTaskActionExecution(actorId)?.completed)return {actorId,kind:'task-consequence',operation:'startNativeTaskConsequenceAfterGpuQuiescence',prepare:'prepareNativeTaskConsequenceResources'};
   if(marker==='native-delivery'&&planner.nativeDeliveryExecution(actorId)?.arrived)return {actorId,kind:'task-settlement',operation:'startNativeTaskSettlementAfterGpuQuiescence',prepare:'prepareNativeTaskSettlementResources'};
  }
  return null;
 }
 function sourceIdentity(request){
  const actor=request.actorId;
  switch(request.kind){
   case 'farm-arrival-continuation':{const source=planner.nativeFarmArrivalContinuationSource(actor);return source&&JSON.stringify({...source,executedThrough:0});}
   case 'farm-arrival-stop':return JSON.stringify(request.stopRequest);
   case 'initial-idle-body':return JSON.stringify(planner.nativeInitialIdleRequestReference(actor));
   case 'idle-stroll':return JSON.stringify(planner.nativeIdleStrollRequestReference(actor)??planner.nativeIdleCycleBinding(actor));
   case 'idle-cycle':return JSON.stringify(planner.nativeInitialIdleBodyBinding(actor)??planner.nativeIdleCycleBinding(actor)??planner.nativeIdleStrollBinding(actor));
   case 'home-route':return JSON.stringify(planner.nativeHomeRequestReference(actor)??planner.nativeTaskSettlementBinding(actor));
   case 'home-arrival':return JSON.stringify(planner.nativeHomeRouteBinding(actor));
   case 'task-start':return JSON.stringify([request.request.requestHandle,request.request.requestSequence,request.policy]);
   case 'task-action':{const {executedThrough,...source}=request.request;return JSON.stringify(source);}
   case 'task-consequence':return JSON.stringify(planner.nativeTaskActionBinding(actor));
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
  const transaction={controller:new AbortController(),actorId:request.actorId,kind:request.kind,source:sourceIdentity(request),obsolete:false,promise:null,minSequence:publicationSequence()};active=transaction;
  transaction.promise=(async()=>{
   try{
    const {operation,prepare,...options}=request,result=await planner[operation]({...options,getPublication,signal:transaction.controller.signal,
     prepareResources:({resources:proposal,signal,deferredStart})=>resources[prepare](proposal,{signal,deferredStart,minSequence:transaction.minSequence,terrainManifest:manifest})});
    if(closed)return null;
    if(transaction.obsolete&&result.status==='control-failed'){last={actorId:request.actorId,kind:request.kind,status:'cancelled'};return {...result,status:'cancelled'};}
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
 function quiesce(){
  if(closed||fault)return Promise.reject(Error(fault?'Native intent production failed: '+fault:'Native intent production closed'));
  if(quiescence)return quiescence.promise;
  if(active&&!active.promise)return Promise.reject(Error('Native intent production operation is not ready'));
  // Holding dispatch is not completion. Only the existing operation's actual
  // settlement can certify a stable source; its errors remain terminal.
  const hold={receipt:Object.freeze({}),settled:false,promise:null};quiescence=hold;
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
