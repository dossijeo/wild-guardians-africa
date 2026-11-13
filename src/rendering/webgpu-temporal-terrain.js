// Prepare the exact terrain/biome revisions present in one confirmed boundary.
// This adapter does not authorize playback. Its suppression snapshot must
// belong to the same confirmed boundary as the terrain revisions.
import {deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateTerrainResourceRemoval} from '../world/terrain-resource-removal.js';

export async function prepareWebGpuTemporalTerrain(messages,{signal,scene,residency,biome,coordinator,publicationEpoch,publicationOrder,validateInstances,suppressed,requireShadowTarget=false,mudPreparer=null,onPreparedIdentity=null,onDiscardIdentity=null}={}){
 if(!Array.isArray(messages)||!messages.length||!scene?.isScene||typeof requireShadowTarget!=='boolean'||typeof residency?.prepareRevision!=='function'||typeof biome?.prepareRevision!=='function'||typeof biome?.requestSlots!=='function'||typeof coordinator?.prepareBatch!=='function'||typeof publicationEpoch!=='function'||typeof publicationOrder!=='function'||typeof validateInstances!=='function')throw TypeError('Invalid temporal terrain preparation');
 if(onPreparedIdentity!==null&&typeof onPreparedIdentity!=='function'||onDiscardIdentity!==null&&(typeof onDiscardIdentity!=='function'||onPreparedIdentity===null))throw TypeError('Invalid temporal identity observer');
 if(!Array.isArray(suppressed)||suppressed.some(id=>typeof id!=='string'))throw TypeError('Temporal terrain requires boundary suppression');
 const check=()=>{if(signal?.aborted)throw new DOMException('Temporal terrain preparation cancelled','AbortError');};const keys=new Set(),slots=new Set(),removed=new Set(suppressed),sequence=messages[0]?.sequence,epoch=messages[0]?.epoch??null;
 for(const message of messages){const payload=message?.payload,key=`${payload?.cx},${payload?.cz}`;if(!Number.isSafeInteger(sequence)||sequence<0||message?.sequence!==sequence||(message.epoch??null)!==epoch||!Number.isSafeInteger(payload?.cx)||!Number.isSafeInteger(payload?.cz)||!Number.isSafeInteger(message?.revision)||message.revision<1||keys.has(key))throw TypeError('Invalid temporal terrain boundary');keys.add(key);if(payload.removed!==undefined){validateTerrainResourceRemoval(payload);if(typeof residency.prepareRemoval!=='function'||typeof biome.prepareRemoval!=='function')throw Error('Prepared graphical terrain retirement unavailable');}else{validateInstances(payload);for(let slot=0;slot<payload.instances.length;slot++)if(payload.instances[slot].some(item=>!removed.has(item.id)))slots.add(slot);}}
 check();if(!await biome.ready)throw Error('Biome resources unavailable');check();if(messages.some(message=>!message.payload.removed))await biome.requestSlots([...slots]);check();
 if(mudPreparer!==null&&typeof mudPreparer?.prepare!=='function')throw TypeError('Invalid mud preparer');
 const tokens=[],identities=[],removalIdentities=[];
 // Discard every observed identity even if one observer itself fails. A
 // partially registered callback is included because it may already have
 // installed entries before throwing.
 function discard(){let first=null;for(const item of identities.splice(0).reverse())try{onDiscardIdentity?.(item.payload,item.identity);}catch(error){first??=error;}return first;}
 try{
  for(const message of messages){
   check();const {payload,revision,sequence,epoch}=message,order=publicationOrder(),options={publicationEpoch:publicationEpoch(epoch),publicationOrder:order},identity=onPreparedIdentity?{key:`${payload.cx},${payload.cz}`,epoch:epoch??null,revision,sequence,publicationOrder:order}:null;
   if(payload.removed){
    const terrainToken=residency.prepareRemoval(payload,revision,epoch??null,{...options,sequence});if(!terrainToken)throw Error('Terrain removal preparation is stale');tokens.push(terrainToken);
    const biomeToken=biome.prepareRemoval(payload,revision,{epoch:epoch??null,sequence},options);if(!biomeToken)throw Error('Biome removal preparation is stale');tokens.push(biomeToken);
    removalIdentities.push({payload,identity:{key:`${payload.cx},${payload.cz}`,epoch:epoch??null,revision,sequence,publicationOrder:order,removed:true}});continue;
   }
   if(onDiscardIdentity)identities.push({payload,identity});onPreparedIdentity?.(payload,identity);
   let mudGeometry=null,terrainToken;try{if(mudPreparer){mudGeometry=await mudPreparer.prepare(payload,revision,{signal});check();}terrainToken=residency.prepareRevision(payload,revision,epoch??null,{...options,mudGeometry,mudPrepared:!!mudPreparer});if(!terrainToken)throw Error('Terrain preparation is stale');mudGeometry=null;}finally{mudGeometry?.dispose();}
   tokens.push(terrainToken);const biomePrepare=terrainToken.visualReadmission?biome.prepareVisualReadmission:biome.prepareRevision;if(typeof biomePrepare!=='function')throw Error('Biome visual readmission is unavailable');const biomeToken=biomePrepare.call(biome,payload,revision,{epoch:epoch??null,sequence},{...options,suppressed});if(!biomeToken)throw Error('Biome preparation is unavailable or stale');tokens.push(biomeToken);
  }
  const parts=tokens.map(token=>token.participant()),batch=await coordinator.prepareBatch(parts,{signal,scene,...(requireShadowTarget?{requireShadowTarget:true}:{})});
  // Preserve the pre-existing return value and behaviour when no discard
  // observer was requested.
  if(!onDiscardIdentity)return batch;
  if(!batch||typeof batch.commit!=='function'||typeof batch.abort!=='function')throw TypeError('Invalid prepared temporal batch');
  let active=true,committing=false,committedIdentities=null;
  const detach=()=>signal?.removeEventListener('abort',onAbort);
  const abort=()=>{if(!active)return false;if(committing)return batch.abort();active=false;detach();let result,error;try{result=batch.abort();}catch(failure){error=failure;}const failure=discard();if(error||failure)throw error??failure;return result;};
  const onAbort=()=>{try{abort();}catch{}};
  signal?.addEventListener('abort',onAbort,{once:true});if(signal?.aborted){abort();throw new DOMException('Temporal terrain preparation cancelled','AbortError');}
  return {commit(){if(!active)throw Error('Temporal terrain batch is no longer active');let result;committing=true;try{result=batch.commit();}catch(error){committing=false;try{abort();}catch{}throw error;}committing=false;active=false;detach();if(result!==true){const error=discard();if(error)throw error;}else{committedIdentities=new WeakMap([...identities,...removalIdentities].map(({payload,identity})=>[payload,identity]));identities.length=0;removalIdentities.length=0;}return result;},abort,identityFor(payload){return committedIdentities?.get(payload)??null;}};
 }catch(error){for(const token of tokens.reverse())try{token.abort();}catch{}discard();throw error;}
}

