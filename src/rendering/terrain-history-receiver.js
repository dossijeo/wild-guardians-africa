import {estimateRetainedBytes} from '../simulation/retained-size.js';

// Reserve an entire boundary before accepting its first chunk. Waiting halfway
// through a batch would deadlock a consumer that needs its end marker to apply.
export function createTerrainHistoryReceiver({port,session,residency,confirmedSequence,confirmedElapsed,onError,onApplied,onSelectableChange,onReady,maxHistory,maxHistoryBytes,validateRevision}){
 let closed=false,lastId=0,complete=-1,lastSequence=-1,epoch,checkpointSequence=-1,generation=0,active=null,waiting=null,reservedBytes=0,reservedCount=0;
 const queue=[],batches=[];
 function fail(error){if(closed)return;closed=true;queue.length=0;batches.length=0;active=null;waiting=null;reservedBytes=0;reservedCount=0;try{port.close();}catch{}try{onError(error instanceof Error?error:Error(String(error)));}catch{}}
 function ready(sequence){return !closed&&Number.isSafeInteger(sequence)&&sequence>=0&&sequence<=complete;}
 function acceptBegin(data){
  // Charge the boundary itself, including empty batches, so their metadata
  // cannot grow without bound while simulation is paused.
  const slots=data.count+1,charge=data.bytes+256*slots;
  if(!Number.isSafeInteger(charge)||!Number.isSafeInteger(slots)||charge>maxHistoryBytes||slots>maxHistory)throw Error('Terrain history batch exceeds capacity');
  if(charge>maxHistoryBytes-reservedBytes||slots>maxHistory-reservedCount){waiting=data;return;}
  waiting=null;reservedBytes+=charge;reservedCount+=slots;active={sequence:data.sequence,bytes:data.bytes,count:data.count,charge,slots,receivedBytes:0,receivedCount:0};lastId=data.id;lastSequence=data.sequence;port.postMessage({kind:'terrainAck',session,id:data.id});
 }
 port.onmessage=({data})=>{if(closed)return;try{
  if(data?.kind==='terrainFailure'&&data.session===session)throw Error(data.message||'Terrain producer failed');
  const begin=data?.kind==='terrainBatchBegin',end=data?.kind==='terrainBatchEnd';
  if((!begin&&!end&&data?.kind!=='terrain')||data.session!==session||data.epoch!==undefined&&(typeof data.epoch!=='string'||!data.epoch)||!Number.isSafeInteger(data.id)||data.id!==lastId+1||!Number.isSafeInteger(data.sequence)||data.sequence<0||data.sequence<lastSequence||data.sequence<=complete||waiting)throw Error('Invalid terrain history publication');
  if(epoch===undefined)epoch=data.epoch??null;else if(epoch!==(data.epoch??null))throw Error('Terrain epoch changed on channel');
  if(begin){if(active||!Number.isSafeInteger(data.bytes)||data.bytes<0||!Number.isSafeInteger(data.count)||data.count<0)throw Error('Invalid terrain history batch');acceptBegin(data);return;}
  if(!active||data.sequence!==active.sequence)throw Error('Terrain history batch missing');
  if(end){if(active.receivedCount!==active.count||active.receivedBytes!==active.bytes)throw Error('Incomplete terrain history batch');lastId=data.id;complete=data.sequence;batches.push(active);active=null;port.postMessage({kind:'terrainAck',session,id:data.id});onReady();return;}
  if(!Number.isSafeInteger(data.revision)||data.revision<1||data.payload?.capturedAt!==undefined&&(!Number.isFinite(data.payload.capturedAt)||data.payload.capturedAt<0))throw Error('Invalid terrain history publication');
  const bytes=estimateRetainedBytes(data.payload);if(active.receivedCount>=active.count||bytes>active.bytes-active.receivedBytes)throw Error('Terrain history batch exceeds reservation');validateRevision(data.payload,data.revision,data.epoch??null);
  active.receivedCount++;active.receivedBytes+=bytes;lastId=data.id;lastSequence=data.sequence;queue.push(data);port.postMessage({kind:'terrainAck',session,id:data.id});
 }catch(error){fail(error);}};
 port.onmessageerror=()=>fail(Error('Terrain publication transfer failed'));port.start?.();
 return {ready,revisionGeneration(){return generation;},matchesManifest(manifest){return !closed&&typeof residency.matchesManifest==='function'&&residency.matchesManifest(manifest);},
  checkpoint(sequence){if(closed||!Number.isSafeInteger(sequence)||sequence!==confirmedSequence)throw Error('Invalid terrain checkpoint boundary');checkpointSequence=sequence;generation++;},
  confirm(sequence,elapsed=undefined){if(closed)return;if(!ready(sequence))throw Error('Terrain batch not yet retained');if(sequence<confirmedSequence||elapsed!==undefined&&(!Number.isFinite(elapsed)||elapsed<0||confirmedElapsed!==null&&elapsed<confirmedElapsed))throw TypeError('Terrain confirmation out of order');
   for(const message of queue){if(message.sequence>sequence)break;validateRevision(message.payload,message.revision,message.epoch??null);const at=message.payload?.capturedAt;if(at!==undefined&&elapsed!==undefined&&at>elapsed)throw Error('Terrain capture is ahead of confirmed time');}
   confirmedSequence=sequence;if(elapsed!==undefined)confirmedElapsed=elapsed;
   try{while(queue.length&&queue[0].sequence<=sequence){const message=queue.shift(),at=message.payload?.capturedAt;if(message.sequence>checkpointSequence&&residency.replace(message.payload,message.revision,message.epoch??null)!==false){generation++;onApplied(message.payload,message.revision,{sequence:message.sequence,epoch:message.epoch??null,...(at===undefined?{}:{capturedAt:at})});onSelectableChange?.();}}while(batches.length&&batches[0].sequence<=sequence){const batch=batches.shift();reservedBytes-=batch.charge;reservedCount-=batch.slots;}if(waiting)acceptBegin(waiting);}catch(error){fail(error);throw error;}
  },
  dispose(){if(closed)return;closed=true;queue.length=0;batches.length=0;active=null;waiting=null;reservedBytes=0;reservedCount=0;port.close();},status(){return {closed,confirmedSequence,pending:queue.length>0,presentationPending:typeof residency.visualReady==='function'&&!residency.visualReady(),lastId,retainedRevisions:queue.length,retainedBytes:reservedBytes,waitingForCapacity:waiting!==null,completeSequence:complete};}};
}
