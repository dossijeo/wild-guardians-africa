// Prepare the exact terrain/biome revisions present in one confirmed boundary.
// This adapter does not authorize playback. Its suppression snapshot must
// belong to the same confirmed boundary as the terrain revisions.
import {deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateTerrainResourceRemoval} from '../world/terrain-resource-removal.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../world/native-world-boundary.js';

export async function prepareWebGpuTemporalTerrain(messages,{signal,scene,residency,biome,coordinator,publicationEpoch,publicationOrder,validateInstances,suppressed,requireShadowTarget=false,mudPreparer=null,onPreparedIdentity=null,onDiscardIdentity=null,prepareDependents=null,validatePresentationSupport=null}={}){
 if(!Array.isArray(messages)||!messages.length||!scene?.isScene||typeof requireShadowTarget!=='boolean'||typeof residency?.prepareRevision!=='function'||typeof biome?.prepareRevision!=='function'||typeof biome?.requestSlots!=='function'||typeof coordinator?.prepareBatch!=='function'||typeof publicationEpoch!=='function'||typeof publicationOrder!=='function'||typeof validateInstances!=='function')throw TypeError('Invalid temporal terrain preparation');
 if(onPreparedIdentity!==null&&typeof onPreparedIdentity!=='function'||onDiscardIdentity!==null&&(typeof onDiscardIdentity!=='function'||onPreparedIdentity===null))throw TypeError('Invalid temporal identity observer');
 if(validatePresentationSupport!==null&&typeof validatePresentationSupport!=='function')throw TypeError('Invalid terrain presentation support validator');
 if(prepareDependents!==null&&typeof prepareDependents!=='function')throw TypeError('Invalid terrain dependents preparer');
 if(!Array.isArray(suppressed)||suppressed.some(id=>typeof id!=='string'))throw TypeError('Temporal terrain requires boundary suppression');
 const check=()=>{if(signal?.aborted)throw new DOMException('Temporal terrain preparation cancelled','AbortError');};const keys=new Set(),slots=new Set(),removed=new Set(suppressed),sequence=messages[0]?.sequence,epoch=messages[0]?.epoch??null;
 for(const message of messages){const payload=message?.payload,key=`${payload?.cx},${payload?.cz}`;if(!Number.isSafeInteger(sequence)||sequence<0||message?.sequence!==sequence||(message.epoch??null)!==epoch||!Number.isSafeInteger(payload?.cx)||!Number.isSafeInteger(payload?.cz)||!Number.isSafeInteger(message?.revision)||message.revision<1||keys.has(key))throw TypeError('Invalid temporal terrain boundary');keys.add(key);if(payload.removed!==undefined){validateTerrainResourceRemoval(payload);if(typeof residency.prepareRemoval!=='function'||typeof biome.prepareRemoval!=='function')throw Error('Prepared graphical terrain retirement unavailable');}else{validateInstances(payload);for(let slot=0;slot<payload.instances.length;slot++)if(payload.instances[slot].some(item=>!removed.has(item.id)))slots.add(slot);}}
 check();if(!await biome.ready)throw Error('Biome resources unavailable');check();if(messages.some(message=>!message.payload.removed))await biome.requestSlots([...slots]);check();
 if(mudPreparer!==null&&typeof mudPreparer?.prepare!=='function')throw TypeError('Invalid mud preparer');
 const tokens=[],identities=[],removalIdentities=[],surfaceMeshes=new Map();let canonicalPropsUnmasked=true,dependents=[];
 // Discard every observed identity even if one observer itself fails. A
 // partially registered callback is included because it may already have
 // installed entries before throwing.
 function discard(){let first=null;for(const item of identities.splice(0).reverse())try{onDiscardIdentity?.(item.payload,item.identity);}catch(error){first??=error;}return first;}
 try{
  for(const message of messages){
   check();const {payload,revision,sequence,epoch}=message,order=publicationOrder(),options={publicationEpoch:publicationEpoch(epoch),publicationOrder:order},identity=onPreparedIdentity?{key:`${payload.cx},${payload.cz}`,epoch:epoch??null,revision,sequence,publicationOrder:order}:null;
   if(payload.removed){
    const terrainToken=residency.prepareRemoval(payload,revision,epoch??null,{...options,sequence});if(!terrainToken)throw Error('Terrain removal preparation is stale');tokens.push(terrainToken);
    surfaceMeshes.set(`${payload.cx},${payload.cz}`,null);
    const biomeToken=biome.prepareRemoval(payload,revision,{epoch:epoch??null,sequence},options);if(!biomeToken)throw Error('Biome removal preparation is stale');tokens.push(biomeToken);
    removalIdentities.push({payload,identity:{key:`${payload.cx},${payload.cz}`,epoch:epoch??null,revision,sequence,publicationOrder:order,removed:true}});continue;
   }
   if(onDiscardIdentity)identities.push({payload,identity});onPreparedIdentity?.(payload,identity);
   let mudGeometry=null,terrainToken=residency.prepareRetainedRevision?.(payload,revision,epoch??null,options);try{if(!terrainToken){if(mudPreparer){mudGeometry=await mudPreparer.prepare(payload,revision,{signal});check();}terrainToken=residency.prepareRevision(payload,revision,epoch??null,{...options,mudGeometry,mudPrepared:!!mudPreparer});if(!terrainToken)throw Error('Terrain preparation is stale');mudGeometry=null;}}finally{mudGeometry?.dispose();}
   tokens.push(terrainToken);surfaceMeshes.set(`${payload.cx},${payload.cz}`,terrainToken.surfaceMesh);const biomePrepare=terrainToken.visualReadmission?biome.prepareVisualReadmission:biome.prepareRevision;if(typeof biomePrepare!=='function')throw Error('Biome visual readmission is unavailable');canonicalPropsUnmasked&&=payload.instances.every(items=>items.every(item=>!removed.has(item.id)));const biomeToken=biomePrepare.call(biome,payload,revision,{epoch:epoch??null,sequence},{...options,suppressed:[...removed],retainUnchangedSlots:true});if(!biomeToken)throw Error('Biome preparation is unavailable or stale');tokens.push(biomeToken);
  }
  const proposedView={get(cx,cz){const key=`${cx},${cz}`;return surfaceMeshes.has(key)?surfaceMeshes.get(key):(residency.getVisible??residency.get).call(residency,cx,cz);},changedKeys:new Set(surfaceMeshes.keys())};
  if(prepareDependents){const preparedDependents=await prepareDependents(proposedView,{signal});if(!Array.isArray(preparedDependents))throw TypeError('Invalid prepared terrain dependents');dependents=preparedDependents;}if(validatePresentationSupport)validatePresentationSupport(proposedView,dependents);check();
  const parts=tokens.map(token=>token.participant()),rawBatch=await coordinator.prepareBatch(parts,{signal,scene,...(dependents.length?{dependents}:{}),...(requireShadowTarget?{requireShadowTarget:true}:{})});
  if(!rawBatch||typeof rawBatch.commit!=='function'||typeof rawBatch.abort!=='function')throw TypeError('Invalid prepared temporal batch');
  const batch=Object.isExtensible(rawBatch)&&!Object.hasOwn(rawBatch,'canonicalPropsUnmasked')?rawBatch:{valid:()=>rawBatch.valid?.()===true,commit:()=>rawBatch.commit(),abort:()=>rawBatch.abort(),...(typeof rawBatch.capturePresentation==='function'?{capturePresentation:record=>rawBatch.capturePresentation(record)}:{})};
  Object.defineProperty(batch,'canonicalPropsUnmasked',{value:canonicalPropsUnmasked});
  // Preserve the pre-existing return value and behaviour when no discard
  // observer was requested.
  if(!onDiscardIdentity)return batch;
  if(!batch||typeof batch.commit!=='function'||typeof batch.abort!=='function')throw TypeError('Invalid prepared temporal batch');
  let active=true,committing=false,committedIdentities=null;
  const detach=()=>signal?.removeEventListener('abort',onAbort);
  const abort=()=>{if(!active)return false;if(committing)return batch.abort();active=false;detach();let result,error;try{result=batch.abort();}catch(failure){error=failure;}const failure=discard();if(error||failure)throw error??failure;return result;};
  const onAbort=()=>{try{abort();}catch{}};
  signal?.addEventListener('abort',onAbort,{once:true});if(signal?.aborted){abort();throw new DOMException('Temporal terrain preparation cancelled','AbortError');}
  return {canonicalPropsUnmasked,...(typeof batch.capturePresentation==='function'?{capturePresentation:record=>batch.capturePresentation(record)}:{}),valid:()=>active&&!committing&&batch.valid?.()===true,commit(){if(!active)throw Error('Temporal terrain batch is no longer active');let result;committing=true;try{result=batch.commit();}catch(error){committing=false;try{abort();}catch{}throw error;}committing=false;active=false;detach();if(result!==true){const error=discard();if(error)throw error;}else{committedIdentities=new WeakMap([...identities,...removalIdentities].map(({payload,identity})=>[payload,identity]));identities.length=0;removalIdentities.length=0;}return result;},abort,identityFor(payload){return committedIdentities?.get(payload)??null;}};
 }catch(error){for(const part of [...dependents].reverse())try{part.cancel();}catch{}for(const token of tokens.reverse())try{token.abort();}catch{}discard();throw error;}
}

