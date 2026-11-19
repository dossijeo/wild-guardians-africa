import {copyNativeWorldBoundary,copyPublishedNativeWorldBoundary} from '../world/native-world-boundary.js';
import {createPresentationWorkerHeadingMap,preparePresentationWorkerHeadingDeltas,applyPresentationWorkerHeadingDeltas} from './presentation-worker-headings.js';
import {estimateRetainedBytes} from './retained-size.js';

// Check the retained recovery journal against the authority's exact terrain
// boundary before a historical channel can be replaced. This validates the
// journal; it does not transfer or restore any chunk data by itself.
export function validateHistoricalTerrainRecovery({journal,checkpoint,handoff}={}){
 const status=journal?.status?.(),base=checkpoint?.sequence,terrain=checkpoint?.terrainCheckpoint,manifest=terrain?.terrainManifest;
 if(!status||status.closed||status.encoderFault||status.entries>status.capacity||status.bytes>status.maxBytes||status.candidate!==null||status.pendingTerrain||status.base!==base||status.through!==handoff?.lastSequence||!Number.isSafeInteger(base)||base<1||!handoff||typeof handoff.epoch!=='string'||!handoff.epoch||!Array.isArray(handoff.chunks)||terrain?.sequence!==base||!Array.isArray(terrain.chunks)||!manifest||manifest.epoch!==handoff.epoch||!Array.isArray(manifest.chunks))throw Error('Historical terrain recovery boundary unavailable');
 const revisions=new Map(),removed=new Map(),removedAt=new Map(),keyOf=chunk=>{if(!Number.isSafeInteger(chunk?.cx)||!Number.isSafeInteger(chunk?.cz))throw Error('Invalid historical terrain identity');return `${chunk.cx},${chunk.cz}`;};
 function applyManifest(chunks,source,initial){if(!Array.isArray(chunks)||!source||source.epoch!==handoff.epoch||!Array.isArray(source.chunks)||source.chunks.length!==chunks.length)throw Error('Historical terrain manifest mismatch');const incoming=new Map();for(const meta of source.chunks){const key=keyOf(meta);if(incoming.has(key)||!Number.isSafeInteger(meta.revision)||meta.revision<1)throw Error('Invalid historical terrain revision');incoming.set(key,meta.revision);}const seen=new Set();for(const chunk of chunks){const key=keyOf(chunk),revision=incoming.get(key),previous=revisions.get(key);if(seen.has(key)||revision===undefined||!initial&&revision!==(previous??0)+1)throw Error('Historical terrain revision gap');seen.add(key);revisions.set(key,revision);removed.set(key,chunk.removed===true);if(chunk.removed===true)removedAt.set(key,chunk.capturedAt);else removedAt.delete(key);}}
 applyManifest(terrain.chunks,manifest,true);
 const initialHandoff=terrain.terrainHandoff;
 if(initialHandoff!==undefined){
  if(initialHandoff?.epoch!==manifest.epoch||initialHandoff.lastSequence!==base||!Array.isArray(initialHandoff.chunks))throw Error('Historical terrain base handoff mismatch');
  const seen=new Set();for(const row of initialHandoff.chunks){const key=keyOf(row);if(seen.has(key)||!Number.isSafeInteger(row.revision)||row.revision<1||row.removed!==undefined&&row.removed!==true)throw Error('Historical terrain base handoff mismatch');seen.add(key);if(row.removed===true){if(revisions.has(key)||!Number.isFinite(row.capturedAt))throw Error('Historical terrain base handoff mismatch');revisions.set(key,row.revision);removed.set(key,true);removedAt.set(key,row.capturedAt);}else if(revisions.get(key)!==row.revision)throw Error('Historical terrain base handoff mismatch');}if(seen.size!==revisions.size)throw Error('Historical terrain base handoff mismatch');
 }
 let cursor=base,terrainAt=null,index=0;
 for(;;){const entry=journal.entry(index++);if(!entry)break;if(entry.sequence!==cursor+1||(entry.firstSequence??entry.sequence)!==entry.sequence)throw Error('Historical terrain journal sequence gap');if(entry.kind==='terrain'){if(terrainAt!==null)throw Error('Duplicate historical terrain boundary');applyManifest(entry.chunks,entry.terrainManifest,false);terrainAt=entry.sequence;continue;}if(entry.kind!=='publication'||entry.publication?.sequence!==entry.sequence||typeof entry.publication.terrainChanged!=='boolean'||entry.publication.terrainChanged!==(terrainAt===entry.sequence))throw Error('Historical terrain publication mismatch');cursor=entry.sequence;terrainAt=null;}
 if(terrainAt!==null||cursor!==handoff.lastSequence||revisions.size!==handoff.chunks.length)throw Error('Historical terrain journal incomplete');const seen=new Set();for(const chunk of handoff.chunks){const key=keyOf(chunk);if(seen.has(key)||revisions.get(key)!==chunk.revision||removed.get(key)!==(chunk.removed===true)||chunk.removed!==undefined&&chunk.removed!==true||chunk.removed===true&&(!Number.isFinite(removedAt.get(key))||chunk.capturedAt!==removedAt.get(key)))throw Error('Historical terrain handoff mismatch');seen.add(key);}return {epoch:handoff.epoch,through:cursor};
}

