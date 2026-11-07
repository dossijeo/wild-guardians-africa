import {mergePresentationWorkerHeadings} from './presentation-worker-headings.js';
import {estimateRetainedBytes as estimateBytes} from './retained-size.js';
import {createMainSnapshotEncoder,createMainSnapshotDecoder} from './main-thread-snapshot-transport.js';
// Retains publication boundaries for a replacement presentation worker.
// A candidate is not a replay base until its exact publication is acknowledged.
export function createPresentationRecoveryJournal({capacity=256,highWatermark=128,maxBytes=268435456,highWatermarkBytes=201326592,compactTicks=false,strictBoundaries=false,incrementalSnapshots=false,prepareSnapshot=null,prepareState=null,sharedRetainedBytes=null}={}){
 if(!Number.isSafeInteger(capacity)||capacity<2||!Number.isSafeInteger(highWatermark)||highWatermark<1||highWatermark>=capacity||!Number.isSafeInteger(maxBytes)||maxBytes<1||!Number.isSafeInteger(highWatermarkBytes)||highWatermarkBytes<1||highWatermarkBytes>=maxBytes||typeof compactTicks!=='boolean'||typeof strictBoundaries!=='boolean'||strictBoundaries&&compactTicks||typeof incrementalSnapshots!=='boolean'||incrementalSnapshots&&compactTicks||prepareSnapshot!==null&&typeof prepareSnapshot!=='function'||prepareState!==null&&typeof prepareState!=='function'||sharedRetainedBytes!==null&&typeof sharedRetainedBytes!=='function')throw TypeError('Invalid presentation journal capacity');
 const makeEncoder=()=>incrementalSnapshots?createMainSnapshotEncoder({...(prepareSnapshot?{prepareSnapshot}:{}),...(prepareState?{prepareState}:{}),trackRetained:true}):null;let encoder=makeEncoder(),base=null,candidate=null,last=null,entries=[],bytes=0,closed=false,basePublication=null,candidatePublication=null,replayDecoder=null,replayIndex=0,replayLast=null,replayLastBytes=0,encoderFault=false,checkpointDeferred=false,checkpointRetry=false;
 function ensure(){if(closed)throw Error('Presentation recovery journal closed');}
 function sequence(value){if(!Number.isSafeInteger(value)||value<1)throw TypeError('Invalid presentation journal sequence');return value;}
 // Replay may skip intermediate states only when no observer-facing boundary,
 // terrain, pose or motion is crossed. Eventful ticks retain their own state.
 const knownEnvelope=p=>p?.kind===undefined||p.kind==='result';
 const quietKeys=new Set(['kind','session','sequence','value','stepsExecuted','residency','physicsPose','elapsed','pauses','events','presentationJournal','presentationJournalVersion','presentationWorkerHeadings','raidWaitBindings','saveAvailable','snapshot','terrainChanged','presentationPaths','farVisualRevision']);
 function quiet(item){const p=item?.publication;return item?.kind==='publication'&&item.tick===true&&knownEnvelope(p)&&!item.options?.backgroundView&&p?.unchanged!==true&&(p.presentationPaths===undefined||p.presentationPaths==='head-v1')&&typeof p?.snapshot==='string'&&Array.isArray(p.events)&&p.events.length===0&&Object.keys(p).every(key=>quietKeys.has(key))&&(p.presentationJournal===undefined||Array.isArray(p.presentationJournal)&&p.presentationJournal.length===0)&&(p.presentationWorkerHeadings===undefined||Array.isArray(p.presentationWorkerHeadings)&&p.presentationWorkerHeadings.every(change=>change?.add===undefined&&change?.yaw!==null))&&p.physicsPose===null&&p.physicsPoses===undefined&&p.motionTrace===undefined&&p.worldMotionTrace===undefined&&p.motionInvalidation===undefined&&p.terrainCheckpoint===undefined&&(p.terrainChanged===undefined||p.terrainChanged===false)&&Array.isArray(p.pauses);}
 // Only the authority-certified, unchanged paused advances can be skipped.
 // Never fold terrain, checkpoints, poses, events or a sealed replay entry.
 const pausedKeys=new Set(['kind','session','sequence','value','unchanged','pausedAdvance','slotId','stateSequence','elapsed','pauses','events','residency','saveAvailable','terrainChanged','stepsExecuted','farVisualRevision']);
 function paused(item){const p=item?.publication;return item?.kind==='publication'&&item.tick===true&&knownEnvelope(p)&&p?.unchanged===true&&p.pausedAdvance===true&&typeof p.slotId==='string'&&Number.isSafeInteger(p.stateSequence)&&Number.isFinite(p.elapsed)&&typeof p.saveAvailable==='boolean'&&Array.isArray(p.pauses)&&p.pauses.length>0&&p.pauses.every(reason=>typeof reason==='string')&&Array.isArray(p.events)&&p.events.length===0&&Object.keys(p).every(key=>pausedKeys.has(key))&&p.terrainChanged===false;}
 function samePaused(a,b){const left={...a},right={...b};delete left.sequence;delete right.sequence;return JSON.stringify(left)===JSON.stringify(right);}
 // A background view acknowledgement can be folded only if every field
 // except its transport sequence is identical. Unknown fields remain a
 // boundary, so future protocol additions cannot silently lose information.
 const viewKeys=new Set(['kind','session','sequence','value','unchanged','slotId','stateSequence','elapsed','pauses','events','residency','saveAvailable','terrainChanged','farVisualRevision']);
 function backgroundView(item){const p=item?.publication;return item?.kind==='publication'&&item.options?.backgroundView===true&&knownEnvelope(p)&&p?.unchanged===true&&p.terrainChanged===false&&Array.isArray(p.events)&&p.events.length===0&&Object.keys(p).every(key=>viewKeys.has(key));}
 function sameView(a,b){const left={...a},right={...b};delete left.sequence;delete right.sequence;return JSON.stringify(left)===JSON.stringify(right);}
 function overhead(){if(closed)return 0;const shared=sharedRetainedBytes?.()??0;if(!Number.isSafeInteger(shared)||shared<0)throw TypeError('Invalid shared snapshot retention');return shared+(encoder?.retainedBytes()??0)+(basePublication?estimateBytes(basePublication):0)+(candidatePublication?estimateBytes(candidatePublication):0)+(replayDecoder?.retainedBytes()??0)+replayLastBytes;}
 function makeDecoder(trackRetained=false){const decoder=createMainSnapshotDecoder({trackRetained});decoder.decode({kind:'publication',publication:basePublication});return decoder;}
 function decodedEntry(item,decoder){if(!incrementalSnapshots||item.kind!=='publication')return structuredClone(item);const wire=decoder.decode({kind:'publication',publication:item.publication});return structuredClone({...item,publication:wire.publication});}
 return {
  append(message,tick,options={}){
   ensure();if(encoderFault)throw Error('Presentation recovery encoder failed');const n=sequence(message?.sequence);if(typeof tick!=='boolean'||!options||typeof options!=='object')throw TypeError('Invalid journal publication');
   if(last===null)return false;
   if(n!==last+1)throw Error('Presentation journal sequence gap');
   try{
   const publication=encoder?encoder.encode({kind:'publication',publication:message}).publication:message,item={kind:'publication',sequence:n,publication:structuredClone(publication),tick,options:structuredClone(options)},previous=entries.at(-1),foldViews=previous&&backgroundView(previous.item)&&backgroundView(item)&&JSON.stringify(previous.item.options)===JSON.stringify(item.options)&&sameView(previous.item.publication,item.publication),fold=!strictBoundaries&&previous&&!previous.sealed&&candidate!==previous.item.sequence&&(foldViews||paused(previous.item)&&paused(item)&&samePaused(previous.item.publication,item.publication)||compactTicks&&quiet(previous.item)&&quiet(item)&&previous.item.publication.farVisualRevision===item.publication.farVisualRevision&&JSON.stringify(previous.item.publication.pauses)===JSON.stringify(item.publication.pauses));
   if(fold&&foldViews)item.tick=true; // Recovery protocol accepts a merged sequence range only for tick envelopes.
   if(fold){item.firstSequence=previous.item.firstSequence??previous.item.sequence;const before=previous.item.publication.presentationWorkerHeadings,after=item.publication.presentationWorkerHeadings;if(before!==undefined||after!==undefined)item.publication.presentationWorkerHeadings=mergePresentationWorkerHeadings(before===undefined?[]:before,after===undefined?[]:after);}
   if(!fold&&entries.length>=capacity){if(encoder)encoderFault=true;throw Error('Presentation recovery journal capacity exceeded');}
   const size=estimateBytes(item),retained=bytes-(fold?previous.size:0);if(size>maxBytes-retained-overhead()){if(encoder)encoderFault=true;throw Error('Presentation recovery journal byte capacity exceeded');}
   if(fold)entries[entries.length-1]={item,size};else entries.push({item,size});bytes=retained+size;last=n;return true;
   }catch(error){if(encoder)encoderFault=true;throw error;}
  },
  // The terrain worker delivers batches before the corresponding result.
  appendTerrain(value,chunks,terrainManifest=null){
   ensure();const n=sequence(value);if(!Array.isArray(chunks))throw TypeError('Invalid presentation terrain batch');
   if(last===null)return false;
   if(n!==last+1)throw Error('Presentation terrain journal sequence gap');
   if(entries.length>=capacity)throw Error('Presentation recovery journal capacity exceeded');
   const item={kind:'terrain',sequence:n,chunks:structuredClone(chunks),...(terrainManifest===null?{}:{terrainManifest:structuredClone(terrainManifest)})},size=estimateBytes(item);if(size>maxBytes-bytes-overhead())throw Error('Presentation recovery journal byte capacity exceeded');
   entries.push({item,size});bytes+=size;return true;
  },
  begin(value,publication=null){
   ensure();const n=sequence(value);if(candidate!==null)throw Error('Presentation checkpoint already pending');
   if(last!==null&&(n!==last||base!==null&&n<=base))throw Error('Presentation checkpoint boundary mismatch');if(!encoder&&bytes+overhead()>maxBytes)throw Error('Presentation recovery journal byte capacity exceeded');
   if(encoder){if(encoderFault)throw Error('Presentation recovery encoder failed');if(publication?.sequence!==n||typeof publication.snapshot!=='string')throw TypeError('Missing recovery checkpoint snapshot');try{if(base===null&&last===null)encoder.encode({kind:'publication',publication});candidatePublication={sequence:n,snapshot:publication.snapshot};if(bytes+overhead()>maxBytes){candidatePublication=null;throw Error('Presentation recovery journal byte capacity exceeded');}}catch(error){encoderFault=true;throw error;}}if(last===null)last=n;candidate=n;checkpointDeferred=false;checkpointRetry=false;
  },
  canFitBase({previousSharedBytes=0,nextSharedBytes=0}={}){ensure();if(!Number.isSafeInteger(previousSharedBytes)||previousSharedBytes<0||!Number.isSafeInteger(nextSharedBytes)||nextSharedBytes<0)throw TypeError('Invalid checkpoint retention');const shared=sharedRetainedBytes?.()??0;if(!Number.isSafeInteger(shared)||shared<previousSharedBytes)throw TypeError('Invalid shared snapshot retention');const total=shared-previousSharedBytes+nextSharedBytes;return Number.isSafeInteger(total)&&total<highWatermarkBytes&&total<=maxBytes;},
  deferBeforeBegin(value){ensure();const n=sequence(value);if(candidate!==null||last!==null&&last!==n)throw Error('Presentation checkpoint boundary mismatch');checkpointDeferred=true;checkpointRetry=false;return base;},
  canConfirm(value,{previousSharedBytes=0,nextSharedBytes=0}={}){ensure();const n=sequence(value);if(n!==candidate)throw Error('Presentation checkpoint acknowledgement mismatch');if(!Number.isSafeInteger(previousSharedBytes)||previousSharedBytes<0||!Number.isSafeInteger(nextSharedBytes)||nextSharedBytes<0)throw TypeError('Invalid checkpoint retention');const shared=sharedRetainedBytes?.()??0;if(!Number.isSafeInteger(shared)||shared<previousSharedBytes)throw TypeError('Invalid shared snapshot retention');const retained=entries.reduce((total,entry)=>total+(entry.item.sequence>n?entry.size:0),0),total=retained+shared-previousSharedBytes+nextSharedBytes+(encoder?.retainedBytes()??0)+(candidatePublication?estimateBytes(candidatePublication):0);return Number.isSafeInteger(total)&&total<highWatermarkBytes&&total<=maxBytes;},
  confirm(value){
   ensure();const n=sequence(value);if(n!==candidate)throw Error('Presentation checkpoint acknowledgement mismatch');
   base=n;candidate=null;if(encoder){basePublication=candidatePublication;candidatePublication=null;replayDecoder?.dispose();replayDecoder=null;replayIndex=0;replayLast=null;replayLastBytes=0;}entries=entries.filter(entry=>entry.item.sequence>n);bytes=entries.reduce((total,entry)=>total+entry.size,0);return base;
  },
  abandonCandidate(value){ensure();const n=sequence(value);if(base===null||candidate!==n)throw Error('Presentation checkpoint candidate mismatch');candidate=null;candidatePublication=null;return base;},
  // Without an acknowledged base, retained publications cannot be replayed.
  // The live channel still delivers them; reset the encoder for the next base.
  deferCandidate(value){ensure();const n=sequence(value);if(candidate!==n)throw Error('Presentation checkpoint candidate mismatch');candidate=null;candidatePublication=null;if(base===null){entries=[];bytes=0;last=null;encoder?.dispose();encoder=makeEncoder();}checkpointDeferred=true;checkpointRetry=false;return base;},
  retryDeferred(){ensure();if(!checkpointDeferred)return false;checkpointDeferred=false;checkpointRetry=true;return true;},
  retryAfterRecovery(){ensure();if(base===null||candidate!==null||encoderFault)return false;checkpointDeferred=false;checkpointRetry=true;return true;},
  snapshot(){ensure();if(base===null)throw Error('Presentation checkpoint is not acknowledged');const decoder=encoder?makeDecoder():null;return {base,through:last,entries:entries.map(entry=>decodedEntry(entry.item,decoder))};},
  entry(index){ensure();if(base===null)throw Error('Presentation checkpoint is not acknowledged');if(!Number.isSafeInteger(index)||index<0)throw TypeError('Invalid presentation journal index');if(index>=entries.length)return null;entries[index].sealed=true;if(!encoder)return structuredClone(entries[index].item);try{if(index===replayIndex-1&&replayLast)return structuredClone(replayLast);if(!replayDecoder||index<replayIndex){replayDecoder?.dispose();replayDecoder=makeDecoder(true);replayIndex=0;replayLast=null;replayLastBytes=0;}while(replayIndex<=index){entries[replayIndex].sealed=true;replayLast=decodedEntry(entries[replayIndex].item,replayDecoder);replayLastBytes=estimateBytes(replayLast);replayIndex++;if(bytes+overhead()>maxBytes)throw Error('Presentation recovery journal byte capacity exceeded');}return structuredClone(replayLast);}catch(error){encoderFault=true;throw error;}},
  status(){const overheadBytes=overhead(),totalBytes=bytes+overheadBytes;return {base,candidate,through:last,entries:entries.length,bytes:totalBytes,entryBytes:bytes,overheadBytes,capacity,highWatermark,maxBytes,highWatermarkBytes,pendingTerrain:entries.at(-1)?.item.kind==='terrain',saturated:encoderFault||entries.length>=highWatermark||totalBytes>=highWatermarkBytes,encoderFault,checkpointDeferred,checkpointRetry,closed};},
  dispose(){closed=true;entries=[];bytes=0;base=candidate=last=null;encoder?.dispose();replayDecoder?.dispose();basePublication=candidatePublication=replayDecoder=replayLast=null;replayLastBytes=0;}
 };
}

