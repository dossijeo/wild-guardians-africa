import * as THREE from 'three';
import {configureWebGpuFarModelCoverage,createWebGpuFarImpostor} from './webgpu-far-impostor.js';
import {ceilFloat32} from './float32-time.js';
import {cloneWebGpuNodeMaterial} from './webgpu-clone-node-material.js';

function hasCpuPositions(position){const array=position?.isInterleavedBufferAttribute?position.data?.array:position?.array;return ArrayBuffer.isView(array)&&position.itemSize>=3&&Number.isInteger(position.count)&&position.count>0;}

// Owns one candidate pair. The original mesh and its resources remain owned
// by the caller until both candidate draws have been admitted and published.
// This is intentionally not a coverage certificate for a whole region.
export function createWebGpuFarPair({source,items,metadata,day,night,camera,start=90,end=120,shadowLayer=null,shadowCameras=[],auxiliaryCameras=[],registerCaster=null}={}){
 if(!source?.isMesh||!source.geometry?.isBufferGeometry||!source.material?.isNodeMaterial||Array.isArray(source.material)||!Array.isArray(items)||!items.length||!camera?.isCamera||![start,end].every(Number.isFinite)||start<0||end<=start||source.rotation.x!==0||source.rotation.y!==0||source.rotation.z!==0||source.scale.x!==1||source.scale.y!==1||source.scale.z!==1)throw TypeError('Invalid far pair');
 if(shadowLayer!==null&&(!Number.isInteger(shadowLayer)||shadowLayer<1||shadowLayer>30)||!Array.isArray(shadowCameras)||!Array.isArray(auxiliaryCameras)||[...shadowCameras,...auxiliaryCameras].some(value=>!value?.isCamera)||registerCaster!==null&&typeof registerCaster!=='function')throw TypeError('Invalid far pair shadow contract');
 if(source.parent){source.parent.updateWorldMatrix(true,false);if(!source.parent.matrixWorld.equals(new THREE.Matrix4()))throw Error('Transformed far pair parent unsupported');}
 const count=source.isInstancedMesh?source.count:source.geometry.instanceCount;
 if(count!==items.length||items.some(item=>typeof item?.id!=='string'||!item.id||![item.x,item.y,item.z,item.yaw,item.sx??item.scale,item.sy??item.scale,item.sz??item.scale].every(Number.isFinite))||new Set(items.map(item=>item.id)).size!==items.length)throw TypeError('Invalid far pair instances');
 if(!hasCpuPositions(source.geometry.getAttribute('position')))throw Error('Far pair bounds unavailable');
 const model=source.clone(false),geometry=source.geometry.clone(),material=cloneWebGpuNodeMaterial(source.material);model.geometry=geometry;model.material=material;model.visible=true;model.userData.wgFarShadow=true;
 const farBounds=new Float32Array(items.length*4),radii=new Float32Array(items.length),ready=new Float32Array(items.length).fill(1);
 let far;
 try{
  // An atlas is not a bound for the source mesh. Recompute missing or invalid
  // bounds on the clone; an unbounded candidate must never replace the 3D source.
  const position=geometry.getAttribute('position'),validBox=box=>box?.isBox3&&!box.isEmpty()&&[box.min.x,box.min.y,box.min.z,box.max.x,box.max.y,box.max.z].every(Number.isFinite);
  if(!hasCpuPositions(position))throw Error('Far pair bounds unavailable');
  if(!validBox(geometry.boundingBox)){geometry.boundingBox=null;geometry.computeBoundingBox();}
  // Attribute-instanced source boxes cover the transformed batch. The raw
  // vertex positions still describe one model; don't scale the batch twice.
  // Keep that aggregate box on the geometry for its existing culling owner.
  const box=source.isInstancedMesh?geometry.boundingBox:new THREE.Box3().setFromBufferAttribute(position);if(!validBox(box))throw Error('Far pair bounds unavailable');
  for(let i=0;i<items.length;i++){const item=items[i],sx=Math.abs(item.sx??item.scale),sz=Math.abs(item.sz??item.scale),atlasRadius=metadata.impostorWidth*.5*Math.max(sx,sz),boundsRadius=Math.hypot(Math.max(Math.abs(box.min.x),Math.abs(box.max.x))*sx,Math.max(Math.abs(box.min.z),Math.abs(box.max.z))*sz);radii[i]=ceilFloat32(Math.max(atlasRadius,boundsRadius)+.001);farBounds.set([item.x-source.position.x,item.y-source.position.y,item.z-source.position.z,radii[i]],4*i);}
  // The near-tree attribute layout already consumes six vertex buffers.
  // These immutable fields share one; readiness retains its mutable buffer.
  const boundsBuffer=new THREE.InstancedInterleavedBuffer(farBounds,4);
  geometry.setAttribute('wgFarBase',new THREE.InterleavedBufferAttribute(boundsBuffer,3,0));geometry.setAttribute('wgFarRadius',new THREE.InterleavedBufferAttribute(boundsBuffer,1,3));geometry.setAttribute('wgFarReady',new THREE.InstancedBufferAttribute(ready,1));
  configureWebGpuFarModelCoverage(material,{start,end});far=createWebGpuFarImpostor({metadata,day,night,trees:items,radii:Array.from(radii),start,end});
 }catch(error){geometry.dispose();material.dispose();throw error;}
 const group=new THREE.Group();group.visible=false;group.add(model,far.mesh);far.mesh.userData.nativePropSlot=source.userData.nativePropSlot;
 const hidden=new Set(),originalMatrix=model.isInstancedMesh?model.instanceMatrix.array.slice():null,scale=geometry.getAttribute('wgScale'),offset=geometry.getAttribute('wgOffset'),originalOffset=offset?.array.slice()??null;
 if(!model.isInstancedMesh&&(!scale?.isInstancedBufferAttribute||scale.itemSize!==3||scale.count<items.length||!offset?.isInstancedBufferAttribute||offset.itemSize!==3||offset.count<items.length)){far.dispose();geometry.dispose();material.dispose();throw Error('Unsupported far pair instancing');}
 let unregisterCaster=null;if(registerCaster){try{unregisterCaster=registerCaster(model);if(typeof unregisterCaster!=='function')throw TypeError('Invalid far caster registration');}catch(error){far.dispose();geometry.dispose();material.dispose();throw error;}}
 // Pick against the retained original 3D geometry, even when its draw is
 // hidden. The proxy supplies the original material/UVs to cutout testing.
 const proxy={visible:true,parent:group,geometry,material,userData:source.userData};let pickMesh=null;
 far.mesh.raycast=(raycaster,intersections)=>{const hits=[];if(model.isInstancedMesh)model.raycast(raycaster,hits);else{if(!pickMesh){pickMesh=new THREE.InstancedMesh(geometry,material,items.length);const transform=new THREE.Object3D();for(let i=0;i<items.length;i++){const item=items[i];transform.position.set(item.x-source.position.x,item.y-source.position.y,item.z-source.position.z);transform.rotation.y=item.yaw;transform.scale.set(item.sx??item.scale,item.sy??item.scale,item.sz??item.scale);transform.updateMatrix();pickMesh.setMatrixAt(i,transform.matrix);}}pickMesh.matrixWorld.copy(model.matrixWorld);pickMesh.raycast(raycaster,hits);}for(const hit of hits){if(hidden.has(items[hit.instanceId]?.id))continue;hit.object=proxy;intersections.push(hit);}};
 const modelLayers=source.layers.mask,shadowBit=shadowLayer===null?0:1<<shadowLayer;let closed=false,mode='pending',latestCamera=camera;
 function edgeDistance(value,item,index){return Math.max(0,Math.hypot(value.position.x-item.x,value.position.z-item.z)-radii[index]);}
 // The GPU stores world positions and radii as float32. Leave both draws
 // active near thresholds where rounding could otherwise create a gap.
 function margin(value,item){return .001+(Math.abs(value.position.x)+Math.abs(value.position.z)+Math.abs(item.x)+Math.abs(item.z))*2**-21;}
 function allFar(value){return items.every((item,index)=>hidden.has(item.id)||edgeDistance(value,item,index)>=end+margin(value,item));}
 function allNear(value){return items.every((item,index)=>hidden.has(item.id)||edgeDistance(value,item,index)<=start-margin(value,item));}
 // Layer reservation belongs to the caller and its shadow pass. This module
 // never changes camera masks or assumes that auxiliary passes share them.
 function shadowSafe(value){return !!shadowBit&&!(value.layers.mask&shadowBit)&&auxiliaryCameras.every(item=>!(item.layers.mask&shadowBit))&&(!model.castShadow||!!unregisterCaster&&!!material.castShadowNode&&shadowCameras.length>0&&shadowCameras.every(item=>!!(item.layers.mask&shadowBit)));}
 function setSuppressed(ids){if(closed||!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!id))throw TypeError('Invalid far pair suppression');const removed=new Set(ids);hidden.clear();for(let i=0;i<items.length;i++){const id=items[i].id,off=removed.has(id);if(off)hidden.add(id);far.setEnabled(id,!off);if(model.isInstancedMesh){const target=model.instanceMatrix.array,index=i*16;target.set(originalMatrix.subarray(index,index+16),index);if(off)target[index+12]=target[index+13]=target[index+14]=1e9;}else{const index=i*3;offset.array.set(originalOffset.subarray(index,index+3),index);if(off)offset.setXYZ(i,1e9,1e9,1e9);}}if(model.isInstancedMesh)model.instanceMatrix.needsUpdate=true;else offset.needsUpdate=true;updateCamera(latestCamera);return hidden.size;}
 function fallback(){if(closed)return false;far.mesh.visible=false;model.visible=true;model.layers.mask=modelLayers;const attr=geometry.getAttribute('wgFarReady');for(let i=0;i<attr.count;i++)attr.setX(i,0);attr.needsUpdate=true;mode='fallback';return true;}
 function activate(value=camera){if(closed||!value?.isCamera)throw TypeError('Invalid far pair camera');latestCamera=value;const nearOnly=allNear(value),farOnly=!nearOnly&&allFar(value);if(farOnly&&!shadowSafe(value))throw Error('Far shadow pass is not reserved');const attr=geometry.getAttribute('wgFarReady');for(let i=0;i<attr.count;i++)attr.setX(i,1);attr.needsUpdate=true;model.visible=true;model.layers.mask=farOnly?shadowBit:modelLayers;far.mesh.visible=!nearOnly;mode=farOnly?'far':nearOnly?'near':'transition';return mode;}
 // Restore the 3D color pass before the next draw when approaching, while
 // keeping both complementary coverages active throughout the blend band.
 // An explicit fallback still stays disabled after invalidation.
 function updateCamera(value){if(closed||!value?.isCamera)throw TypeError('Invalid far pair camera');latestCamera=value;if(mode==='far'&&!shadowSafe(value))return fallback();if(!['far','near','transition'].includes(mode))return false;const nearOnly=allNear(value),farOnly=!nearOnly&&allFar(value)&&shadowSafe(value),next=farOnly?'far':nearOnly?'near':'transition';if(next===mode)return false;model.layers.mask=farOnly?shadowBit:modelLayers;far.mesh.visible=!nearOnly;mode=next;return true;}
 return {group,model,impostor:far.mesh,setNight:far.setNight,setSuppressed,activate,fallback,updateCamera,status:()=>({closed,mode,night:far.phase.value}),dispose(){if(closed)return;closed=true;group.removeFromParent();try{pickMesh?.dispose();far.dispose();geometry.dispose();material.dispose();}finally{unregisterCaster?.();unregisterCaster=null;}}};
}

