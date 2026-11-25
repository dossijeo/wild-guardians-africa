import {centerSource,sameCenter,matchesCenterRuinCommit} from '../world/native-center-ruin-source.js';
import {copyNativeShieldWorld,sameNativeShieldWorld} from '../world/native-shield-world.js';
import {terrainStopProposalProtocol,hasOtherTerrainStopField} from '../simulation/terrain-stop-reservation.js';
import {sameNativeWorldBoundary} from '../world/native-world-boundary.js';

const prepareKinds=new Set(['prepareNativeShieldGeometry','prepareNativeAnimalCropRouteResources','prepareNativeAnimalCropStrikeResources','prepareNativeFarmArrivalResources','prepareNativeIdleStrollResources','prepareNativeGateResources','prepareNativeBarrierAdditionResources','prepareNativeResumeResources','prepareNativeTaskStartResources','prepareNativeTaskActionResources','prepareNativeTaskConsequenceResources','prepareNativeTaskSettlementResources','prepareNativeInitialIdleBodyResources','prepareNativeIdleCycleResources','prepareNativeHomeRouteResources','prepareNativeHomeArrivalResources']);
const refreshKinds=new Set(['refreshNativeAnimalCropRouteResources','refreshNativeAnimalCropStrikeResources','invalidateNativeAnimalCropRouteResources','invalidateNativeAnimalCropStrikeResources','invalidateNativeFarmArrivalResources','refreshNativeFarmArrivalResources','invalidateNativeIdleStrollResources','refreshNativeIdleStrollResources','invalidateNativeResumeResources','refreshNativeResumeResources','invalidateNativeTaskStartResources','refreshNativeTaskStartResources','invalidateNativeTaskActionResources','refreshNativeTaskActionResources','invalidateNativeTaskConsequenceResources','refreshNativeTaskConsequenceResources','invalidateNativeTaskSettlementResources','invalidateNativeInitialIdleBodyResources','invalidateNativeIdleCycleResources','refreshNativeTaskSettlementResources','refreshNativeInitialIdleBodyResources','refreshNativeIdleCycleResources','invalidateNativeHomeRouteResources','refreshNativeHomeRouteResources','invalidateNativeHomeArrivalResources','refreshNativeHomeArrivalResources']);

