// Approximate retained-size budget, including snapshots and typed buffers; JS heap overhead varies.
function estimateBytes(value,seen=new WeakSet()){
 if(typeof value==='string')return value.length*2;
 if(value===null||typeof value!=='object')return 8;
 if(seen.has(value))return 0;seen.add(value);
 if(value instanceof ArrayBuffer)return value.byteLength;
 if(ArrayBuffer.isView(value))return value.byteLength;
 let size=Array.isArray(value)?value.length*8:32;
 for(const [key,item] of Object.entries(value))size+=key.length*2+estimateBytes(item,seen);
 return size;
}
// Retains publication boundaries for a replacement presentation worker.
// A candidate is not a replay base until its exact publication is acknowledged.
export function createPresentationRecoveryJournal({capacity=256,highWatermark=128,maxBytes=268435456,highWatermarkBytes=201326592}={}){
 if(!Number.isSafeInteger(capacity)||capacity<2||!Number.isSafeInteger(highWatermark)||highWatermark<1||highWatermark>=capacity||!Number.isSafeInteger(maxBytes)||maxBytes<1||!Number.isSafeInteger(highWatermarkBytes)||highWatermarkBytes<1||highWatermarkBytes>=maxBytes)throw TypeError('Invalid presentation journal capacity');
 let base=null,candidate=null,last=null,entries=[],bytes=0,closed=false;
 function ensure(){if(closed)throw Error('Presentation recovery journal closed');}
 function sequence(value){if(!Number.isSafeInteger(value)||value<1)throw TypeError('Invalid presentation journal sequence');return value;}
 return {
  append(message,tick,options={}){
   ensure();const n=sequence(message?.sequence);if(typeof tick!=='boolean'||!options||typeof options!=='object')throw TypeError('Invalid journal publication');
   if(last===null)return false;
   if(n!==last+1)throw Error('Presentation journal sequence gap');
   if(entries.length>=capacity)throw Error('Presentation recovery journal capacity exceeded');
   const item={kind:'publication',sequence:n,publication:structuredClone(message),tick,options:structuredClone(options)},size=estimateBytes(item);if(size>maxBytes-bytes)throw Error('Presentation recovery journal byte capacity exceeded');
   entries.push({item,size});bytes+=size;last=n;return true;
  },
  // The terrain worker delivers batches before the corresponding result.
  appendTerrain(value,chunks){
   ensure();const n=sequence(value);if(!Array.isArray(chunks))throw TypeError('Invalid presentation terrain batch');
   if(last===null)return false;
   if(n!==last+1)throw Error('Presentation terrain journal sequence gap');
   if(entries.length>=capacity)throw Error('Presentation recovery journal capacity exceeded');
   const item={kind:'terrain',sequence:n,chunks:structuredClone(chunks)},size=estimateBytes(item);if(size>maxBytes-bytes)throw Error('Presentation recovery journal byte capacity exceeded');
   entries.push({item,size});bytes+=size;return true;
  },
  begin(value){
   ensure();const n=sequence(value);if(candidate!==null)throw Error('Presentation checkpoint already pending');
   if(last===null)last=n;else if(n!==last||base!==null&&n<=base)throw Error('Presentation checkpoint boundary mismatch');
   candidate=n;
  },
  confirm(value){
   ensure();const n=sequence(value);if(n!==candidate)throw Error('Presentation checkpoint acknowledgement mismatch');
   base=n;candidate=null;entries=entries.filter(entry=>entry.item.sequence>n);bytes=entries.reduce((total,entry)=>total+entry.size,0);return base;
  },
  snapshot(){ensure();if(base===null)throw Error('Presentation checkpoint is not acknowledged');return {base,through:last,entries:structuredClone(entries.map(entry=>entry.item))};},
  entry(index){ensure();if(base===null)throw Error('Presentation checkpoint is not acknowledged');if(!Number.isSafeInteger(index)||index<0)throw TypeError('Invalid presentation journal index');return index<entries.length?structuredClone(entries[index].item):null;},
  status(){return {base,candidate,through:last,entries:entries.length,bytes,capacity,highWatermark,maxBytes,highWatermarkBytes,pendingTerrain:entries.at(-1)?.item.kind==='terrain',saturated:entries.length>=highWatermark||bytes>=highWatermarkBytes,closed};},
  dispose(){closed=true;entries=[];bytes=0;base=candidate=last=null;}
 };
}

// A checkpoint alone cannot repair a gap or a partially recorded command.
export function assertPresentationRecoveryBoundary(journal,stream,checkpoint,authoritySequence){
 const status=journal?.status?.(),channel=stream?.status?.();
 if(!status||status.closed||!checkpoint||status.base!==checkpoint.sequence||status.candidate!==null||status.pendingTerrain||status.through!==authoritySequence||status.saturated||!channel?.active||channel.recoveryFailure){
  const error=Error('Presentation recovery journal is incomplete or saturated');error.code='recovery-incomplete';throw error;
 }
 return status.through;
}
