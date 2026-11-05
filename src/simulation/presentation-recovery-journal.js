import {mergePresentationWorkerHeadings} from './presentation-worker-headings.js';

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
export function createPresentationRecoveryJournal({capacity=256,highWatermark=128,maxBytes=268435456,highWatermarkBytes=201326592,compactTicks=false}={}){
 if(!Number.isSafeInteger(capacity)||capacity<2||!Number.isSafeInteger(highWatermark)||highWatermark<1||highWatermark>=capacity||!Number.isSafeInteger(maxBytes)||maxBytes<1||!Number.isSafeInteger(highWatermarkBytes)||highWatermarkBytes<1||highWatermarkBytes>=maxBytes||typeof compactTicks!=='boolean')throw TypeError('Invalid presentation journal capacity');
 let base=null,candidate=null,last=null,entries=[],bytes=0,closed=false;
 function ensure(){if(closed)throw Error('Presentation recovery journal closed');}
 function sequence(value){if(!Number.isSafeInteger(value)||value<1)throw TypeError('Invalid presentation journal sequence');return value;}
 // Replay may skip intermediate states only when no observer-facing boundary,
 // terrain, pose or motion is crossed. Eventful ticks retain their own state.
 function quiet(item){const p=item?.publication;return item?.kind==='publication'&&item.tick===true&&!item.options?.backgroundView&&p?.unchanged!==true&&typeof p?.snapshot==='string'&&Array.isArray(p.events)&&p.events.length===0&&(p.presentationJournal===undefined||Array.isArray(p.presentationJournal)&&p.presentationJournal.length===0)&&(p.presentationWorkerHeadings===undefined||Array.isArray(p.presentationWorkerHeadings)&&p.presentationWorkerHeadings.every(change=>change?.add===undefined&&change?.yaw!==null))&&p.physicsPose===null&&p.physicsPoses===undefined&&p.motionTrace===undefined&&p.worldMotionTrace===undefined&&p.motionInvalidation===undefined&&p.terrainCheckpoint===undefined&&(p.terrainChanged===undefined||p.terrainChanged===false)&&Array.isArray(p.pauses);}
 // Only the authority-certified, unchanged paused advances can be skipped.
 // Never fold terrain, checkpoints, poses, events or a sealed replay entry.
 function paused(item){const p=item?.publication;return item?.kind==='publication'&&item.tick===true&&p?.unchanged===true&&p.pausedAdvance===true&&typeof p.slotId==='string'&&Number.isSafeInteger(p.stateSequence)&&Number.isFinite(p.elapsed)&&typeof p.saveAvailable==='boolean'&&Array.isArray(p.pauses)&&p.pauses.length>0&&p.pauses.every(reason=>typeof reason==='string')&&Array.isArray(p.events)&&p.events.length===0&&(p.presentationJournal===undefined||Array.isArray(p.presentationJournal)&&p.presentationJournal.length===0)&&p.terrainChanged===false&&p.terrainCheckpoint===undefined&&p.physicsPose===undefined&&p.physicsPoses===undefined&&p.motionTrace===undefined&&p.worldMotionTrace===undefined&&p.motionInvalidation===undefined&&p.presentationWorkerHeadings===undefined&&p.snapshot===undefined;}
 function samePaused(a,b){return a.slotId===b.slotId&&a.stateSequence===b.stateSequence&&a.elapsed===b.elapsed&&a.saveAvailable===b.saveAvailable&&JSON.stringify(a.pauses)===JSON.stringify(b.pauses);}
 return {
  append(message,tick,options={}){
   ensure();const n=sequence(message?.sequence);if(typeof tick!=='boolean'||!options||typeof options!=='object')throw TypeError('Invalid journal publication');
   if(last===null)return false;
   if(n!==last+1)throw Error('Presentation journal sequence gap');
   const item={kind:'publication',sequence:n,publication:structuredClone(message),tick,options:structuredClone(options)},previous=entries.at(-1),fold=previous&&!previous.sealed&&candidate!==previous.item.sequence&&(paused(previous.item)&&paused(item)&&samePaused(previous.item.publication,item.publication)||compactTicks&&quiet(previous.item)&&quiet(item)&&JSON.stringify(previous.item.publication.pauses)===JSON.stringify(item.publication.pauses));
   if(fold){item.firstSequence=previous.item.firstSequence??previous.item.sequence;const before=previous.item.publication.presentationWorkerHeadings,after=item.publication.presentationWorkerHeadings;if(before!==undefined||after!==undefined)item.publication.presentationWorkerHeadings=mergePresentationWorkerHeadings(before===undefined?[]:before,after===undefined?[]:after);}
   if(!fold&&entries.length>=capacity)throw Error('Presentation recovery journal capacity exceeded');
   const size=estimateBytes(item),retained=bytes-(fold?previous.size:0);if(size>maxBytes-retained)throw Error('Presentation recovery journal byte capacity exceeded');
   if(fold)entries[entries.length-1]={item,size};else entries.push({item,size});bytes=retained+size;last=n;return true;
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
  abandonCandidate(value){ensure();const n=sequence(value);if(base===null||candidate!==n)throw Error('Presentation checkpoint candidate mismatch');candidate=null;return base;},
  snapshot(){ensure();if(base===null)throw Error('Presentation checkpoint is not acknowledged');return {base,through:last,entries:structuredClone(entries.map(entry=>entry.item))};},
  entry(index){ensure();if(base===null)throw Error('Presentation checkpoint is not acknowledged');if(!Number.isSafeInteger(index)||index<0)throw TypeError('Invalid presentation journal index');if(index>=entries.length)return null;entries[index].sealed=true;return structuredClone(entries[index].item);},
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

// Request a replacement before the admission watermark, and only once until
// the ordered checkpoint ACK has promoted the candidate.
export function shouldRenewPresentationCheckpoint(status){
 if(!status||status.closed||status.base===null||status.candidate!==null)return false;
 return status.entries>=Math.max(1,Math.floor(status.highWatermark/2))||status.bytes>=Math.max(1,Math.floor(status.highWatermarkBytes/2));
}