// A checkpoint alone cannot repair a gap or a partially recorded command.
export function assertPresentationRecoveryBoundary(journal,stream,checkpoint,authoritySequence){
 const status=journal?.status?.(),channel=stream?.status?.();
 if(!status||status.closed||!checkpoint||status.base!==checkpoint.sequence||status.candidate!==null||status.pendingTerrain||status.through!==authoritySequence||status.encoderFault||status.entries>status.capacity||status.bytes>status.maxBytes||!channel?.active||channel.recoveryFailure){
  const error=Error('Presentation recovery journal is incomplete or saturated');error.code='recovery-incomplete';throw error;
 }
 return status.through;
}

// Capture the initial base on the first ordered command, then renew it before
// the admission watermark. Never request another while an ACK is pending.
export function shouldCapturePresentationCheckpoint(status){
 if(!status||status.closed||status.candidate!==null||status.checkpointDeferred)return false;if(status.checkpointRetry)return true;
 if(status.base===null)return status.through===null;
 return status.entries>=Math.max(1,Math.floor(status.highWatermark/2))||(status.entryBytes??status.bytes)>=Math.max(1,Math.floor(status.highWatermarkBytes/2));
}

// Enrich the existing command; never create or reorder an authority command.
export function withPresentationRecoveryCheckpoint(command,status,{frozen=false,detached=false}={}){
 if(frozen||detached||command.visualTerrain===true||!shouldCapturePresentationCheckpoint(status))return command;
 return {...command,visualTerrain:true,visualRecoveryOnly:true};
}

// A failed attachment may be retried only from an intact authority boundary.
// Retire the old presentation channel before issuing replacement ports.
export function preparePresentationRecoveryRetry(journal,stream,checkpoint,authoritySequence){
 const status=journal?.status?.(),channel=stream?.status?.();
 if(!status||status.closed||!checkpoint||status.base!==checkpoint.sequence||status.through!==authoritySequence||status.pendingTerrain||status.encoderFault||status.entries>status.capacity||status.bytes>status.maxBytes||!channel?.active||channel.recoveryFailure){const error=Error('Presentation recovery journal is incomplete or saturated');error.code='recovery-incomplete';throw error;}
 if(!channel.detached)stream.detachForRecovery();
 return assertPresentationRecoveryBoundary(journal,stream,checkpoint,authoritySequence);
}
