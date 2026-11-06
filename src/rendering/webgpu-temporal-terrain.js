// Prepare the exact terrain/biome revisions present in one confirmed boundary.
// This adapter does not authorize playback or resolve future-state suppression.
// Biome meshes use the currently reconciled suppression set; if the next
// confirmed state changes it, activation rejects the stale batch rather than
// silently publishing it. The timeline must remain disabled until the next
// boundary can be prepared against its matching state and retried safely.
export async function prepareWebGpuTemporalTerrain(messages,{signal,scene,residency,biome,coordinator,publicationEpoch,publicationOrder,validateInstances}={}){
 if(!Array.isArray(messages)||!messages.length||!scene?.isScene||typeof residency?.prepareRevision!=='function'||typeof biome?.prepareRevision!=='function'||typeof biome?.requestSlots!=='function'||typeof coordinator?.prepareBatch!=='function'||typeof publicationEpoch!=='function'||typeof publicationOrder!=='function'||typeof validateInstances!=='function')throw TypeError('Invalid temporal terrain preparation');
 const check=()=>{if(signal?.aborted)throw new DOMException('Temporal terrain preparation cancelled','AbortError');};const keys=new Set(),slots=new Set();
 for(const message of messages){const payload=message?.payload,key=`${payload?.cx},${payload?.cz}`;if(!Number.isSafeInteger(payload?.cx)||!Number.isSafeInteger(payload?.cz)||!Number.isSafeInteger(message?.revision)||message.revision<1||keys.has(key))throw TypeError('Invalid temporal terrain boundary');validateInstances(payload);keys.add(key);for(let slot=0;slot<payload.instances.length;slot++)if(payload.instances[slot].length)slots.add(slot);}
 check();if(!await biome.ready)throw Error('Biome resources unavailable');check();await biome.requestSlots([...slots]);check();
 const tokens=[];try{for(const message of messages){check();const {payload,revision,sequence,epoch}=message,order=publicationOrder(),options={publicationEpoch:publicationEpoch(epoch),publicationOrder:order};const terrainToken=residency.prepareRevision(payload,revision,epoch??null,options);if(!terrainToken)throw Error('Terrain preparation is stale');tokens.push(terrainToken);const biomeToken=biome.prepareRevision(payload,revision,{epoch:epoch??null,sequence},options);if(!biomeToken)throw Error('Biome preparation is unavailable or stale');tokens.push(biomeToken);}const parts=tokens.map(token=>token.participant());return await coordinator.prepareBatch(parts,{signal,scene});}catch(error){for(const token of tokens.reverse())try{token.abort();}catch{}throw error;}
}