// Recovery can install a versioned baseline into a fresh graphical owner. A
// caller still has to restore and coordinate the confirmed state, poses,
// events and effects before acknowledging recovery; this is terrain only.
export async function prepareWebGpuTemporalCheckpoint(message,options={}){
 const {session,scene,residency,biome,signal}=options,checkpoint=message?.terrainCheckpoint,manifest=checkpoint?.terrainManifest;
 if(typeof session!=='string'||!session||message?.session!==session||!Number.isSafeInteger(message.sequence)||message.sequence<0||!checkpoint||checkpoint.sequence!==message.sequence||!Array.isArray(checkpoint.chunks)||typeof message.snapshot!=='string'||!Number.isFinite(message.elapsed)||message.elapsed<0||!manifest||typeof manifest.epoch!=='string'||!manifest.epoch||!Array.isArray(manifest.chunks)||manifest.chunks.length!==checkpoint.chunks.length||!scene?.isScene||!Number.isSafeInteger(residency?.size)||typeof biome?.status!=='function')throw TypeError('Invalid temporal terrain checkpoint');
 const snapshot=deserializeConfirmedState(message.snapshot);if(snapshot.elapsed!==message.elapsed||!Array.isArray(snapshot.suppressed)||snapshot.suppressed.some(id=>typeof id!=='string'))throw TypeError('Invalid temporal checkpoint snapshot');
 const empty=()=>residency.size===0&&biome.status().chunks===0;if(!empty())throw Error('Temporal checkpoint requires fresh graphical owners');
 const revisions=new Map();for(const item of manifest.chunks){const key=`${item?.cx},${item?.cz}`;if(!Number.isSafeInteger(item?.cx)||!Number.isSafeInteger(item?.cz)||!Number.isSafeInteger(item?.revision)||item.revision<1||revisions.has(key))throw TypeError('Invalid temporal checkpoint manifest');revisions.set(key,item.revision);}
 const messages=[];for(const payload of checkpoint.chunks){const key=`${payload?.cx},${payload?.cz}`,revision=revisions.get(key),terrain=payload?.terrain;if(revision===undefined||payload?.authority!=='spatial-wasm'||payload.capturedAt!==undefined&&(!Number.isFinite(payload.capturedAt)||payload.capturedAt<0||payload.capturedAt>message.elapsed)||!(terrain?.positions instanceof Float32Array)||terrain.positions.length!==49*49*3||!terrain.positions.every(Number.isFinite)||!(terrain.colors instanceof Float32Array)||terrain.colors.length!==terrain.positions.length||!terrain.colors.every(Number.isFinite)||!(terrain.indices instanceof Uint16Array)||terrain.indices.length!==48*48*6||!terrain.indices.every(index=>index<49*49)||payload.water!==undefined&&(!(payload.water instanceof Float32Array)||payload.water.length%9!==0||!payload.water.every(Number.isFinite))||payload.groundMask!==undefined&&(!(payload.groundMask instanceof Uint8Array)||payload.groundMask.length!==35*35*4))throw TypeError('Invalid temporal checkpoint chunk');revisions.delete(key);messages.push({payload,revision,sequence:message.sequence,epoch:manifest.epoch});}
 if(revisions.size)throw TypeError('Incomplete temporal checkpoint manifest');
 // A recovery surface has no render loop until recovery completes. A missing
 // target must fail explicitly rather than wait for a frame that cannot run.
 const batch=messages.length?await prepareWebGpuTemporalTerrain(messages,{...options,suppressed:snapshot.suppressed,requireShadowTarget:true}):null;let active=true;
 return {sequence:message.sequence,epoch:manifest.epoch,elapsed:message.elapsed,suppressed:[...snapshot.suppressed],chunks:messages.map(({payload,revision})=>({payload,revision,epoch:manifest.epoch,sequence:message.sequence})),commit(){if(!active)throw Error('Temporal checkpoint already consumed');if(signal?.aborted||!empty()){active=false;batch?.abort();throw Error('Temporal checkpoint became stale');}active=false;return batch?batch.commit():true;},abort(){if(!active)return false;active=false;batch?.abort();return true;}};
}