// Retained handles stay in the existing graphical owner. An endpoint carries
// only resource declarations, receipts and lifecycle commands, never functions.
export function createNativeResourcePreparationReceiver({prepare,isRunning,canFlush=isRunning,postMessage,onCommit=()=>{},onError=()=>{}}){
 let entry=null,lastId=0,closed=false,inflight=0,flushId=null,callbacksSettled=null;
 function whenCallbacksSettled(){if(!inflight)return Promise.resolve();if(!callbacksSettled){let resolve;const promise=new Promise(done=>{resolve=done;});callbacksSettled={promise,resolve};}return callbacksSettled.promise;}
 function callbackFinished(){if(--inflight===0){const wait=callbacksSettled;callbacksSettled=null;wait?.resolve();}}
 function abortHandle(item){try{item.controller.abort();item.handle?.abort();}catch(cause){closed=true;const error=Error('Native resource cleanup failed: '+String(cause?.message??cause),{cause});onError(error);throw error;}}
 function cancel(){const old=entry;entry=null;if(old)abortHandle(old);}
 function accept(data){
  if(!prepareKinds.has(data?.kind)&&!refreshKinds.has(data?.kind)&&!['captureNativeShieldResources','commitNativeGateResources','abortNativeGateResources','flushNativeResources'].includes(data?.kind))return false;
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
    if((data.kind==='prepareNativeAnimalCropRouteResources')!==(data.resources?.kind==='native-animal-crop-route-proposal'))throw Error('Native crop resource request class mismatch');
    if((data.kind==='prepareNativeAnimalCropStrikeResources')!==(data.resources?.kind==='native-animal-crop-strike-proposal'))throw Error('Native crop resource request class mismatch');
    item.geometry=data.kind==='prepareNativeShieldGeometry'?copyNativeShieldWorld(data.resources,3,{proposal:true}):null;
    item.barrier=data.kind==='prepareNativeBarrierAdditionResources';
    if(item.barrier!==(data.resources?.kind==='native-barrier-addition-proposal')||(item.barrier?!Array.isArray(data.nativeBarrierWallEntities):data.nativeBarrierWallEntities!==undefined))throw Error('Native solid addition resource request class mismatch');
    item.stop=terrainStopProposalProtocol(data.resources);
    item.center=data.resources?.kind==='native-center-ruin-proposal'?centerSource(data.resources.nativeCenterRuin):null;
    if(item.center&&(data.kind!=='prepareNativeGateResources'||data.resources.version!==1||item.stop||item.barrier||data.deferredStart!==undefined||
      !sameNativeWorldBoundary(item.center.boundary,data.resources.worldBoundary)))throw Error('Center ruin resource request class mismatch');
    if(item.stop&&data.kind!=='prepareNativeGateResources')throw Error('Native stop resource request class mismatch');
    item.handle=await prepare(data.kind,data.resources,{signal:item.controller.signal,minSequence:data.minSequence,terrainManifest:data.terrainManifest,deferredStart:data.deferredStart,...(item.barrier?{nativeBarrierWallEntities:data.nativeBarrierWallEntities}:{})});
    if(closed||item.controller.signal.aborted||entry!==item)throw new DOMException('Native gate preparation cancelled','AbortError');
    postMessage({kind:'nativeGateResourcesResult',id:data.id,result:item.geometry?{version:1,shieldGeometry:item.geometry}:receipt(item)});
   }catch(error){if(entry===item)entry=null;abortHandle(item);if(!closed&&isRunning())postMessage({kind:'nativeGateResourcesError',id:data.id,message:String(error?.message??error)});}finally{if(tracked)callbackFinished();}
  })();
  const item=entry;if(!item||item.id!==data.id){if(data.id>lastId)throw Error('Unknown native resource request');return true;}
  if(data.kind==='captureNativeShieldResources')return (async()=>{
   let tracked=false;
   try{
    const resources=data.resources;
    if(!item.geometry||!item.handle||item.capturing||resources?.kind!==3||resources.phase!=='proposal'||
       !sameNativeShieldWorld(item.geometry,copyNativeShieldWorld(resources.nativeShield,3,{proposal:true})))throw Error('Shield capture requires its own prepared geometry');
    item.capturing=true;inflight++;tracked=true;
    const handle=await prepare('prepareNativeGateResources',resources,{signal:item.controller.signal,minSequence:data.minSequence,shieldGeometry:item.handle});
    if(closed||item.controller.signal.aborted||entry!==item){handle.abort();throw new DOMException('Shield capture cancelled','AbortError');}
    item.handle=handle;item.resources=resources;item.geometry=null;
    postMessage({kind:'nativeGateResourcesResult',id:data.id,result:receipt(item)});
   }catch(error){if(entry===item)entry=null;if(!item.controller.signal.aborted)abortHandle(item);if(!closed&&isRunning())postMessage({kind:'nativeGateResourcesError',id:data.id,message:String(error?.message??error)});}finally{if(tracked)callbackFinished();}
  })();
  if(refreshKinds.has(data.kind))return (async()=>{
   let tracked=false;
   try{
    if(item.center)throw Error('Center ruin resources cannot refresh');
    if(item.stop)throw Error('Native stop cannot refresh another resource class');if(item.barrier)throw Error('Native solid additions cannot refresh another resource class');
    const farm=item.resources?.kind==='native-farm-arrival-route-proposal',stroll=item.resources?.kind==='native-idle-stroll-proposal',starting=item.resources?.kind==='native-task-start-proposal',acting=item.resources?.kind==='native-task-action-proposal',consequence=item.resources?.kind==='native-task-consequence-proposal',settlement=item.resources?.kind==='native-task-settlement-proposal',initialBody=item.resources?.kind==='native-initial-idle-body-proposal',cycle=item.resources?.kind==='native-idle-cycle-proposal',home=item.resources?.kind==='native-home-route-proposal',arrival=item.resources?.kind==='native-home-arrival-proposal';if(data.kind.includes('FarmArrival')!==farm||data.kind.includes('IdleStroll')!==stroll||data.kind.includes('TaskStart')!==starting||data.kind.includes('TaskAction')!==acting||data.kind.includes('TaskConsequence')!==consequence||data.kind.includes('TaskSettlement')!==settlement||data.kind.includes('InitialIdleBody')!==initialBody||data.kind.includes('IdleCycle')!==cycle||data.kind.includes('HomeRoute')!==home||data.kind.includes('HomeArrival')!==arrival)throw Error('Native resource request class mismatch');
    if(data.kind.includes('AnimalCropRoute')!==(item.resources?.kind==='native-animal-crop-route-proposal'))throw Error('Native crop resource refresh class mismatch');
    if(data.kind.includes('AnimalCropStrike')!==(item.resources?.kind==='native-animal-crop-strike-proposal'))throw Error('Native crop resource refresh class mismatch');
    if(data.kind.startsWith('invalidate')){if(item.handle?.invalidate?.()!==true)throw Error('Native resume invalidation unavailable');return;}
    inflight++;tracked=true;const reusable=await item.handle.refresh(data.resources,{terrainManifest:data.terrainManifest});
    if(closed||item.controller.signal.aborted||entry!==item)throw new DOMException('Native resume refresh cancelled','AbortError');
    if(!reusable)cancel();else item.resources=data.resources;
    postMessage({kind:'nativeGateResourcesResult',id:data.id,result:{reusable,...(reusable?receipt(item):{})}});
   }catch(error){if(entry===item)cancel();if(!closed&&isRunning())postMessage({kind:'nativeGateResourcesError',id:data.id,message:String(error?.message??error)});}finally{if(tracked)callbackFinished();}
  })();
  entry=null;
  if(data.kind==='abortNativeGateResources'){abortHandle(item);return true;}
  try{
   if(!!item.center!==(data.commit?.nativeCenterRuin!==undefined)||
      item.center&&!matchesCenterRuinCommit(item.center,data.commit))throw Error('Center ruin resource commit differs from retained template');
   if(item.geometry)throw Error('Shield geometry alone cannot commit a world');if(hasOtherTerrainStopField(data.commit,'bindingField',item.stop))throw Error('Native stop resource commit has another family');if(item.barrier!==(data.commit?.nativeBarrierAdditionBinding!==undefined))throw Error('Native solid addition commit has another family');if(item.handle?.commit(data.commit)!==true)throw Error('Native gate resources not committed');onCommit();}
  catch(error){closed=true;abortHandle(item);onError(error);}return true;
 }
 function receipt(item){
  const field=item.stop?.preparedTemplateField;
  if(hasOtherTerrainStopField(item.handle,'preparedTemplateField',item.stop))throw Error('Native stop receipt has another family');
  if(item.barrier!==(item.handle.preparedBarrierAdditionTemplate!==undefined))throw Error('Native solid addition receipt has another family');
  if(!!item.center!==(item.handle.preparedCenterRuin!==undefined)||item.center&&(!sameCenter(item.center,item.handle.preparedCenterRuin)||
     !sameNativeWorldBoundary(item.center.boundary,item.handle.preparedWorldBoundary)))throw Error('Center ruin resource receipt differs from retained template');
  return {...(item.center?{preparedCenterRuin:item.handle.preparedCenterRuin}:{}),...(item.handle.preparedAnimalCropRouteTemplate?{preparedAnimalCropRouteTemplate:item.handle.preparedAnimalCropRouteTemplate}:{}),...(item.handle.preparedAnimalCropStrikeTemplate?{preparedAnimalCropStrikeTemplate:item.handle.preparedAnimalCropStrikeTemplate}:{}),...(item.barrier?{preparedBarrierAdditionTemplate:item.handle.preparedBarrierAdditionTemplate}:{}),...(field&&item.handle[field]?{[field]:item.handle[field]}:{}),...(item.handle.preparedFarmArrivalTemplate?{preparedFarmArrivalTemplate:item.handle.preparedFarmArrivalTemplate}:{}),...(item.handle.preparedIdleStrollTemplate?{preparedIdleStrollTemplate:item.handle.preparedIdleStrollTemplate}:{}),...(item.handle.preparedHomeArrivalTemplate?{preparedHomeArrivalTemplate:item.handle.preparedHomeArrivalTemplate}:{}),...(item.handle.preparedHomeRouteTemplate?{preparedHomeRouteTemplate:item.handle.preparedHomeRouteTemplate}:{}),worldBoundary:item.resources.worldBoundary,preparedWorldBoundary:item.handle.preparedWorldBoundary,...(item.handle.preparedResumeTemplate?{preparedResumeTemplate:item.handle.preparedResumeTemplate}:{}),...(item.handle.preparedTaskStartTemplate?{preparedTaskStartTemplate:item.handle.preparedTaskStartTemplate}:{}),...(item.handle.preparedTaskActionTemplate?{preparedTaskActionTemplate:item.handle.preparedTaskActionTemplate}:{}),...(item.handle.preparedTaskSettlementTemplate?{preparedTaskSettlementTemplate:item.handle.preparedTaskSettlementTemplate}:{}),...(item.handle.preparedInitialIdleBodyTemplate?{preparedInitialIdleBodyTemplate:item.handle.preparedInitialIdleBodyTemplate}:{}),...(item.handle.preparedIdleCycleTemplate?{preparedIdleCycleTemplate:item.handle.preparedIdleCycleTemplate}:{}),...(item.handle.preparedTaskConsequenceTemplate?{preparedTaskConsequenceTemplate:item.handle.preparedTaskConsequenceTemplate}:{})};}
 return {accept,whenCallbacksSettled,dispose(){if(closed)return;closed=true;cancel();},status:()=>({closed,pending:entry?.id??null,lastId,inflight,flushing:flushId})};
}

