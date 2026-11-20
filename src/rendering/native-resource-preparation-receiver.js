const prepareKinds=new Set(['prepareNativeFarmArrivalResources','prepareNativeIdleStrollResources','prepareNativeGateResources','prepareNativeResumeResources','prepareNativeTaskStartResources','prepareNativeTaskActionResources','prepareNativeTaskConsequenceResources','prepareNativeTaskSettlementResources','prepareNativeInitialIdleBodyResources','prepareNativeIdleCycleResources','prepareNativeHomeRouteResources','prepareNativeHomeArrivalResources']);
const refreshKinds=new Set(['invalidateNativeFarmArrivalResources','refreshNativeFarmArrivalResources','invalidateNativeIdleStrollResources','refreshNativeIdleStrollResources','invalidateNativeResumeResources','refreshNativeResumeResources','invalidateNativeTaskStartResources','refreshNativeTaskStartResources','invalidateNativeTaskActionResources','refreshNativeTaskActionResources','invalidateNativeTaskConsequenceResources','refreshNativeTaskConsequenceResources','invalidateNativeTaskSettlementResources','invalidateNativeInitialIdleBodyResources','invalidateNativeIdleCycleResources','refreshNativeTaskSettlementResources','refreshNativeInitialIdleBodyResources','refreshNativeIdleCycleResources','invalidateNativeHomeRouteResources','refreshNativeHomeRouteResources','invalidateNativeHomeArrivalResources','refreshNativeHomeArrivalResources']);