// Owns the swap for one existing 3D batch. The caller owns the source and is
// responsible for invalidating this transaction before retiring its chunk.
// A candidate never changes the visible source until its complete group and
// shadow variants have been admitted and the caller's revision is current.
export function createWebGpuFarPairSwap({admission,getCamera,onChange=()=>{}}={}){
 if(typeof admission?.prepareAndPublish!=='function'||typeof getCamera!=='function'||typeof onChange!=='function')throw TypeError('Invalid far pair admission');
 let closed=false,pending=null,current=null,serial=0;
 function release(item){if(!item||item.released)return;item.released=true;const dispose=()=>{try{item.pair.dispose();}finally{item.assets.release();}};if(typeof admission.deferRelease==='function')admission.deferRelease(item.pair.group,dispose);else dispose();}
 function cancelPending(){pending?.controller.abort();}
 async function offer({source,items,assets,isCurrent,shadowLayer=null,shadowCameras=[],auxiliaryCameras=[],registerCaster=null,start=90,end=120,night=0,getNight=null},{signal=null}={}){
  if(closed||!source?.parent||!assets||typeof assets.release!=='function'||typeof isCurrent!=='function'||!Number.isFinite(night)||night<0||night>1||getNight!==null&&typeof getNight!=='function'||signal!==null&&(typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function')){assets?.release?.();throw TypeError('Invalid far pair offer');}
  if(pending){cancelPending();assets.release();return false;}if(signal?.aborted){assets.release();return false;}const parent=source.parent,controller=new AbortController(),id=++serial,abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});let pair;
  try{pair=createWebGpuFarPair({source,items,...assets,camera:getCamera(),start,end,shadowLayer,shadowCameras,auxiliaryCameras,registerCaster});}catch(error){signal?.removeEventListener('abort',abort);assets.release();throw error;}
  const item={id,source,parent,controller,pair,assets,released:false,originalVisible:current?.source===source?current.originalVisible:source.visible};pending=item;let published=false;
  const valid=()=>!closed&&pending===item&&!controller.signal.aborted&&source.parent===parent&&isCurrent()===true;
  const publish=()=>{if(!valid())return;pair.setNight(getNight?getNight():night);pair.activate(getCamera());if(!valid())return;parent.add(pair.group);if(!valid()){pair.group.removeFromParent();return;}const previous=current;source.visible=false;pair.group.visible=true;current=item;pending=null;published=true;if(previous){previous.pair.group.removeFromParent();if(previous.source!==source&&previous.source.parent===previous.parent)previous.source.visible=previous.originalVisible;release(previous);}onChange();};
  try{await admission.prepareAndPublish(pair.group,{signal:controller.signal,include:[pair.model,pair.impostor]},publish);return published;}catch(error){if(!controller.signal.aborted)throw error;return false;}finally{signal?.removeEventListener('abort',abort);if(pending===item)pending=null;if(!published)release(item);}
 }
 function fallback(){cancelPending();if(!current)return false;current.pair.fallback();onChange();return true;}
 function restore(){cancelPending();if(!current)return false;const item=current;if(item.source.parent!==item.parent){item.pair.fallback();return false;}item.source.visible=item.originalVisible;item.pair.group.removeFromParent();current=null;release(item);onChange();return true;}
 function retireSafely(isCovered){if(typeof isCovered!=='function')throw TypeError('Invalid far pair coverage');cancelPending();if(!current)return false;const item=current;item.pair.fallback();if(isCovered()!==true){onChange();return false;}item.source.visible=item.originalVisible;item.pair.group.removeFromParent();current=null;release(item);onChange();return true;}
 return {offer,fallback,restore,retireSafely,updateCamera(camera){if(!current)return false;const changed=current.pair.updateCamera(camera);if(changed)onChange();return changed;},setSuppressed(ids){return current?.pair.setSuppressed(ids)??0;},setNight(value){current?.pair.setNight(value);},status(){return {closed,pending:!!pending,active:!!current,mode:current?.pair.status().mode??null,night:current?.pair.status().night??null};},dispose(){if(closed)return;restore();closed=true;cancelPending();if(current){current.pair.fallback();release(current);current=null;}}};
}

