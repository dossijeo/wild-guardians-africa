// Optional ordered terrain history. A batch end is a transport boundary, not
// the simulation time of any individual modification inside that batch.
export function createTerrainHistoryReceiver({port,session,residency,confirmedSequence,confirmedElapsed,onError,onApplied,onSelectableChange,onReady,maxHistory,validateRevision}){
 let closed=false,lastId=0,complete=-1,lastSequence=-1,epoch,checkpointSequence=-1,generation=0;
 const queue=[];
 function fail(error){if(closed)return;closed=true;queue.length=0;try{port.close();}catch{}try{onError(error instanceof Error?error:Error(String(error)));}catch{}}
 function ready(sequence){return !closed&&Number.isSafeInteger(sequence)&&sequence>=0&&sequence<=complete;}
 port.onmessage=({data})=>{if(closed)return;try{
  if(data?.kind==='terrainFailure'&&data.session===session)throw Error(data.message||'Terrain producer failed');
  const end=data?.kind==='terrainBatchEnd';
  if((!end&&data?.kind!=='terrain')||data.session!==session||data.epoch!==undefined&&(typeof data.epoch!=='string'||!data.epoch)||!Number.isSafeInteger(data.id)||data.id!==lastId+1||!Number.isSafeInteger(data.sequence)||data.sequence<0||data.sequence<lastSequence||data.sequence<=complete||!end&&(!Number.isSafeInteger(data.revision)||data.revision<1||data.payload?.capturedAt!==undefined&&(!Number.isFinite(data.payload.capturedAt)||data.payload.capturedAt<0)))throw Error('Invalid terrain history publication');
  if(epoch===undefined)epoch=data.epoch??null;else if(epoch!==(data.epoch??null))throw Error('Terrain epoch changed on channel');
  // Fail closed rather than silently discard history or deadlock on a marker.
  if(!end&&queue.length>=maxHistory)throw Error('Terrain history capacity exceeded');
  if(!end)validateRevision(data.payload,data.revision,data.epoch??null);
  lastId=data.id;lastSequence=data.sequence;
  if(end)complete=data.sequence;else queue.push(data);
  port.postMessage({kind:'terrainAck',session,id:data.id});
  if(end)onReady();
 }catch(error){fail(error);}};
 port.onmessageerror=()=>fail(Error('Terrain publication transfer failed'));port.start?.();
 return {ready,revisionGeneration(){return generation;},matchesManifest(manifest){return !closed&&typeof residency.matchesManifest==='function'&&residency.matchesManifest(manifest);},
  checkpoint(sequence){if(closed||!Number.isSafeInteger(sequence)||sequence!==confirmedSequence)throw Error('Invalid terrain checkpoint boundary');checkpointSequence=sequence;generation++;},
  confirm(sequence,elapsed=undefined){if(closed)return;if(!ready(sequence))throw Error('Terrain batch not yet retained');if(sequence<confirmedSequence||elapsed!==undefined&&(!Number.isFinite(elapsed)||elapsed<0||confirmedElapsed!==null&&elapsed<confirmedElapsed))throw TypeError('Terrain confirmation out of order');
   // Validate the entire prefix before changing any visible chunk.
   for(const message of queue){if(message.sequence>sequence)break;validateRevision(message.payload,message.revision,message.epoch??null);const at=message.payload?.capturedAt;if(at!==undefined&&elapsed!==undefined&&at>elapsed)throw Error('Terrain capture is ahead of confirmed time');}
   confirmedSequence=sequence;if(elapsed!==undefined)confirmedElapsed=elapsed;
   try{while(queue.length&&queue[0].sequence<=sequence){const message=queue.shift(),at=message.payload?.capturedAt;if(message.sequence>checkpointSequence&&residency.replace(message.payload,message.revision,message.epoch??null)!==false){generation++;onApplied(message.payload,message.revision,{sequence:message.sequence,epoch:message.epoch??null,...(at===undefined?{}:{capturedAt:at})});onSelectableChange?.();}}}catch(error){fail(error);throw error;}
  },
  dispose(){if(closed)return;closed=true;queue.length=0;port.close();},status(){return {closed,confirmedSequence,pending:queue.length>0,presentationPending:typeof residency.visualReady==='function'&&!residency.visualReady(),lastId,retainedRevisions:queue.length,completeSequence:complete};}};
}