// Retained handles stay in the existing graphical owner. An endpoint carries
// only resource declarations, receipts and lifecycle commands, never functions.
export function createNativeResourcePreparationReceiver({prepare,isRunning,canFlush=isRunning,postMessage,onCommit=()=>{},onError=()=>{}}){
 let entry=null,lastId=0,closed=false,inflight=0,flushId=null,callbacksSettled=null;
 function whenCallbacksSettled(){if(!inflight)return Promise.resolve();if(!callbacksSettled){let resolve;const promise=new Promise(done=>{resolve=done;});callbacksSettled={promise,resolve};}return callbacksSettled.promise;}
 function callbackFinished(){if(--inflight===0){const wait=callbacksSettled;callbacksSettled=null;wait?.resolve();}}
 function abortHandle(item){try{item.controller.abort();item.handle?.abort();}catch(cause){closed=true;const error=Error('Native resource cleanup failed: '+String(cause?.message??cause),{cause});onError(error);throw error;}}
 function cancel(){const old=entry;entry=null;if(old)abortHandle(old);}
 function accept(data){
  if(!prepareKinds.has(data?.kind)&&!refreshKinds.has(data?.kind)&&!['commitNativeGateResources','abortNativeGateResources','flushNativeResources'].includes(data?.kind))return false;
  if(!Number.isSafeInteger(data.id)||data.id<1)throw TypeError('Invalid native resource request');
  if(data.kind==='flushNativeResources'){
   // A retained failed renderer can drain the original endpoint while new
   // preparation remains forbidden. This receipt is not GPU health/admission.
   if(closed||!canFlush()||entry||flushId!==null||data.id<=lastId)throw Error('Native resource flush unavailable or preparation pending');
   lastId=data.id;flushId=data.id;
   const finish=()=>{try{if(closed||!canFlush()||entry||inflight)throw Error('Native resource flush unavailable');postMessage({kind:'nativeResourcesFlushed',id:data.id,version:1});return true;}finally{flushId=null;}};
   return inflight?whenCallbacksSettled().then(finish):finish();
  }
  if(prepareKinds.has(data.kind))return (async()=>{
   const item={id:data.id,controller:new AbortController(),handle:null,resources:data.resources};let tracked=false;
   try{
    if(closed||!isRunning()||entry||flushId!==null||data.id<=lastId)throw Error('Native gate preparation unavailable');lastId=data.id;entry=item;inflight++;tracked=true;
    if((data.kind==='prepareNativeFarmArrivalResources')!==(data.resources?.kind==='native-farm-arrival-route-proposal')&&(data.kind==='prepareNativeFarmArrivalResources'||data.resources?.kind==='native-farm-arrival-route-proposal'))throw Error('Native farm arrival resource request class mismatch');
    if((data.resources?.kind===24||data.resources?.kind===12&&data.resources.nativeStop!==undefined)&&data.kind!=='prepareNativeGateResources')throw Error('Native stop resource request class mismatch');
    item.handle=await prepare(data.kind,data.resources,{signal:item.controller.signal,minSequence:data.minSequence,terrainManifest:data.terrainManifest,deferredStart:data.deferredStart});
    if(closed||item.controller.signal.aborted||entry!==item)throw new DOMException('Native gate preparation cancelled','AbortError');
    postMessage({kind:'nativeGateResourcesResult',id:data.id,result:receipt(item)});
   }catch(error){if(entry===item)entry=null;abortHandle(item);if(!closed&&isRunning())postMessage({kind:'nativeGateResourcesError',id:data.id,message:String(error?.message??error)});}finally{if(tracked)callbackFinished();}
  })();
  const item=entry;if(!item||item.id!==data.id){if(data.id>lastId)throw Error('Unknown native resource request');return true;}
  if(refreshKinds.has(data.kind))return (async()=>{
   let tracked=false;
   try{
    if(item.resources?.kind===24||item.resources?.kind===12&&item.resources.nativeStop!==undefined)throw Error('Native stop cannot refresh another resource class');
    const farm=item.resources?.kind==='native-farm-arrival-route-proposal',stroll=item.resources?.kind==='native-idle-stroll-proposal',starting=item.resources?.kind==='native-task-start-proposal',acting=item.resources?.kind==='native-task-action-proposal',consequence=item.resources?.kind==='native-task-consequence-proposal',settlement=item.resources?.kind==='native-task-settlement-proposal',initialBody=item.resources?.kind==='native-initial-idle-body-proposal',cycle=item.resources?.kind==='native-idle-cycle-proposal',home=item.resources?.kind==='native-home-route-proposal',arrival=item.resources?.kind==='native-home-arrival-proposal';if(data.kind.includes('FarmArrival')!==farm||data.kind.includes('IdleStroll')!==stroll||data.kind.includes('TaskStart')!==starting||data.kind.includes('TaskAction')!==acting||data.kind.includes('TaskConsequence')!==consequence||data.kind.includes('TaskSettlement')!==settlement||data.kind.includes('InitialIdleBody')!==initialBody||data.kind.includes('IdleCycle')!==cycle||data.kind.includes('HomeRoute')!==home||data.kind.includes('HomeArrival')!==arrival)throw Error('Native resource request class mismatch');
    if(data.kind.startsWith('invalidate')){if(item.handle?.invalidate?.()!==true)throw Error('Native resume invalidation unavailable');return;}
    inflight++;tracked=true;const reusable=await item.handle.refresh(data.resources,{terrainManifest:data.terrainManifest});
    if(closed||item.controller.signal.aborted||entry!==item)throw new DOMException('Native resume refresh cancelled','AbortError');
    if(!reusable)cancel();else item.resources=data.resources;
    postMessage({kind:'nativeGateResourcesResult',id:data.id,result:{reusable,...(reusable?receipt(item):{})}});
   }catch(error){if(entry===item)cancel();if(!closed&&isRunning())postMessage({kind:'nativeGateResourcesError',id:data.id,message:String(error?.message??error)});}finally{if(tracked)callbackFinished();}
  })();
  entry=null;
  if(data.kind==='abortNativeGateResources'){abortHandle(item);return true;}
  try{if(item.handle?.commit(data.commit)!==true)throw Error('Native gate resources not committed');onCommit();}
  catch(error){closed=true;abortHandle(item);onError(error);}return true;
 }
 function receipt(item){return {...(item.handle.preparedFarmArrivalStopTemplate?{preparedFarmArrivalStopTemplate:item.handle.preparedFarmArrivalStopTemplate}:{}),...(item.handle.preparedIdleStrollStopTemplate?{preparedIdleStrollStopTemplate:item.handle.preparedIdleStrollStopTemplate}:{}),...(item.handle.preparedFarmArrivalTemplate?{preparedFarmArrivalTemplate:item.handle.preparedFarmArrivalTemplate}:{}),...(item.handle.preparedIdleStrollTemplate?{preparedIdleStrollTemplate:item.handle.preparedIdleStrollTemplate}:{}),...(item.handle.preparedHomeArrivalTemplate?{preparedHomeArrivalTemplate:item.handle.preparedHomeArrivalTemplate}:{}),...(item.handle.preparedHomeRouteTemplate?{preparedHomeRouteTemplate:item.handle.preparedHomeRouteTemplate}:{}),worldBoundary:item.resources.worldBoundary,preparedWorldBoundary:item.handle.preparedWorldBoundary,...(item.handle.preparedResumeTemplate?{preparedResumeTemplate:item.handle.preparedResumeTemplate}:{}),...(item.handle.preparedTaskStartTemplate?{preparedTaskStartTemplate:item.handle.preparedTaskStartTemplate}:{}),...(item.handle.preparedTaskActionTemplate?{preparedTaskActionTemplate:item.handle.preparedTaskActionTemplate}:{}),...(item.handle.preparedTaskSettlementTemplate?{preparedTaskSettlementTemplate:item.handle.preparedTaskSettlementTemplate}:{}),...(item.handle.preparedInitialIdleBodyTemplate?{preparedInitialIdleBodyTemplate:item.handle.preparedInitialIdleBodyTemplate}:{}),...(item.handle.preparedIdleCycleTemplate?{preparedIdleCycleTemplate:item.handle.preparedIdleCycleTemplate}:{}),...(item.handle.preparedTaskConsequenceTemplate?{preparedTaskConsequenceTemplate:item.handle.preparedTaskConsequenceTemplate}:{})};}
 return {accept,whenCallbacksSettled,dispose(){if(closed)return;closed=true;cancel();},status:()=>({closed,pending:entry?.id??null,lastId,inflight,flushing:flushId})};
}

