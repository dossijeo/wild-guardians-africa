import {createCanonicalTerrainCertificate} from './canonical-terrain-surface.js';
import * as THREE from 'three';
import {nativeTerrainBuffer} from './terrain-geometry.js';
import {nativeWaterBuffer} from './water-geometry.js';
import {createTerrainAdmission} from './webgpu-terrain-admission.js';
import {SpatialSurfaceView} from '../world/wild-engine/spatial-surface-view.js';
import {validateTerrainResourceRemoval} from '../world/terrain-resource-removal.js';

// Worker-owned render residency for the existing Wild Engine chunk payload.
// The caller owns the material and ensures it is ready before publication.
// Revision/tombstone ordering prevents old chunk messages from resurrecting an
// evicted or superseded surface. This module does not generate world state.
export function createWebGpuTerrainResidency({scene,material,waterMaterial=null,mudMaterial=null,materialFactory=null,materialUsesCanonicalTerrainOnly=false,sharedMaterials=[],onRevision=null,canEvictVisualLocal=null,pipelineAdmission=null,resourceRegistry=null,coordinator=null,onAdmissionError=()=>{},onPublished=()=>{}}={}){
 if(typeof document!=='undefined')throw Error('WebGPU terrain residency requires a Worker');
 if(resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function'||!scene?.isScene||!material?.isMaterial||waterMaterial!==null&&!waterMaterial.isMaterial||mudMaterial!==null&&!mudMaterial.isMaterial||materialFactory!==null&&typeof materialFactory!=='function'||!Array.isArray(sharedMaterials)||sharedMaterials.some(item=>!item?.isMaterial)||onRevision!==null&&typeof onRevision!=='function'||canEvictVisualLocal!==null&&typeof canEvictVisualLocal!=='function'||pipelineAdmission!==null&&typeof pipelineAdmission.prepare!=='function'||coordinator!==null&&(!pipelineAdmission||typeof coordinator?.offer!=='function'||typeof coordinator?.forget!=='function')||typeof onAdmissionError!=='function'||typeof onPublished!=='function')throw TypeError('Terrain residency requires a scene and material');
 if(typeof materialUsesCanonicalTerrainOnly!=='boolean')throw TypeError('Invalid terrain material dependency contract');
 const borrowedMaterials=new Set([material,...sharedMaterials]);
 const releases=new WeakMap(),retainers=new WeakMap();let nextResourceId=0;
 const entries=new Map(),waters=new Map(),versions=new Map(),epochs=new Map(),visualEvictions=new Map(),prepared=new Set(),surfaceView=new SpatialSurfaceView(),canonicalSurface=createCanonicalTerrainCertificate(),publisher=pipelineAdmission?createTerrainAdmission({scene,admission:pipelineAdmission,coordinator,onError:onAdmissionError,onPublished}):null;let closed=false;
 function releaseWater(key){const water=waters.get(key);if(water){scene.remove(water);water.geometry.dispose();waters.delete(key);}}
 let visualEvictionKey=null;
 const check=(cx,cz,revision)=>{
  if(closed)throw Error('Terrain residency disposed');
  if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz)||!Number.isSafeInteger(revision)||revision<0)throw TypeError('Invalid terrain identity');
  if(visualEvictionKey===`${cx},${cz}`)throw Error('Terrain visual eviction in progress');
  return `${cx},${cz}`;
 };
 function canInstall(key,revision,epoch){const previous=versions.get(key),evicted=visualEvictions.get(key);return previous===undefined||revision>previous||revision===previous&&evicted?.revision===revision&&evicted.epoch===epoch;}
 function validateEvictedPayload(key,payload,revision,epoch){
  const prior=visualEvictions.get(key);if(!prior||prior.revision!==revision||prior.epoch!==epoch)return;
  const equal=(a,b)=>a==null&&b==null||!!a&&!!b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
  if(!equal(prior.positions,payload.terrain.positions)||!equal(prior.colors,payload.terrain.colors)||!equal(prior.indices,payload.terrain.indices)||!equal(prior.water,payload.water?.length?payload.water:null)||!equal(prior.groundMask,payload.groundMask??null)||prior.mud!==(payload.mudInputs?JSON.stringify(payload.mudInputs):null))throw Error('Evicted terrain revision payload changed');
 }
 function validateRevision(payload,revision,epoch=null,{publicationEpoch=epoch,publicationRevision=revision,publicationOrder=undefined}={}){
  check(payload?.cx,payload?.cz,revision);
  if(epoch!==null&&(typeof epoch!=='string'||!epoch)||publicationEpoch!==null&&(typeof publicationEpoch!=='string'||!publicationEpoch))throw TypeError('Invalid terrain epoch');
  if(!Number.isSafeInteger(publicationRevision)||publicationRevision<(coordinator?1:0))throw TypeError('Invalid terrain publication revision');
  if(publicationOrder!==undefined&&(!Number.isSafeInteger(publicationOrder)||publicationOrder<1))throw TypeError('Invalid terrain publication order');
  const terrain=payload?.terrain;
  if(payload.authority!=='spatial-wasm'||!(terrain?.positions instanceof Float32Array)||!(terrain.colors instanceof Float32Array)||!(terrain.indices instanceof Uint16Array)||terrain.positions.length!==49*49*3||terrain.colors.length!==terrain.positions.length||terrain.indices.length!==48*48*6)throw TypeError('Invalid Wild Engine terrain payload');
  if(payload.water!==undefined&&(!(payload.water instanceof Float32Array)||payload.water.length%9!==0||payload.water.length&&!waterMaterial))throw TypeError('Invalid Wild Engine water payload');
 }
 // The caller transfers exclusive ownership of the payload and its buffers
 // until commit or abort. Identity checks cannot detect in-place mutations.
 // This only prepares CPU geometry: it is not an atomic batch or GPU-ready
 // certificate, and admission may still complete asynchronously after commit.
 function prepareRevision(payload,revision,epoch=null,{publicationEpoch=epoch,publicationRevision=revision,publicationOrder=undefined,mudGeometry=null,mudPrepared=false}={}){
  const key=check(payload?.cx,payload?.cz,revision);
  if(!canInstall(key,revision,epoch))return null;
  validateRevision(payload,revision,epoch,{publicationEpoch,publicationRevision,publicationOrder});
  validateEvictedPayload(key,payload,revision,epoch);
  const terrain=payload.terrain,identity={cx:payload.cx,cz:payload.cz,positions:terrain.positions,colors:terrain.colors,indices:terrain.indices,water:payload.water,groundMask:payload.groundMask},visualReadmission=visualEvictions.has(key)&&versions.get(key)===revision&&epochs.get(key)===epoch;
  if(typeof mudPrepared!=='boolean'||mudPrepared&&!payload.mudInputs||mudGeometry!==null&&(!mudGeometry.isBufferGeometry||!mudMaterial||!publisher))throw TypeError('Invalid prepared mud geometry');
  let geometry,mesh,waterGeometry,water,mud,chunkMaterial;
  try{geometry=nativeTerrainBuffer(terrain);chunkMaterial=materialFactory?.(payload)??material;if(!chunkMaterial?.isMaterial)throw TypeError('Invalid chunk material');mesh=new THREE.Mesh(geometry,chunkMaterial);mesh.position.set(payload.cx*48,0,payload.cz*48);mesh.receiveShadow=true;mesh.userData.ground=true;mesh.userData.spatialAuthority=payload.authority;mesh.userData.spatialTerrainRevision=revision;mesh.userData.checkpointGroundMask=payload.groundMask?.slice()??null;mesh.userData.checkpointMud=mudPrepared?JSON.stringify(payload.mudInputs):null;mesh.userData.unrecordedMudInputs=!!payload.mudInputs&&!mudPrepared;mesh.userData.mudSurface=mudGeometry?.userData??null;if(payload.water?.length){waterGeometry=nativeWaterBuffer(payload.water);water=new THREE.Mesh(waterGeometry,waterMaterial);water.position.copy(mesh.position);water.receiveShadow=true;water.userData.nativeFluid='chunk';water.userData.spatialTerrainRevision=revision;}if(mudGeometry){mud=new THREE.Mesh(mudGeometry,mudMaterial);mud.position.copy(mesh.position);mud.receiveShadow=true;mud.userData.mudSurface=mudGeometry.userData;}}
  catch(error){if(mesh?.parent===scene)scene.remove(mesh);if(water?.parent===scene)scene.remove(water);geometry?.dispose();if(chunkMaterial&&!borrowedMaterials.has(chunkMaterial))chunkMaterial.dispose();waterGeometry?.dispose();throw error;}
  const group=publisher?new THREE.Group():null;if(group){group.add(mesh);if(water)group.add(water);if(mud)group.add(mud);}
  let active=true,released=false,applied=false,base=null,leased=null,activating=false;const disposeOwned=(includeMud=true)=>{geometry.dispose();if(!borrowedMaterials.has(chunkMaterial))chunkMaterial.dispose();waterGeometry?.dispose();if(includeMud)mudGeometry?.dispose();};let resourceLease;try{resourceLease=resourceRegistry?.adopt({namespace:'terrain',key:`${epoch??'local'}:${key}:${revision}:${++nextResourceId}`,bytes:terrain.positions.byteLength+terrain.colors.byteLength+terrain.indices.byteLength+(payload.water?.byteLength??0)+(payload.groundMask?.byteLength??0)+(mudGeometry?Object.values(mudGeometry.attributes).reduce((n,a)=>n+a.array.byteLength,0):0),dispose:disposeOwned});}catch(error){disposeOwned(false);throw error;}let holds=0;const retire=()=>{if(released&&holds===0){if(resourceLease)resourceLease.release();else disposeOwned();}};const release=()=>{if(released)return;released=true;retire();};releases.set(mesh,release);retainers.set(mesh,()=>{if(released)throw Error('Terrain resource already retired');holds++;let done=false;return ()=>{if(done)return;done=true;holds--;retire();};});
  function rollbackLogical(){if(!applied)return false;if(entries.get(key)!==mesh||versions.get(key)!==revision)throw Error('Terrain ownership changed during logical rollback');const restore=(map,value)=>{if(value.present)map.set(key,value.value);else map.delete(key);};restore(entries,base.entry);restore(versions,base.version);restore(epochs,base.epoch);restore(visualEvictions,base.eviction);restore(waters,base.water);restore(surfaceView.chunks,base.surface);applied=false;base=null;return true;}
  const token={object:group??mesh,surfaceMesh:mesh,visualReadmission,applyLogical(){
   if(!active)throw Error('Terrain preparation already consumed');if(leased&&!activating)throw Error('Terrain preparation reserved for batch');if(applied)throw Error('Terrain preparation already applied');if(payload.cx!==identity.cx||payload.cz!==identity.cz||payload.terrain!==terrain||terrain.positions!==identity.positions||terrain.colors!==identity.colors||terrain.indices!==identity.indices||payload.water!==identity.water||payload.groundMask!==identity.groundMask){token.abort();throw Error('Prepared terrain payload changed');}check(payload.cx,payload.cz,revision);if(!canInstall(key,revision,epoch)){token.abort();return false;}
   validateRevision(payload,revision,epoch,{publicationEpoch,publicationRevision,publicationOrder});validateEvictedPayload(key,payload,revision,epoch);const capture=map=>({present:map.has(key),value:map.get(key)});base={entry:capture(entries),version:capture(versions),epoch:capture(epochs),eviction:capture(visualEvictions),water:capture(waters),surface:capture(surfaceView.chunks)};entries.set(key,mesh);versions.set(key,revision);epochs.set(key,epoch);visualEvictions.delete(key);surfaceView.install(payload);if(water)waters.set(key,water);else waters.delete(key);applied=true;return true;
  },rollbackLogical,abort(){if(!active)return false;if(leased){const participant=leased;leased=null;participant.cancel();return true;}if(applied)rollbackLogical();active=false;prepared.delete(token);mesh.removeFromParent();water?.removeFromParent();release();return true;},participant(){
   if(!active||applied||leased||!publisher||!coordinator||!Number.isSafeInteger(publicationOrder))throw Error('Terrain batch participant unavailable');const visual=publisher.prepareParticipant(key,group,[mesh,...(water?[water]:[]),...(mud?[mud]:[])],release,{revision:publicationRevision,epoch:publicationEpoch,publicationOrder,sourceIdentity:{epoch,revision,...(publicationOrder===undefined?{}:{publicationOrder})}});
   const participant={...visual,activate(){activating=true;try{if(!token.applyLogical())return false;try{return visual.activate();}catch(error){rollbackLogical();throw error;}}finally{activating=false;}},finalize(){const result=visual.finalize();resourceLease?.commit();return {retire(){active=false;leased=null;prepared.delete(token);base=null;applied=false;result.retire();},notify(){result.notify();onRevision?.({cx:identity.cx,cz:identity.cz,revision,epoch,kind:'replace'});}};},cancel(){if(!active)return;leased=null;try{visual.cancel();}finally{if(applied)rollbackLogical();active=false;prepared.delete(token);mesh.removeFromParent();water?.removeFromParent();release();}}};leased=participant;return participant;
  },publish(){
   if(leased)throw Error('Terrain preparation reserved for batch');if(!active||!applied)throw Error('Terrain preparation not applied');if(entries.get(key)!==mesh||versions.get(key)!==revision)throw Error('Terrain ownership changed before publication');
   try{if(!publisher){scene.add(mesh);if(water)scene.add(water);}else if(!publisher.publish(key,group,water?[mesh,water]:[mesh],release,{revision:publicationRevision,epoch:publicationEpoch,publicationOrder,sourceIdentity:{epoch,revision,...(publicationOrder===undefined?{}:{publicationOrder})}})){token.abort();return false;}}catch(error){token.abort();throw error;}
   resourceLease?.commit();active=false;prepared.delete(token);const old=base.entry.value,oldWater=base.water.value;base=null;applied=false;
   if(!publisher){if(old){scene.remove(old);if(oldWater)scene.remove(oldWater);releases.get(old)?.();}else if(oldWater){scene.remove(oldWater);oldWater.geometry.dispose();}}onRevision?.({cx:payload.cx,cz:payload.cz,revision,epoch,kind:'replace'});return true;
  },commit(){if(leased)throw Error('Terrain preparation reserved for batch');if(!token.applyLogical())return false;return token.publish();}};prepared.add(token);return token;
 }
 // Keep BufferAttribute identity/version when only props changed. The audited
 // product ground factories depend on canonical terrain/mask and coordinates;
 // unknown custom factories conservatively keep the replacement path.
 function prepareRetainedRevision(payload,revision,epoch=null,{publicationEpoch=epoch,publicationRevision=revision,publicationOrder}={}){
  const key=check(payload?.cx,payload?.cz,revision),mesh=entries.get(key),priorRevision=versions.get(key),water=waters.get(key);
  if(!publisher||!coordinator||!mesh||!publisher.isVisible(key,mesh)||epoch===null||epochs.get(key)!==epoch||revision<=priorRevision||!Number.isSafeInteger(publicationOrder)||materialFactory&&!materialUsesCanonicalTerrainOnly||mesh.userData.unrecordedMudInputs)return null;
  validateRevision(payload,revision,epoch,{publicationEpoch,publicationRevision,publicationOrder});
  // Three r180 promotes native Uint16 indices to Uint32 in WebGPUAttributeUtils.
  // Compare their canonical values, not the backend's storage representation.
  const equal=(a,b)=>a==null&&b==null||!!a&&!!b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
  const sameContent=()=>equal(mesh.geometry.attributes.position.array,payload.terrain.positions)&&equal(mesh.geometry.attributes.color.array,payload.terrain.colors)&&equal(mesh.geometry.index.array,payload.terrain.indices)&&equal(water?.geometry.attributes.position.array??null,payload.water?.length?payload.water:null)&&equal(mesh.userData.checkpointGroundMask,payload.groundMask??null)&&mesh.userData.checkpointMud===(payload.mudInputs?JSON.stringify(payload.mudInputs):null);
  if(!sameContent())return null;
  const terrain=payload.terrain,cx=payload.cx,cz=payload.cz;let active=true,applied=false,leased=null;
  const current=()=>!closed&&entries.get(key)===mesh&&publisher.isVisible(key,mesh)&&versions.get(key)===(applied?revision:priorRevision)&&epochs.get(key)===epoch&&payload.cx===cx&&payload.cz===cz&&payload.terrain===terrain&&sameContent();
  const rollback=()=>{if(!applied)return;if(entries.get(key)!==mesh||versions.get(key)!==revision)throw Error('Retained terrain rollback is stale');versions.set(key,priorRevision);mesh.userData.spatialTerrainRevision=priorRevision;if(water)water.userData.spatialTerrainRevision=priorRevision;applied=false;};
  const token={object:mesh.parent,surfaceMesh:mesh,retained:true,visualReadmission:false,
   abort(){if(!active)return false;if(leased){leased.cancel();return true;}active=false;prepared.delete(token);return true;},
   participant(){
    if(!active||leased||applied)throw Error('Retained terrain participant unavailable');
    const visual=publisher.prepareRetainedParticipant(key,mesh,{revision:publicationRevision,epoch:publicationEpoch,publicationOrder,sourceIdentity:{epoch,revision,publicationOrder}});
    const participant={...visual,
     activate(){if(!current())throw Error('Retained terrain preparation is stale');validateRevision(payload,revision,epoch,{publicationEpoch,publicationRevision,publicationOrder});versions.set(key,revision);mesh.userData.spatialTerrainRevision=revision;if(water)water.userData.spatialTerrainRevision=revision;applied=true;try{return visual.activate();}catch(error){rollback();throw error;}},
     finalize(){if(!current())throw Error('Retained terrain preparation is stale');const result=visual.finalize();return {retire(){active=false;leased=null;applied=false;prepared.delete(token);result.retire();},notify(){result.notify();onRevision?.({cx,cz,revision,epoch,kind:'replace'});}};},
     cancel(){if(!active)return;leased=null;try{visual.cancel();}finally{rollback();active=false;prepared.delete(token);}}
    };leased=participant;return participant;
   }
  };prepared.add(token);return token;
 }
 function replace(payload,revision,epoch=null,options={}){
  const token=prepareRevision(payload,revision,epoch,options);if(!token)return false;try{return token.commit();}catch(error){token.abort();throw error;}
 }
 // A physical retirement participates in the same reversible terrain/biome
 // batch. The empty group is a transaction marker, not replacement geometry.
 function prepareRemoval(payload,revision,epoch=null,{publicationEpoch=epoch,publicationRevision=revision,publicationOrder,sequence}={}){
  validateTerrainResourceRemoval(payload);const {cx,cz,capturedAt}=payload,key=check(cx,cz,revision);
  if(epoch!==null&&(typeof epoch!=='string'||!epoch)||publicationEpoch!==null&&(typeof publicationEpoch!=='string'||!publicationEpoch)||
     !Number.isSafeInteger(publicationRevision)||publicationRevision<1||!Number.isSafeInteger(publicationOrder)||publicationOrder<1||!Number.isSafeInteger(sequence)||sequence<0)
   throw TypeError('Invalid prepared terrain removal');
  if(!publisher||!coordinator)throw Error('Prepared terrain removal requires coordinated admission');
  const maps=[entries,versions,epochs,visualEvictions,waters,surfaceView.chunks],base=maps.map(map=>({present:map.has(key),value:map.get(key)}));
  if(base[1].present&&revision<=base[1].value)return null;
  const group=new THREE.Group();let active=true,applied=false,leased=null;
  const restore=()=>{for(let i=0;i<maps.length;i++){const map=maps[i],prior=base[i];if(prior.present)map.set(key,prior.value);else map.delete(key);}applied=false;};
  const current=()=>!closed&&payload.cx===cx&&payload.cz===cz&&payload.capturedAt===capturedAt&&payload.removed===true&&maps.every((map,i)=>map.has(key)===base[i].present&&map.get(key)===base[i].value);
  const token={object:group,surfaceMesh:null,abort(){if(!active)return false;if(leased){leased.cancel();return true;}active=false;prepared.delete(token);return true;},participant(){
   if(!active||leased||applied)throw Error('Terrain removal participant unavailable');
   const visual=publisher.prepareParticipant(key,group,[],()=>{},{revision:publicationRevision,epoch:publicationEpoch,publicationOrder});
   const participant={...visual,activate(){if(!current())throw Error('Prepared terrain removal is stale');validateTerrainResourceRemoval(payload);
     for(const map of maps)map.delete(key);versions.set(key,revision);applied=true;
     try{return visual.activate();}catch(error){restore();throw error;}
    },finalize(){const result=visual.finalize();return {retire(){active=false;leased=null;applied=false;prepared.delete(token);try{result.retire();}finally{publisher.remove(key);}},
      notify(){onRevision?.({cx,cz,revision,epoch,kind:'remove',cause:'confirmed',sequence,publicationOrder});}};},
    cancel(){if(!active)return;leased=null;try{visual.cancel();}finally{if(applied){if(entries.has(key)||versions.get(key)!==revision)throw Error('Terrain removal rollback is stale');restore();}active=false;prepared.delete(token);}}
   };leased=participant;return participant;
  }};prepared.add(token);return token;
 }
 function remove(cx,cz,revision){
  const key=check(cx,cz,revision),previous=versions.get(key);if(previous!==undefined&&revision<=previous)return false;
  coordinator?.forget?.(key);versions.set(key,revision);epochs.delete(key);visualEvictions.delete(key);const old=entries.get(key);if(old){entries.delete(key);surfaceView.remove(cx,cz);if(!publisher){scene.remove(old);const water=waters.get(key);if(water)scene.remove(water);waters.delete(key);releases.get(old)?.();}}if(publisher){publisher.remove(key);waters.delete(key);}else if(!old)releaseWater(key);onRevision?.({cx,cz,revision,epoch:null,kind:'remove'});return true;
 }
 // This operation is visual-only. The caller must hold its synchronous guard
 // closed across the whole temporal transaction and asynchronous recovery.
 let checkingVisualEviction=false;
 function evictVisualLocal(cx,cz){
  const key=check(cx,cz,0),old=entries.get(key),revision=versions.get(key),epoch=epochs.get(key);
  if(!old||old.userData.unrecordedMudInputs||typeof epoch!=='string'||!epoch||!Number.isSafeInteger(revision)||revision<1||!canEvictVisualLocal||checkingVisualEviction)return false;
  let allowed;checkingVisualEviction=true;try{allowed=canEvictVisualLocal(Object.freeze({cx,cz,epoch,revision}));}finally{checkingVisualEviction=false;}
  if(allowed!==true||closed||entries.get(key)!==old||versions.get(key)!==revision||epochs.get(key)!==epoch)return false;
  // Keep exact CPU copies so a same-identity recovery cannot silently change
  // confirmed content. Reject further evictions when this bounded journal is
  // full rather than discard the evidence needed to validate restoration.
  const positions=old.geometry.attributes.position.array,colors=old.geometry.attributes.color.array,indices=old.geometry.index.array,water=waters.get(key)?.geometry.attributes.position.array??null,groundMask=old.userData.checkpointGroundMask??null;
  const mud=old.userData.checkpointMud??null;
  const bytes=positions.byteLength+colors.byteLength+indices.byteLength+(water?.byteLength??0)+(groundMask?.byteLength??(groundMask?.length??0)*8)+(mud?.length??0)*2;
  const retained=[...visualEvictions.values()].reduce((sum,item)=>sum+item.bytes,0);
  if(visualEvictions.size>=64||retained+bytes>16*1024*1024)return false;
  const snapshot={epoch,revision,positions:positions.slice(),colors:colors.slice(),indices:indices.slice(),water:water?.slice()??null,groundMask:groundMask?.slice()??null,mud,bytes};
  visualEvictionKey=key;
  try{
   entries.delete(key);surfaceView.remove(cx,cz);visualEvictions.set(key,snapshot);
   // Notify the temporal consumer before retirement callbacks can reenter it.
   try{onRevision?.({cx,cz,revision,epoch,kind:'remove',cause:'visual-local'});}
   finally{try{coordinator?.forget?.(key);}finally{if(publisher){publisher.remove(key);waters.delete(key);}else{scene.remove(old);const water=waters.get(key);if(water)scene.remove(water);waters.delete(key);releases.get(old)?.();}}}
   return true;
  }finally{visualEvictionKey=null;}
 }
 function dispose(){if(closed)return;for(const token of prepared)token.abort();closed=true;if(coordinator?.forget)for(const key of entries.keys())try{coordinator.forget(key);}catch(error){try{onAdmissionError(error);}catch{}}if(publisher){publisher.dispose();waters.clear();}else{for(const mesh of entries.values()){scene.remove(mesh);releases.get(mesh)?.();}for(const water of waters.values())scene.remove(water);waters.clear();}entries.clear();versions.clear();epochs.clear();visualEvictions.clear();surfaceView.clear();}
 function forEachVisibleGround(visit){if(closed)throw Error('Terrain residency disposed');if(typeof visit!=='function')throw TypeError('Invalid terrain visitor');for(const [key,logical] of entries){const mesh=publisher?publisher.visibleMesh(key):logical;if(!mesh||!Array.isArray(mesh.material)&&mesh.material?.visible===false)continue;let node=mesh;while(node&&node!==scene&&node.visible)node=node.parent;if(node===scene&&scene.visible)visit(mesh,key);}}
 function retainVisibleGround(mesh){let found=false;forEachVisibleGround(value=>{if(value===mesh)found=true;});if(!found)throw Error('Ground is not visibly resident');const retain=retainers.get(mesh);if(!retain)throw Error('Ground resource unavailable');return retain();}
 return {canonicalSurface(x,z,mesh){const cx=Math.floor((x+24)/48),cz=Math.floor((z+24)/48),key=cx+','+cz;if(entries.get(key)!==mesh||publisher&&publisher.visibleMesh(key)!==mesh||!canonicalSurface(mesh,surfaceView.chunks.get(key),cx,cz))return null;return surfaceView.surfaceInChunk(cx,cz,x,z)??null;},revisionAt(cx,cz){if(closed||!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz))return null;const key=`${cx},${cz}`,mesh=entries.get(key),epoch=epochs.get(key),revision=versions.get(key);return mesh&&(!publisher||publisher.isVisible(key,mesh))&&typeof epoch==='string'&&epoch&&Number.isSafeInteger(revision)&&revision>0?{cx,cz,epoch,revision}:null;},replace,prepareRevision,prepareRetainedRevision,prepareRemoval,validateRevision,forEachVisibleGround,retainVisibleGround,waterSample(){for(const water of waters.values()){if(water.parent!==scene&&water.parent?.parent!==scene)continue;const p=water.geometry.attributes.position;if(!p||p.count<3)continue;return {x:(p.getX(0)+p.getX(1)+p.getX(2))/3+water.position.x,y:(p.getY(0)+p.getY(1)+p.getY(2))/3+water.position.y,z:(p.getZ(0)+p.getZ(1)+p.getZ(2))/3+water.position.z};}return null;},visualReady(){return !closed&&(!publisher||publisher.isReady());},visualRayReady(ray,limit){return !closed&&(!publisher||publisher.isRayReady(ray,limit));},matchesCheckpoint(payload,metadata){const key=`${payload?.cx},${payload?.cz}`,mesh=entries.get(key),equal=(a,b)=>a==null&&b==null||!!a&&!!b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));if(!mesh||versions.get(key)!==metadata?.revision||epochs.get(key)!==metadata?.epoch)return false;return equal(mesh.geometry.attributes.position.array,payload.terrain.positions)&&equal(mesh.geometry.attributes.color.array,payload.terrain.colors)&&equal(mesh.geometry.index.array,payload.terrain.indices)&&equal(waters.get(key)?.geometry.attributes.position.array??null,payload.water?.length?payload.water:null)&&equal(mesh.userData.checkpointGroundMask,payload.groundMask??null)&&mesh.userData.checkpointMud===(payload.mudInputs?JSON.stringify(payload.mudInputs):null);},matchesManifest(manifest){if(closed||!manifest||typeof manifest.epoch!=='string'||!manifest.epoch||!Array.isArray(manifest.chunks)||!manifest.chunks.length)return false;const seen=new Set();for(const chunk of manifest.chunks){if(!Number.isSafeInteger(chunk?.cx)||!Number.isSafeInteger(chunk.cz)||!Number.isSafeInteger(chunk.revision)||chunk.revision<1)return false;const key=`${chunk.cx},${chunk.cz}`;if(seen.has(key)||!entries.has(key)||publisher&&!publisher.isVisible(key,entries.get(key))||epochs.get(key)!==manifest.epoch||versions.get(key)!==chunk.revision)return false;seen.add(key);}return true;},restoreCheckpoint(payload,metadata=null,options={}){if(metadata)return replace(payload,metadata.revision,metadata.epoch,options);const key=check(payload?.cx,payload?.cz,0),old=versions.get(key)??0;const changed=replace(payload,old+1,null,options);versions.set(key,old);epochs.delete(key);return changed;},remove,evictVisualLocal,dispose,surfaceInChunk(cx,cz,x,z){if(!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz)||!entries.has(`${cx},${cz}`))return null;return surfaceView.surfaceInChunk(cx,cz,x,z)??null;},surface(x,z){if(!Number.isFinite(x)||!Number.isFinite(z)||!entries.has(`${Math.floor((x+24)/48)},${Math.floor((z+24)/48)}`))return null;return surfaceView.surface(x,z)??null;},get groundMaterialCount(){let count=0;for(const mesh of entries.values())if(mesh.material!==material)count++;return count;},get size(){return entries.size;},get waterSize(){return waters.size;},get(cx,cz){return entries.get(`${cx},${cz}`)??null;},getVisible(cx,cz){const key=`${cx},${cz}`;return publisher?publisher.visibleMesh(key):entries.get(key)??null;},getWater(cx,cz){return waters.get(`${cx},${cz}`)??null;}};
}