// A chunk can contain several LOD/material batches. Admit all pairs together
// and change visibility in one turn; publishing each pair separately would
// expose a mixture of world revisions to rendering and picking.
export function createWebGpuFarChunkSwap({admission,getCamera,onChange=()=>{}}={}){
 if(typeof admission?.prepareAndPublish!=='function'||typeof getCamera!=='function'||typeof onChange!=='function')throw TypeError('Invalid far chunk admission');
 let closed=false,pending=null,current=null;
 const retire=item=>{if(!item||item.released)return;item.released=true;const dispose=()=>{for(const part of item.parts)try{part.pair.dispose();}finally{part.assets.release();}};if(typeof admission.deferRelease==='function')admission.deferRelease(item.group,dispose);else dispose();};
 const cancel=()=>pending?.controller.abort();
 async function offer({entries,isCurrent,shadowLayer=null,shadowCameras=[],auxiliaryCameras=[],registerCaster=null,start=90,end=120,night=0,getNight=null},{signal=null}={}){
  if(closed||!Array.isArray(entries)||!entries.length||entries.some(value=>!value?.source?.parent||!value.assets||typeof value.assets.release!=='function')||typeof isCurrent!=='function'||!Number.isFinite(night)||night<0||night>1||getNight!==null&&typeof getNight!=='function'||signal!==null&&(typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function')){if(Array.isArray(entries))for(const value of entries)value?.assets?.release?.();throw TypeError('Invalid far chunk offer');}
  const releaseEntries=()=>{for(const item of entries)item.assets.release();};if(pending){cancel();releaseEntries();return false;}if(signal?.aborted){releaseEntries();return false;}
  const parent=entries[0].source.parent;if(entries.some(item=>item.source.parent!==parent)||new Set(entries.map(item=>item.source)).size!==entries.length){releaseEntries();throw TypeError('Far chunk sources do not share an owner');}
  const controller=new AbortController(),abort=()=>controller.abort(),group=new THREE.Group(),parts=[];signal?.addEventListener('abort',abort,{once:true});group.visible=false;
  try{for(const entry of entries){const pair=createWebGpuFarPair({source:entry.source,items:entry.items,...entry.assets,camera:getCamera(),start,end,shadowLayer,shadowCameras,auxiliaryCameras,registerCaster});parts.push({source:entry.source,assets:entry.assets,pair,originalVisible:current?.parts.find(item=>item.source===entry.source)?.originalVisible??entry.source.visible});group.add(pair.group);}}catch(error){for(const item of parts)item.pair.dispose();releaseEntries();signal?.removeEventListener('abort',abort);throw error;}
  const item={group,parent,parts,controller,released:false};pending=item;let published=false;
  const valid=()=>!closed&&pending===item&&!controller.signal.aborted&&parts.every(part=>part.source.parent===parent)&&isCurrent()===true;
  const publish=()=>{if(!valid())return;const camera=getCamera(),phase=getNight?getNight():night;for(const part of parts){part.pair.setNight(phase);part.pair.activate(camera);}if(!valid())return;parent.add(group);if(!valid()){group.removeFromParent();return;}const previous=current;for(const part of parts){part.source.visible=false;part.pair.group.visible=true;}group.visible=true;current=item;pending=null;published=true;if(previous){previous.group.removeFromParent();for(const part of previous.parts)if(!parts.some(next=>next.source===part.source)&&part.source.parent===previous.parent)part.source.visible=part.originalVisible;retire(previous);}onChange();};
  try{await admission.prepareAndPublish(group,{signal:controller.signal,include:parts.flatMap(part=>[part.pair.model,part.pair.impostor])},publish);return published;}catch(error){if(!controller.signal.aborted)throw error;return false;}finally{signal?.removeEventListener('abort',abort);if(pending===item)pending=null;if(!published)retire(item);}
 }
 function fallback(){cancel();if(!current)return false;for(const part of current.parts)part.pair.fallback();onChange();return true;}
 function restore(){cancel();if(!current)return false;const item=current;if(item.parts.some(part=>part.source.parent!==item.parent)){for(const part of item.parts)part.pair.fallback();return false;}for(const part of item.parts)part.source.visible=part.originalVisible;item.group.removeFromParent();current=null;retire(item);onChange();return true;}
 function retireSafely(isCovered){if(typeof isCovered!=='function')throw TypeError('Invalid far chunk coverage');cancel();if(!current)return false;const item=current;for(const part of item.parts)part.pair.fallback();if(isCovered()!==true){onChange();return false;}for(const part of item.parts)part.source.visible=part.originalVisible;item.group.removeFromParent();current=null;retire(item);onChange();return true;}
 return {offer,fallback,restore,retireSafely,updateCamera(camera){if(!current)return false;let changed=false;for(const part of current.parts)changed=part.pair.updateCamera(camera)||changed;if(changed)onChange();return changed;},setSuppressed(ids){if(!current)return 0;return current.parts.reduce((sum,part)=>sum+part.pair.setSuppressed(ids),0);},setNight(value){for(const part of current?.parts??[])part.pair.setNight(value);},status(){return {closed,pending:!!pending,active:!!current,parts:current?.parts.length??0,nights:current?.parts.map(part=>part.pair.status().night)??[],modes:current?.parts.map(part=>part.pair.status().mode)??[]};},dispose(){if(closed)return;restore();closed=true;cancel();if(current){for(const part of current.parts)part.pair.fallback();retire(current);current=null;}}};
}