// A direct authority connection uses the very same receiver as the ordinary
// graphical client. Session scope belongs to the endpoint, not to a GPU lease.
export function attachNativeResourcePreparationEndpoint({port,session,onClosed=()=>{},...options}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session)throw TypeError('Invalid native resource endpoint');
 let closed=false;
 const receiver=createNativeResourcePreparationReceiver({...options,postMessage:message=>port.postMessage({...message,session})});
 function close(message='Native resource preparer closed'){
  if(closed)return;closed=true;try{receiver.dispose();}finally{try{port.postMessage({kind:'nativeResourcesClosed',session,message});}catch{}port.onmessage=port.onmessageerror=null;port.close?.();receiver.whenCallbacksSettled().then(()=>onClosed());}
 }
 port.onmessage=({data})=>{try{
  if(data?.session!==session)throw Error('Native resource session mismatch');
  if(data.kind==='nativeResourcesClose'){close();return;}
  const result=receiver.accept(data);if(result===false)throw Error('Unknown native resource request');
  Promise.resolve(result).catch(error=>close(String(error?.message??error)));
 }catch(error){close(String(error?.message??error));}};
 port.onmessageerror=()=>close('Native resource request transfer failed');port.start?.();
 try{port.postMessage({kind:'nativeResourcesReady',session,version:1});}catch(error){close();throw error;}
 return {dispose:close,status:()=>{const status=receiver.status();return {...status,closed:closed||status.closed};}};
}