// Recovery installs a complete versioned resource baseline. Fresh owners are
// required by default; explicit retention also requires current owner/state
// read sets and authoritative handoff revisions for every removed old chunk.
// State, poses, events, effects and native GPU admission remain the caller's
// responsibility. This preparation never grants a native clock/world permit.
export async function prepareWebGpuTemporalCheckpoint(message,options={}){
 const {session,scene,residency,biome,signal,retainCurrent=false,assertCurrent}=options,checkpoint=message?.terrainCheckpoint,manifest=checkpoint?.terrainManifest;
 if(typeof retainCurrent!=='boolean')throw TypeError('Invalid retained checkpoint mode');
 if(typeof session!=='string'||!session||message?.session!==session||!Number.isSafeInteger(message.sequence)||message.sequence<0||!checkpoint||checkpoint.sequence!==message.sequence||!Array.isArray(checkpoint.chunks)||typeof message.snapshot!=='string'||!Number.isFinite(message.elapsed)||message.elapsed<0||!manifest||typeof manifest.epoch!=='string'||!manifest.epoch||!Array.isArray(manifest.chunks)||manifest.chunks.length!==checkpoint.chunks.length||!scene?.isScene||!Number.isSafeInteger(residency?.size)||typeof biome?.status!=='function')throw TypeError('Invalid temporal terrain checkpoint');
 const snapshot=deserializeConfirmedState(message.snapshot);if(snapshot.elapsed!==message.elapsed||!Array.isArray(snapshot.suppressed)||snapshot.suppressed.some(id=>typeof id!=='string'))throw TypeError('Invalid temporal checkpoint snapshot');
 const nativeWorldBoundary=copyNativeWorldBoundary(checkpoint.nativeWorldBoundary??null);
 if(nativeWorldBoundary&&nativeWorldBoundary.effectiveTime>message.elapsed)throw Error('Native world checkpoint is ahead of confirmed time');
 const empty=()=>residency.size===0&&biome.status().chunks===0;
 let terrainBase=null,biomeBase=null;
 if(retainCurrent){
  if(typeof assertCurrent!=='function'||typeof residency.captureCheckpointState!=='function'||typeof biome.captureCheckpointState!=='function'||typeof residency.matchesCheckpoint!=='function'||typeof biome.matchesRetainedCheckpoint!=='function'||typeof options.validateInstances!=='function')throw TypeError('Retained checkpoint requires existing owner and state read sets');
  assertCurrent();terrainBase=residency.captureCheckpointState();biomeBase=biome.captureCheckpointState();
  const props=new Map(biomeBase.chunks.map(chunk=>[`${chunk.cx},${chunk.cz}`,chunk]));
  if(terrainBase.chunks.length!==props.size||terrainBase.chunks.some(chunk=>{const other=props.get(`${chunk.cx},${chunk.cz}`);return chunk.epoch!==manifest.epoch||other?.epoch!==chunk.epoch||other?.revision!==chunk.revision;}))throw Error('Retained checkpoint owner footprints or source epochs differ');
 }else if(!empty())throw Error('Temporal checkpoint requires fresh graphical owners');
 const revisions=new Map();for(const item of manifest.chunks){const key=`${item?.cx},${item?.cz}`;if(!Number.isSafeInteger(item?.cx)||!Number.isSafeInteger(item?.cz)||!Number.isSafeInteger(item?.revision)||item.revision<1||revisions.has(key))throw TypeError('Invalid temporal checkpoint manifest');revisions.set(key,item.revision);}
 const messages=[];for(const payload of checkpoint.chunks){const key=`${payload?.cx},${payload?.cz}`,revision=revisions.get(key),terrain=payload?.terrain;if(revision===undefined||payload?.authority!=='spatial-wasm'||payload.capturedAt!==undefined&&(!Number.isFinite(payload.capturedAt)||payload.capturedAt<0||payload.capturedAt>message.elapsed)||!(terrain?.positions instanceof Float32Array)||terrain.positions.length!==49*49*3||!terrain.positions.every(Number.isFinite)||!(terrain.colors instanceof Float32Array)||terrain.colors.length!==terrain.positions.length||!terrain.colors.every(Number.isFinite)||!(terrain.indices instanceof Uint16Array)||terrain.indices.length!==48*48*6||!terrain.indices.every(index=>index<49*49)||payload.water!==undefined&&(!(payload.water instanceof Float32Array)||payload.water.length%9!==0||!payload.water.every(Number.isFinite))||payload.groundMask!==undefined&&(!(payload.groundMask instanceof Uint8Array)||payload.groundMask.length!==35*35*4))throw TypeError('Invalid temporal checkpoint chunk');revisions.delete(key);if(retainCurrent)options.validateInstances(payload);messages.push({payload,revision,sequence:message.sequence,epoch:manifest.epoch});}
 if(revisions.size)throw TypeError('Incomplete temporal checkpoint manifest');
 if(nativeWorldBoundary){const hidden=new Set(snapshot.suppressed);if(messages.some(({payload})=>payload.instances?.some(items=>items.some(item=>hidden.has(item.id)))))throw Error('Native world checkpoint hides canonical props');}
 const target=new Map(messages.map(item=>[`${item.payload.cx},${item.payload.cz}`,item])),unchanged=[],removals=[];
 let preparedMessages=messages;
 if(retainCurrent){
  const handoff=checkpoint.terrainHandoff,retired=new Map();
  if(handoff!==undefined){
   if(!handoff||handoff.epoch!==manifest.epoch||handoff.lastSequence!==message.sequence||!Array.isArray(handoff.chunks)||handoff.chunks.length>32768)throw TypeError('Invalid retained checkpoint terrain handoff');
   const seen=new Set();let present=0;
   for(const row of handoff.chunks){
    const key=`${row?.cx},${row?.cz}`;
    if(!row||!Number.isSafeInteger(row.cx)||!Number.isSafeInteger(row.cz)||!Number.isSafeInteger(row.revision)||row.revision<1||seen.has(key)||Object.keys(row).some(key=>!['cx','cz','revision','removed','capturedAt'].includes(key))||row.removed!==undefined&&row.removed!==true||row.capturedAt!==undefined&&(!Number.isFinite(row.capturedAt)||row.capturedAt<0||row.capturedAt>message.elapsed))throw TypeError('Invalid retained checkpoint handoff revision');
    seen.add(key);
    if(row.removed===true){if(target.has(key)||!Number.isFinite(row.capturedAt))throw Error('Invalid retained checkpoint retirement proof');retired.set(key,row);}
    else{if(target.get(key)?.revision!==row.revision)throw Error('Retained checkpoint handoff differs from its manifest');present++;}
   }
   if(present!==target.size)throw Error('Incomplete retained checkpoint handoff');
  }
  const current=new Map(terrainBase.chunks.map(chunk=>[`${chunk.cx},${chunk.cz}`,chunk]));
  const props=new Map(biomeBase.chunks.map(chunk=>[`${chunk.cx},${chunk.cz}`,chunk]));
  preparedMessages=messages.filter(item=>{
   const key=`${item.payload.cx},${item.payload.cz}`,prior=current.get(key),metadata={epoch:item.epoch,revision:item.revision};
   if(prior&&residency.matchesCheckpoint(item.payload,metadata)&&biome.matchesRetainedCheckpoint(item.payload,metadata,snapshot.suppressed)){unchanged.push({item,terrain:prior,biome:props.get(key)});return false;}
   if(prior&&item.revision<=prior.revision)throw Error('Retained checkpoint revision conflicts with its current payload');
   return true;
  });
  for(const [key,prior] of current){
   if(target.has(key))continue;
   const proof=retired.get(key);if(!proof||proof.revision<=prior.revision)throw Error('Retained checkpoint retirement lacks its exact source handoff revision');
   removals.push({payload:{authority:'spatial-wasm',cx:proof.cx,cz:proof.cz,removed:true,capturedAt:proof.capturedAt},revision:proof.revision,sequence:message.sequence,epoch:manifest.epoch});
  }
  preparedMessages=[...preparedMessages,...removals];
 }
 const sourceChunks=checkpoint.chunks.slice(),sourceSnapshot=message.snapshot,sourceMeta=JSON.stringify({sequence:message.sequence,elapsed:message.elapsed,checkpointSequence:checkpoint.sequence,manifest:checkpoint.terrainManifest,handoff:checkpoint.terrainHandoff??null});
 const sourceCurrent=()=>message.terrainCheckpoint===checkpoint&&message.snapshot===sourceSnapshot&&checkpoint.chunks.length===sourceChunks.length&&checkpoint.chunks.every((payload,i)=>payload===sourceChunks[i])&&JSON.stringify({sequence:message.sequence,elapsed:message.elapsed,checkpointSequence:checkpoint.sequence,manifest:checkpoint.terrainManifest,handoff:checkpoint.terrainHandoff??null})===sourceMeta;
 const retainedCurrent=()=>unchanged.every(({item,terrain,biome:props})=>terrain.valid()&&props.valid()&&residency.matchesCheckpoint(item.payload,{epoch:item.epoch,revision:item.revision})&&biome.matchesRetainedCheckpoint(item.payload,{epoch:item.epoch,revision:item.revision},snapshot.suppressed));
 function current(){
  if(signal?.aborted)throw new DOMException('Temporal checkpoint cancelled','AbortError');
  if(retainCurrent){assertCurrent();if(!sourceCurrent()||!terrainBase.valid()||!biomeBase.valid()||!retainedCurrent())throw Error('Retained checkpoint owner read set became stale');}
  else if(!empty())throw Error('Temporal checkpoint became stale');
  if(!sameNativeWorldBoundary(copyNativeWorldBoundary(checkpoint.nativeWorldBoundary??null),nativeWorldBoundary))throw Error('Temporal checkpoint became stale');
 }
 current();let batch=null,active=true,committed=false;
 try{batch=preparedMessages.length?await prepareWebGpuTemporalTerrain(preparedMessages,{...options,suppressed:snapshot.suppressed,requireShadowTarget:true}):null;current();}catch(error){try{batch?.abort();}catch{}throw error;}
 return {sequence:message.sequence,epoch:manifest.epoch,elapsed:message.elapsed,suppressed:[...snapshot.suppressed],chunks:messages.map(({payload,revision})=>({payload,revision,epoch:manifest.epoch,sequence:message.sequence})),...(retainCurrent?{retained:true,removals}:{}),
  get nativeWorldBoundary(){return committed?nativeWorldBoundary:null;},
  commit(){if(!active)throw Error('Temporal checkpoint already consumed');try{
    current();active=false;const result=batch?batch.commit():true;
    if(result!==true){batch?.abort();return result;}
    // Once the existing atomic batch committed, a late abort does not undo it.
    // A changed retained owner still prevents a false resource certificate.
    if(retainCurrent){assertCurrent();if(!sourceCurrent()||!retainedCurrent())throw Error('Retained checkpoint owner changed during commit');}
    committed=true;return true;
   }catch(error){active=false;try{batch?.abort();}catch{}throw error;}},
  abort(){if(!active)return false;active=false;batch?.abort();return true;}};
}
