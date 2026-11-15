import {createNativeResourcePreparationClient} from './native-resource-preparation-client.js';

// This endpoint never enters the authority command FIFO. The graphics owner
// retains every preparation; these bounded proxies hold no scene or trajectory.
export function createNativeResourcePreparationConnection({port,session,timeoutMs=10000,onError=()=>{}}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session||!Number.isFinite(timeoutMs)||timeoutMs<=0||typeof onError!=='function')throw TypeError('Invalid native resource connection');
 const pending=new Map(),handles=new Set();let phase='connecting',serial=0,resolveReady,rejectReady,fault=null;
 const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 const timer=setTimeout(()=>fail(Error('Native resource connection timed out')),timeoutMs);timer.unref?.();
 const send=message=>port.postMessage({...message,session});
 const client=createNativeResourcePreparationClient({allocateId:()=>{if(serial>=Number.MAX_SAFE_INTEGER)throw Error('Native resource IDs exhausted');return ++serial;},pending,postMessage:send,isRunning:()=>phase==='running',hasDirectControl:()=>true,timeoutMs});
 function close(error){if(phase==='closed'||phase==='failed')return;for(const handle of handles)try{handle.abort();}catch{}handles.clear();try{send({kind:'nativeResourcesClose'});}catch{}phase=error?'failed':'closed';fault=error?.message??null;clearTimeout(timer);const reason=error??Error('Native resource connection disposed');rejectReady(reason);for(const item of pending.values())item.reject(reason);pending.clear();port.onmessage=port.onmessageerror=null;port.close?.();}
 function fail(error){if(phase==='closed'||phase==='failed')return;close(error);onError(error);}
 port.onmessage=({data})=>{try{
  if(data?.session!==session)throw Error('Native resource session mismatch');
  if(data.kind==='nativeResourcesClosed')throw Error(data.message||'Native resource preparer closed');
  if(data.kind==='nativeResourcesReady'){if(phase!=='connecting'||data.version!==1)throw Error('Invalid native resource handshake');clearTimeout(timer);phase='running';resolveReady({version:1,session});return;}
  if(phase!=='running'||!['nativeGateResourcesResult','nativeGateResourcesError'].includes(data.kind)||!Number.isSafeInteger(data.id)||data.id<1||data.id>serial)throw Error('Invalid native resource response');
  const item=pending.get(data.id);if(!item)return;pending.delete(data.id);if(data.kind==='nativeGateResourcesError')item.reject(Error(data.message||'Native resource preparation failed'));else item.resolve(data.result);
 }catch(error){fail(error);}};
 port.onmessageerror=()=>fail(Error('Native resource response transfer failed'));port.start?.();
 function waitReady(signal){if(signal?.aborted)return Promise.reject(new DOMException('Native resource preparation cancelled','AbortError'));if(!signal)return ready;return new Promise((resolve,reject)=>{const abort=()=>{signal.removeEventListener('abort',abort);reject(new DOMException('Native resource preparation cancelled','AbortError'));};signal.addEventListener('abort',abort,{once:true});ready.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});});}
 async function prepare(method,resources,options={}){
  options={...options};
  await waitReady(options.signal);if(phase!=='running')throw Error('Native resource connection unavailable');
  // One native proposal exists at a time; a second request cannot accumulate
  // retained scene snapshots while the first preparation is awaiting commit.
  if(handles.size||pending.size)throw Error('Native resource preparation already pending');
  const handle=await client[method](resources,options);if(phase!=='running'||options.signal?.aborted){handle.abort();throw new DOMException('Native resource connection closed during preparation','AbortError');}
  let refreshing=false;
  const release=()=>{handles.delete(token);options.signal?.removeEventListener('abort',onAbort);},onAbort=()=>{release();handle.abort();};
  const token={get preparedWorldBoundary(){return handle.preparedWorldBoundary;},get preparedTaskActionTemplate(){return handle.preparedTaskActionTemplate;},get preparedTaskStartTemplate(){return handle.preparedTaskStartTemplate;},get preparedResumeTemplate(){return handle.preparedResumeTemplate;},valid:()=>phase==='running'&&handle.valid(),...(typeof handle.refresh==='function'?{invalidate:()=>handle.invalidate(),async refresh(...args){if(refreshing)throw Error('Native resource refresh already pending');refreshing=true;try{const reusable=await handle.refresh(...args);if(!reusable)release();return reusable;}catch(error){release();throw error;}finally{refreshing=false;}}}:{}),commit(data){const committed=phase==='running'&&handle.commit(data);if(committed)release();return committed;},abort(){release();return handle.abort();}};
  handles.add(token);options.signal?.addEventListener('abort',onAbort,{once:true});if(options.signal?.aborted)onAbort();return token;
 }
 return {ready,prepareNativeGateResources:(resources,options)=>prepare('prepareNativeGateResources',resources,options),prepareNativeResumeResources:(resources,options)=>prepare('prepareNativeResumeResources',resources,options),prepareNativeTaskStartResources:(resources,options)=>prepare('prepareNativeTaskStartResources',resources,options),prepareNativeTaskActionResources:(resources,options)=>prepare('prepareNativeTaskActionResources',resources,options),dispose:()=>close(),status:()=>({phase,fault,pending:pending.size,retained:handles.size})};
}