// Materialize a source checkpoint at the retained consumer's exact cursor.
// The original journal/base stay owned by the producer. Current effects come
// from that consumer and must still pass its own semantic equality checks.
export function projectRetainedPresentationCheckpoint({journal,checkpoint,handoff,sequence,presentationCheckpoint,workCheckpoint=null}={}){
 const initial=journal?.status?.(),base=checkpoint?.sequence;
 if(!Number.isSafeInteger(sequence)||!Number.isSafeInteger(base)||sequence<base||sequence>initial?.through||typeof checkpoint?.session!=='string'||!checkpoint.session||typeof checkpoint.snapshot!=='string'||!Number.isFinite(checkpoint.elapsed)||checkpoint.elapsed<0)throw Error('Retained recovery cursor unavailable');
 validateHistoricalTerrainRecovery({journal,checkpoint,handoff});
 const terrain=checkpoint.terrainCheckpoint,epoch=terrain.terrainManifest.epoch,payloads=new Map(),metadata=new Map(),baseRevisions=new Map(terrain.terrainManifest.chunks.map(row=>[`${row.cx},${row.cz}`,row.revision]));
 for(const row of terrain.terrainHandoff?.chunks??[])metadata.set(`${row.cx},${row.cz}`,{...row});
 for(const payload of terrain.chunks){const key=`${payload.cx},${payload.cz}`;if(payload.removed===true)throw Error('Retained recovery base contains removed terrain');payloads.set(key,payload);metadata.set(key,{cx:payload.cx,cz:payload.cz,revision:baseRevisions.get(key),...(payload.capturedAt===undefined?{}:{capturedAt:payload.capturedAt})});}
 let current=checkpoint,state=JSON.parse(checkpoint.snapshot),snapshot=checkpoint.snapshot,world=copyNativeWorldBoundary(terrain.nativeWorldBoundary??null),headings=terrain.workerHeadings===undefined?null:createPresentationWorkerHeadingMap(terrain.workerHeadings),index=0,changes=new Map();
 if(state.elapsed!==checkpoint.elapsed||!Object.hasOwn(checkpoint,'physicsPose'))throw Error('Retained recovery source state unavailable');
 while(current.sequence<sequence){
  const entry=journal.entry(index++);if(!entry)throw Error('Retained recovery cursor unavailable');
  if(entry.kind==='terrain'){
   const revisions=new Map(entry.terrainManifest.chunks.map(row=>[`${row.cx},${row.cz}`,row.revision]));
   for(const payload of entry.chunks){const key=`${payload.cx},${payload.cz}`,meta={cx:payload.cx,cz:payload.cz,revision:revisions.get(key),...(payload.removed===true?{removed:true}:{}),...(payload.capturedAt===undefined?{}:{capturedAt:payload.capturedAt})};metadata.set(key,meta);changes.set(key,payload);if(payload.removed===true)payloads.delete(key);else payloads.set(key,payload);}
   continue;
  }
  const publication=entry.publication;
  if(publication.session!==checkpoint.session||!Number.isFinite(publication.elapsed)||publication.elapsed<current.elapsed)throw Error('Retained recovery source state boundary mismatch');
  let next=state;
  if(publication.unchanged===true){if(publication.elapsed!==current.elapsed||publication.events.length||publication.physicsPose!==undefined||publication.physicsPoses!==undefined||publication.presentationWorkerHeadings!==undefined||changes.size)throw Error('Retained recovery unchanged source mismatch');}
  else{if(typeof publication.snapshot!=='string'||!Object.hasOwn(publication,'physicsPose'))throw Error('Retained recovery source state unavailable');snapshot=publication.snapshot;next=JSON.parse(snapshot);if(next.elapsed!==publication.elapsed)throw Error('Retained recovery source snapshot time mismatch');}
  if(publication.presentationWorkerHeadings!==undefined){if(!headings)throw Error('Retained recovery source heading baseline unavailable');applyPresentationWorkerHeadingDeltas(headings,preparePresentationWorkerHeadingDeltas(headings,publication.presentationWorkerHeadings,next,state));}
  if(publication.nativeWorldResources!==undefined){
   const nextWorld=copyPublishedNativeWorldBoundary(publication,world),expected=new Map();
   for(const record of publication.nativeWorldResources)for(const [points,removed] of [[record.chunks,false],[record.removed,true]])for(const point of points)expected.set(`${point.cx},${point.cz}`,{removed,at:record.worldBoundary.effectiveTime});
   if(expected.size!==changes.size)throw Error('Retained recovery native source terrain mismatch');
   for(const [key,payload] of changes){const target=expected.get(key);if(!target||target.removed!==(payload.removed===true)||!Number.isFinite(payload.capturedAt)||payload.capturedAt<target.at||payload.capturedAt>publication.elapsed)throw Error('Retained recovery native source terrain mismatch');}
   world=nextWorld;
  }else if(world&&changes.size)throw Error('Retained recovery terrain changed without native source boundary');
  changes=new Map();state=next;current=publication.unchanged===true?{...current,sequence:publication.sequence,elapsed:publication.elapsed}:publication;
 }
 const elapsed=current.elapsed;
 if(!presentationCheckpoint||presentationCheckpoint.version!==1||presentationCheckpoint.sequence!==sequence||presentationCheckpoint.elapsed!==elapsed||['guardian','agriculture','blessing'].some(key=>presentationCheckpoint[key]?.version!==1||presentationCheckpoint[key].sequence!==sequence||presentationCheckpoint[key].elapsed!==elapsed))throw Error('Retained recovery presentation boundary mismatch');
 if(workCheckpoint===null?checkpoint.workCheckpoint!==undefined:workCheckpoint?.version!==1||workCheckpoint.sequence!==sequence||workCheckpoint.elapsed!==elapsed||!Array.isArray(workCheckpoint.effects))throw Error('Retained recovery work boundary mismatch');
 const result={session:checkpoint.session,sequence,elapsed,snapshot,physicsPose:current.physicsPose,
  ...(current.physicsPoses===undefined?{}:{physicsPoses:current.physicsPoses}),events:[],
  terrainCheckpoint:{sequence,chunks:[...payloads.values()],terrainManifest:{epoch,chunks:[...metadata.values()].filter(row=>row.removed!==true).map(({cx,cz,revision})=>({cx,cz,revision}))}},
  presentationCheckpoint,...(workCheckpoint===null?{}:{workCheckpoint})};
 if(world)result.terrainCheckpoint.nativeWorldBoundary=world;
 if(headings)result.terrainCheckpoint.workerHeadings=[...headings].map(([id,yaw])=>({id,yaw}));
 result.terrainCheckpoint.terrainHandoff={epoch,lastSequence:sequence,chunks:[...metadata.values()]};
 const status=journal.status(),bytes=estimateRetainedBytes(result);if(status.closed||status.base!==base||status.through!==initial.through||status.candidate!==null||status.encoderFault||bytes>status.maxBytes-status.bytes)throw Error('Retained recovery checkpoint capacity or boundary changed');
 return {checkpoint:structuredClone(result),index,journalBase:base,bytes};
}
