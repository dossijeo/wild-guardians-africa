const prepareKinds=new Set(['prepareNativeGateResources','prepareNativeResumeResources','prepareNativeTaskStartResources','prepareNativeTaskActionResources','prepareNativeTaskConsequenceResources']);
const refreshKinds=new Set(['invalidateNativeResumeResources','refreshNativeResumeResources','invalidateNativeTaskStartResources','refreshNativeTaskStartResources','invalidateNativeTaskActionResources','refreshNativeTaskActionResources','invalidateNativeTaskConsequenceResources','refreshNativeTaskConsequenceResources']);

// Retained handles stay in the existing graphical owner. An endpoint carries
// only resource declarations, receipts and lifecycle commands, never functions.
export function createNativeResourcePreparationReceiver({prepare,isRunning,postMessage,onCommit=()=>{},onError=()=>{}}){
 let entry=null,lastId=0,closed=false;
 function cancel(){const old=entry;entry=null;if(old){old.controller.abort();old.handle?.abort();}}
 function accept(data){
  if(!prepareKinds.has(data?.kind)&&!refreshKinds.has(data?.kind)&&!['commitNativeGateResources','abortNativeGateResources'].includes(data?.kind))return false;
  if(!Number.isSafeInteger(data.id)||data.id<1)throw TypeError('Invalid native resource request');
  if(prepareKinds.has(data.kind))return (async()=>{
   const item={id:data.id,controller:new AbortController(),handle:null,resources:data.resources};
   try{
    if(closed||!isRunning()||entry||data.id<=lastId)throw Error('Native gate preparation unavailable');lastId=data.id;entry=item;
    item.handle=await prepare(data.kind,data.resources,{signal:item.controller.signal,minSequence:data.minSequence,terrainManifest:data.terrainManifest,deferredStart:data.deferredStart});
    if(closed||item.controller.signal.aborted||entry!==item)throw new DOMException('Native gate preparation cancelled','AbortError');
    postMessage({kind:'nativeGateResourcesResult',id:data.id,result:receipt(item)});
   }catch(error){if(entry===item)entry=null;item.controller.abort();item.handle?.abort();if(!closed&&isRunning())postMessage({kind:'nativeGateResourcesError',id:data.id,message:String(error?.message??error)});}
  })();
  const item=entry;if(!item||item.id!==data.id){if(data.id>lastId)throw Error('Unknown native resource request');return true;}
  if(refreshKinds.has(data.kind))return (async()=>{
   try{
    const starting=item.resources?.kind==='native-task-start-proposal',acting=item.resources?.kind==='native-task-action-proposal',consequence=item.resources?.kind==='native-task-consequence-proposal';if(data.kind.includes('TaskStart')!==starting||data.kind.includes('TaskAction')!==acting||data.kind.includes('TaskConsequence')!==consequence)throw Error('Native resource request class mismatch');
    if(data.kind.startsWith('invalidate')){if(item.handle?.invalidate?.()!==true)throw Error('Native resume invalidation unavailable');return;}
    const reusable=await item.handle.refresh(data.resources,{terrainManifest:data.terrainManifest});
    if(closed||item.controller.signal.aborted||entry!==item)throw new DOMException('Native resume refresh cancelled','AbortError');
    if(!reusable)cancel();else item.resources=data.resources;
    postMessage({kind:'nativeGateResourcesResult',id:data.id,result:{reusable,...(reusable?receipt(item):{})}});
   }catch(error){if(entry===item)cancel();if(!closed&&isRunning())postMessage({kind:'nativeGateResourcesError',id:data.id,message:String(error?.message??error)});}
  })();
  entry=null;
  try{if(data.kind==='commitNativeGateResources'){if(item.handle?.commit(data.commit)!==true)throw Error('Native gate resources not committed');onCommit();}else{item.controller.abort();item.handle?.abort();}}
  catch(error){item.controller.abort();item.handle?.abort();onError(error);}return true;
 }
 function receipt(item){return {worldBoundary:item.resources.worldBoundary,preparedWorldBoundary:item.handle.preparedWorldBoundary,...(item.handle.preparedResumeTemplate?{preparedResumeTemplate:item.handle.preparedResumeTemplate}:{}),...(item.handle.preparedTaskStartTemplate?{preparedTaskStartTemplate:item.handle.preparedTaskStartTemplate}:{}),...(item.handle.preparedTaskActionTemplate?{preparedTaskActionTemplate:item.handle.preparedTaskActionTemplate}:{}),...(item.handle.preparedTaskConsequenceTemplate?{preparedTaskConsequenceTemplate:item.handle.preparedTaskConsequenceTemplate}:{})};}
 return {accept,dispose(){if(closed)return;closed=true;cancel();},status:()=>({closed,pending:entry?.id??null,lastId})};
}

// A direct authority connection uses the very same receiver as the ordinary
// graphical client. Session scope belongs to the endpoint, not to a GPU lease.
export function attachNativeResourcePreparationEndpoint({port,session,onClosed=()=>{},...options}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session)throw TypeError('Invalid native resource endpoint');
 let closed=false;
 const receiver=createNativeResourcePreparationReceiver({...options,postMessage:message=>port.postMessage({...message,session})});
 function close(message='Native resource preparer closed'){
  if(closed)return;closed=true;try{receiver.dispose();}finally{try{port.postMessage({kind:'nativeResourcesClosed',session,message});}catch{}port.onmessage=port.onmessageerror=null;port.close?.();onClosed();}
 }
 port.onmessage=({data})=>{try{
  if(data?.session!==session)throw Error('Native resource session mismatch');
  if(data.kind==='nativeResourcesClose'){close();return;}
  const result=receiver.accept(data);if(result===false)throw Error('Unknown native resource request');
  Promise.resolve(result).catch(error=>close(String(error?.message??error)));
 }catch(error){close(String(error?.message??error));}};
 port.onmessageerror=()=>close('Native resource request transfer failed');port.start?.();
 try{port.postMessage({kind:'nativeResourcesReady',session,version:1});}catch(error){close();throw error;}
 return {dispose:close,status:()=>({...receiver.status(),closed})};
}