// A direct authority connection uses the very same receiver as the ordinary
// graphical client. Session scope belongs to the endpoint, not to a GPU lease.
export function attachNativeResourcePreparationEndpoint({port,session,onClosed=()=>{},...options}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session)throw TypeError('Invalid native resource endpoint');
 let closed=false,cleanupFailed=false,protocolFailed=false;
 const receiver=createNativeResourcePreparationReceiver({...options,onError:error=>{cleanupFailed=true;options.onError?.(error);},postMessage:message=>port.postMessage({...message,session})});
 function fail(error){if(closed)return;protocolFailed=true;close(String(error?.message??error));}
 function close(message='Native resource preparer closed'){
  if(closed)return;closed=true;
  try{receiver.dispose();}catch(error){cleanupFailed=true;throw error;}finally{
   // Only explicit retirement offers the terminal callback receipt. Protocol
   // failure must remain a failed barrier even when cleanup later finishes.
   // Closed rejects requests immediately. Retired is a separate same-session
   // callback receipt; neither message certifies GPU retirement.
   port.onmessage=port.onmessageerror=null;
   try{port.postMessage({kind:'nativeResourcesClosed',session,message,...(!protocolFailed?{retirementVersion:2}:{})});}catch{}
   const finish=()=>{const status=receiver.status();try{port.postMessage({kind:'nativeResourcesRetired',session,retirementVersion:2,
     callbacksSettled:!protocolFailed&&!cleanupFailed&&status.closed&&status.pending===null&&status.inflight===0});}
    catch{}finally{port.close?.();onClosed();}};
   if(receiver.status().inflight===0)finish();else receiver.whenCallbacksSettled().then(finish);
  }
 }
 port.onmessage=({data})=>{try{
  if(data?.session!==session)throw Error('Native resource session mismatch');
  if(data.kind==='nativeResourcesClose'){close();return;}
  const result=receiver.accept(data);if(result===false)throw Error('Unknown native resource request');
  Promise.resolve(result).catch(fail);
 }catch(error){fail(error);}};
 port.onmessageerror=()=>fail(Error('Native resource request transfer failed'));port.start?.();
 try{port.postMessage({kind:'nativeResourcesReady',session,version:1,retirementVersion:2});}catch(error){fail(error);throw error;}
 return {dispose:close,status:()=>{const status=receiver.status();return {...status,closed:closed||status.closed};}};
}
