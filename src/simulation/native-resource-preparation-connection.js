import {createNativeResourcePreparationClient} from './native-resource-preparation-client.js';

// This endpoint never enters the authority command FIFO. The graphics owner
// retains every preparation; these bounded proxies hold no scene or trajectory.
export function createNativeResourcePreparationConnection({port,session,timeoutMs=10000,onError=()=>{}}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session||!Number.isFinite(timeoutMs)||timeoutMs<=0||typeof onError!=='function')throw TypeError('Invalid native resource connection');
 const pending=new Map(),handles=new Set();let phase='connecting',serial=0,resolveReady,rejectReady,fault=null,retirementVersion=0,retired=null,retirement=null;
 const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 const timer=setTimeout(()=>fail(Error('Native resource connection timed out')),timeoutMs);timer.unref?.();
 const send=message=>port.postMessage({...message,session});
 function allocateId(){if(serial>=Number.MAX_SAFE_INTEGER)throw Error('Native resource IDs exhausted');return ++serial;}
 const client=createNativeResourcePreparationClient({allocateId,pending,postMessage:send,isRunning:()=>phase==='running',hasDirectControl:()=>true,timeoutMs});
 function closePort(){port.onmessage=port.onmessageerror=null;port.close?.();}
 function finishRetirement(error=null){
  const item=retirement;if(!item)return;retirement=null;clearTimeout(item.timer);
  if(error)item.reject(error);else{retired=Object.freeze({version:1,session,terminal:true,callbacksSettled:true});item.resolve(retired);}closePort();
 }
 function beginRetirement(){
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});promise.catch(()=>{});
  retirement={promise,resolve,reject,timer:setTimeout(()=>finishRetirement(Error('Native resource retirement timed out')),timeoutMs)};retirement.timer.unref?.();
 }
 function close(error,{awaitRetirement=false}={}){
  if(!awaitRetirement){finishRetirement(error??Error('Native resource connection disposed'));retired=null;}
  if(phase==='closed'||phase==='failed')return;
  for(const handle of handles)try{handle.abort();}catch{}handles.clear();try{send({kind:'nativeResourcesClose'});}catch{}
  phase=error?'failed':'closed';fault=error?.message??null;clearTimeout(timer);const reason=error??Error('Native resource connection disposed');rejectReady(reason);for(const item of pending.values())item.reject(reason);pending.clear();if(!awaitRetirement)closePort();
 }
 function fail(error){if(phase==='closed'||phase==='failed'){finishRetirement(error);return;}close(error);onError(error);}
 port.onmessage=({data})=>{try{
  if(data?.session!==session)throw Error('Native resource session mismatch');
  if(retirement){
   if(data.kind!=='nativeResourcesRetired'||data.retirementVersion!==2||data.callbacksSettled!==true)throw Error('Invalid native resource retirement receipt');
   finishRetirement();return;
  }
  if(data.kind==='nativeResourcesClosed'){
   const error=Error(data.message||'Native resource preparer closed');
   if(data.retirementVersion!==undefined){
    if(phase!=='running'||retirementVersion!==2||data.retirementVersion!==2||data.callbacksSettled!==undefined)throw Error('Invalid native resource close receipt');
    beginRetirement();close(error,{awaitRetirement:true});onError(error);return;
   }
   throw error;
  }
  if(data.kind==='nativeResourcesReady'){if(phase!=='connecting'||data.version!==1)throw Error('Invalid native resource handshake');if(data.retirementVersion!==undefined&&![1,2].includes(data.retirementVersion))throw Error('Invalid native resource retirement capability');retirementVersion=data.retirementVersion??0;clearTimeout(timer);phase='running';resolveReady({version:1,session});return;}
  if(phase!=='running'||!['nativeGateResourcesResult','nativeGateResourcesError','nativeResourcesFlushed'].includes(data.kind)||!Number.isSafeInteger(data.id)||data.id<1||data.id>serial)throw Error('Invalid native resource response');
  const item=pending.get(data.id);if(!item)return;
  if(item.kind==='flush'){if(data.kind!=='nativeResourcesFlushed'||data.version!==1)throw Error('Invalid native resource flush response');pending.delete(data.id);item.resolve({version:1});return;}
  if(data.kind==='nativeResourcesFlushed')throw Error('Unexpected native resource flush response');
  pending.delete(data.id);if(data.kind==='nativeGateResourcesError')item.reject(Error(data.message||'Native resource preparation failed'));else item.resolve(data.result);
 }catch(error){fail(error);}};
 port.onmessageerror=()=>fail(Error('Native resource response transfer failed'));port.start?.();
 function waitReady(signal){if(signal?.aborted)return Promise.reject(new DOMException('Native resource preparation cancelled','AbortError'));if(!signal)return ready;return new Promise((resolve,reject)=>{const abort=()=>{signal.removeEventListener('abort',abort);reject(new DOMException('Native resource preparation cancelled','AbortError'));};signal.addEventListener('abort',abort,{once:true});ready.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});});}
 async function flush(){
  await ready;if(phase!=='running')throw Error('Native resource flush unavailable');
  if(handles.size||pending.size)throw Error('Native resource preparation already pending');
  const id=allocateId();
  // Same-port reply follows earlier synchronous commit/abort callbacks. It is
  // not a GPU completion, frame witness, or permission to skip a preparation.
  return new Promise((resolve,reject)=>{let deadline;const settle=fn=>value=>{clearTimeout(deadline);fn(value);};pending.set(id,{kind:'flush',resolve:settle(resolve),reject:settle(reject)});deadline=setTimeout(()=>fail(Error('Native resource flush timed out')),timeoutMs);deadline.unref?.();try{send({kind:'flushNativeResources',id});}catch(error){fail(error);}});
 }
 // A terminal callback receipt is NOT a live flush or a GPU drain. Only the
 // recovery caller, after suspending native production, may consume this fact.
 async function settleForRecovery(){
  await ready;if(retired)return retired;if(retirement)return retirement.promise;
  try{return await flush();}catch(error){if(retired)return retired;if(retirement)return retirement.promise;throw error;}
 }
 async function prepare(method,resources,options={}){
  options={...options};
  await waitReady(options.signal);if(phase!=='running')throw Error('Native resource connection unavailable');
  // One native proposal exists at a time; a second request cannot accumulate
  // retained scene snapshots while the first preparation is awaiting commit.
  if(handles.size||pending.size)throw Error('Native resource preparation already pending');
  let handle=await client[method](resources,options);if(phase!=='running'||options.signal?.aborted){handle.abort();throw new DOMException('Native resource connection closed during preparation','AbortError');}
  let refreshing=false;
  const release=()=>{handles.delete(token);options.signal?.removeEventListener('abort',onAbort);},onAbort=()=>{release();handle.abort();};
  const token={...(method==='prepareNativeShieldGeometry'?{async capture(resources,captureOptions){
   if(refreshing||!handles.has(token)||phase!=='running'||typeof handle.capture!=='function')throw Error('Shield geometry is not available for capture');
   refreshing=true;
   try{handle=await handle.capture(resources,captureOptions);return token;}catch(error){release();handle.abort();throw error;}finally{refreshing=false;}
  }}:{}),get preparedAnimalCropRouteTemplate(){return handle.preparedAnimalCropRouteTemplate;},get preparedAnimalCropStrikeTemplate(){return handle.preparedAnimalCropStrikeTemplate;},get preparedBarrierAdditionTemplate(){return handle.preparedBarrierAdditionTemplate;},get preparedTaskRouteStopTemplate(){return handle.preparedTaskRouteStopTemplate;},get preparedFarmArrivalStopTemplate(){return handle.preparedFarmArrivalStopTemplate;},get preparedIdleStrollStopTemplate(){return handle.preparedIdleStrollStopTemplate;},get preparedFarmArrivalTemplate(){return handle.preparedFarmArrivalTemplate;},get preparedIdleStrollTemplate(){return handle.preparedIdleStrollTemplate;},get preparedHomeArrivalTemplate(){return handle.preparedHomeArrivalTemplate;},get preparedHomeRouteTemplate(){return handle.preparedHomeRouteTemplate;},get preparedTaskSettlementTemplate(){return handle.preparedTaskSettlementTemplate;},get preparedInitialIdleBodyTemplate(){return handle.preparedInitialIdleBodyTemplate;},get preparedIdleCycleTemplate(){return handle.preparedIdleCycleTemplate;},get preparedWorldBoundary(){return handle.preparedWorldBoundary;},get preparedTaskConsequenceTemplate(){return handle.preparedTaskConsequenceTemplate;},get preparedTaskActionTemplate(){return handle.preparedTaskActionTemplate;},get preparedTaskStartTemplate(){return handle.preparedTaskStartTemplate;},get preparedResumeTemplate(){return handle.preparedResumeTemplate;},valid:()=>phase==='running'&&handle.valid(),...(typeof handle.refresh==='function'?{invalidate:()=>handle.invalidate(),async refresh(...args){if(refreshing)throw Error('Native resource refresh already pending');refreshing=true;try{const reusable=await handle.refresh(...args);if(!reusable)release();return reusable;}catch(error){release();throw error;}finally{refreshing=false;}}}:{}),commit(data){const committed=phase==='running'&&typeof handle.commit==='function'&&handle.commit(data);if(committed)release();return committed;},abort(){release();return handle.abort();}};
  handles.add(token);options.signal?.addEventListener('abort',onAbort,{once:true});if(options.signal?.aborted)onAbort();return token;
 }
 return {ready,flush,settleForRecovery,prepareNativeShieldGeometry:(source,options)=>prepare('prepareNativeShieldGeometry',source,options),prepareNativeAnimalCropRouteResources:(resources,options)=>prepare('prepareNativeAnimalCropRouteResources',resources,options),prepareNativeAnimalCropStrikeResources:(resources,options)=>prepare('prepareNativeAnimalCropStrikeResources',resources,options),prepareNativeFarmArrivalResources:(resources,options)=>prepare('prepareNativeFarmArrivalResources',resources,options),prepareNativeIdleStrollResources:(resources,options)=>prepare('prepareNativeIdleStrollResources',resources,options),prepareNativeHomeArrivalResources:(resources,options)=>prepare('prepareNativeHomeArrivalResources',resources,options),prepareNativeHomeRouteResources:(resources,options)=>prepare('prepareNativeHomeRouteResources',resources,options),prepareNativeGateResources:(resources,options)=>prepare('prepareNativeGateResources',resources,options),prepareNativeBarrierAdditionResources:(resources,options)=>prepare('prepareNativeBarrierAdditionResources',resources,options),prepareNativeResumeResources:(resources,options)=>prepare('prepareNativeResumeResources',resources,options),prepareNativeTaskStartResources:(resources,options)=>prepare('prepareNativeTaskStartResources',resources,options),prepareNativeTaskActionResources:(resources,options)=>prepare('prepareNativeTaskActionResources',resources,options),prepareNativeTaskConsequenceResources:(resources,options)=>prepare('prepareNativeTaskConsequenceResources',resources,options),prepareNativeTaskSettlementResources:(resources,options)=>prepare('prepareNativeTaskSettlementResources',resources,options),prepareNativeInitialIdleBodyResources:(resources,options)=>prepare('prepareNativeInitialIdleBodyResources',resources,options),prepareNativeIdleCycleResources:(resources,options)=>prepare('prepareNativeIdleCycleResources',resources,options),dispose:()=>close(),status:()=>({phase,fault,pending:pending.size,retained:handles.size})};
}
