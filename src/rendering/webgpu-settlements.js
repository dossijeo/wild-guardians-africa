import * as THREE from 'three';
import {copyNativeBarrierAdditionAttestation,sameNativeBarrierAdditionReference} from '../world/native-barrier-addition.js';
import {copyNativeCenterPlacement,sameNativeCenterEntity,sameNativeCenterPlacement} from '../world/native-center-placement.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createWebGpuStructureColorMaterial,setWebGpuStructureColorTexture,setWebGpuStructureColorBlend} from './webgpu-structure-color.js';
import {assetUrl} from './asset-url.js';
import {NativeWall} from './walls.js';
import {createNativeGateGpuClock} from './native-gate-gpu-clock.js';
import {createWebGpuAdmittedWall} from './webgpu-wall-admission.js';
import {createWebGpuAdmittedVillage} from './webgpu-village-admission.js';
import {buildWebGpuVillage,createWebGpuVillagePreview,villagePreviewReconciled} from './webgpu-village-preview.js';
import {createWebGpuAdmittedCenterDamage} from './webgpu-center-damage-admission.js';
import {createSettlementHeightSampler} from './webgpu-settlement-height.js';
import {createPreparedTerrainPlacement} from './webgpu-terrain-placement.js';
import {wallBufferReader} from './wall-buffer-reader.js';
import {centerCulture,centerFootprint} from '../world/centers.js';
import {ProvisionalWalls} from './provisional-walls.js';
import {wallStroke} from '../world/wall-layout.js';
import {createWebGpuStructurePreviewState} from './webgpu-structure-preview-state.js';
import {createStructureWaitIndicator} from './webgpu-structure-wait-indicator.js';
import {createWebGpuStructurePreviewMaterials} from './webgpu-structure-preview-materials.js';
import {openProgressiveWebGpuCharacter} from './webgpu-progressive-character.js';
import {prepareWebGpuCenterDestructionData,createWebGpuCenterDestructionTemplate,confirmedCenterDamage} from './webgpu-center-destruction.js';
import {prepareWebGpuTexture,releaseAfterWebGpuWork} from './webgpu-texture-upload.js';
import {blessingVineTexture} from './blessing-vine.js';
import {configureWebGpuWallBlessing,wallAwakeningMode} from './webgpu-wall-blessing.js';
import {uniform} from 'three/tsl';

let nextSettlementResourceOwner=0;

// Metadata is usable only for the precise authored geometry and destruction
// descriptor from which its native envelopes were generated.
export async function cameraCenterBounds(record,descriptor,geometry){
 if(!record||record.source!==descriptor?.url||!geometry?.index||!globalThis.crypto?.subtle)return null;
 const attrs=['position','normal','uv'].map(name=>geometry.getAttribute(name));if(attrs.some((a,i)=>!a||a.itemSize!==[3,3,2][i])||attrs[0].count!==attrs[1].count||attrs[0].count!==attrs[2].count)return null;
 const sizes=attrs.map(a=>a.count*a.itemSize),index=geometry.index;if(!(index.array instanceof Uint16Array))return null;const byteLength=sizes.reduce((a,b)=>a+b*4,0)+index.count*2,bytes=new Uint8Array(byteLength),view=new DataView(bytes.buffer);let offset=0;for(const attr of attrs)for(let i=0;i<attr.count;i++)for(let c=0;c<attr.itemSize;c++,offset+=4)view.setFloat32(offset,attr.getComponent(i,c),true);for(let i=0;i<index.count;i++,offset+=2)view.setUint16(offset,index.getX(i),true);
 const hex=value=>Array.from(new Uint8Array(value)).map(v=>v.toString(16).padStart(2,'0')).join('');const [geometryHash,descriptorHash]=await Promise.all([crypto.subtle.digest('SHA-256',bytes),crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(Object.fromEntries(Object.entries(descriptor).filter(([key])=>key!=='url')))))]);if(hex(geometryHash)!==record.geometrySha256||hex(descriptorHash)!==record.descriptorSha256)return null;
 const boxes={};for(const name of ['still','fall','ash']){const data=record.boxes?.[name];if(!Array.isArray(data?.min)||data.min.length!==3||!Array.isArray(data?.max)||data.max.length!==3||![...data.min,...data.max].every(Number.isFinite))return null;const box=new THREE.Box3(new THREE.Vector3(...data.min),new THREE.Vector3(...data.max));if(box.isEmpty())return null;boxes[name]=box;}return boxes;
}

// Worker-owned presentation of confirmed villages, walls and intact centers.
// Simulation and terrain remain authoritative. Destruction of centers still
// needs migration from the original GLSL pipeline; this is an experimental path.
export function createWebGpuSettlements({scene,state,residency,renderer=null,pipelineAdmission=null,resourceRegistry=null,loadProgressiveCenter=openProgressiveWebGpuCharacter,onError=()=>{},onTextureError=()=>{},enableStructurePreviews=false,enableStructureIndicator=false,onCameraStructures=null,onSelectableChange=null,characterData=null,softDepth=null,confirmedClock=null,getPresentationTime=null,getRepairAge=null,blessingVisibleAt=null,blessingWoundAt=null}={}){
 if(softDepth!==null&&!softDepth?.depthNode?.isTextureNode||confirmedClock!==null&&!confirmedClock?.node?.isNode||blessingVisibleAt!==null&&typeof blessingVisibleAt!=='function'||blessingWoundAt!==null&&typeof blessingWoundAt!=='function')throw TypeError('Invalid settlement presentation options');
 if(resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function'||characterData!==null&&typeof characterData?.open!=='function'||!scene?.isScene||!state||typeof residency?.get!=='function'||pipelineAdmission!==null&&typeof pipelineAdmission.prepare!=='function'||typeof loadProgressiveCenter!=='function'||typeof onError!=='function'||onCameraStructures!==null&&typeof onCameraStructures!=='function'||onSelectableChange!==null&&typeof onSelectableChange!=='function')throw TypeError('Invalid WebGPU settlements');
 const resourceOwner=++nextSettlementResourceOwner,resourceLeases=new Map(),blessingClock=confirmedClock?.node??uniform(state.elapsed??0);let nextResource=0,vineTask=null;
 const abort=new AbortController(),manager=new THREE.LoadingManager(),resources=new Set(),bitmaps=new Set(),entries=new Map(),preparedWalls=new Map(),preparedCenters=new Map(),banks=new Map(),transitions=[],villageTransitions=[],progressiveCenters=new Set(),centerTemplates=new Set();let closed=false,catalogues=null,failure=null,textureFailure=null,centerTextured=0,cameraSignature=null,villagePreviewTarget=null,villageFeedbackId=null,pendingUploads=0;
 const ensure=()=>{if(closed||abort.signal.aborted)throw new DOMException('Settlements disposed','AbortError');};
 const track=(value,dispose,kind)=>{if(!resourceRegistry||resourceLeases.has(value))return;let lease;try{lease=resourceRegistry.adopt({namespace:'structure-source',key:`${resourceOwner}:${kind}:${++nextResource}`,dispose});lease.commit();resourceLeases.set(value,lease);}catch(error){if(lease)lease.release();else dispose();throw error;}};
 const own=r=>{if(closed){r.dispose();throw new DOMException('Settlements disposed','AbortError');}if(!resources.has(r)){track(r,()=>r.dispose(),'resource');resources.add(r);}return r;};
 const ownBitmap=image=>{if(!bitmaps.has(image)){track(image,()=>image.close(),'bitmap');bitmaps.add(image);}return image;};
 const read=async url=>{const response=await fetch(assetUrl(url),{signal:abort.signal});if(!response.ok)throw Error(`Settlement asset ${response.status}: ${url}`);return response;};
 const bytes=async url=>(await read(url)).arrayBuffer();
 const json=async url=>(await read(url)).json();
 async function texture(url){const bitmap=await createImageBitmap(await (await read(url)).blob());if(closed){bitmap.close();ensure();}ownBitmap(bitmap);const result=own(new THREE.Texture(bitmap));result.flipY=false;result.colorSpace=THREE.SRGBColorSpace;result.needsUpdate=true;return result;}
 async function uploadTexture(map){pendingUploads++;try{renderer.initTexture(map);await renderer.backend.device.queue.onSubmittedWorkDone();}finally{pendingUploads--;}}
 const surface=createSettlementHeightSampler(residency),previewMeshes=new Map(),waitingTerrain=new Map(),previewOutcomes=new Map(),previewWatches=new Set(),indicatorAnchors=new Map(),indicator=enableStructureIndicator?createStructureWaitIndicator({scene,own}):null,previewMaterials=createWebGpuStructurePreviewMaterials({pipelineAdmission,resourceRegistry,signal:abort.signal}),previews=createWebGpuStructurePreviewState({onRemove:(id,reason,record)=>{if(previewWatches.has(id))previewOutcomes.set(id,{reason,targets:record?.targetIds??(record?.targetId?[record.targetId]:[])});indicator?.remove(id);indicatorAnchors.delete(id);waitingTerrain.delete(id);const item=previewMeshes.get(id);if(!item)return;previewMeshes.delete(id);item.dispose();onSelectableChange?.();}});
 async function prepareIndicator(signal=abort.signal){if(!indicator)return;if(pipelineAdmission)await pipelineAdmission.prepare(indicator.mesh,{signal,shadowPass:false});if(!closed)indicator.ready();}
 async function preparePreview(kind,key){if(closed||!enableStructurePreviews||!['center','wall','village'].includes(kind))throw TypeError('Invalid structure preview');bank(kind,key);const item=banks.get(kind+':'+key);await item.promise;if(closed||!item.value)throw Error(failure??'Structure preview unavailable');if(kind==='center')previewMaterials.center();else if(kind==='wall')for(const suffix of ['intacto','puerta']){const prototype=item.value[key+'_'+suffix];if(prototype?.isMesh)previewMaterials.wall(prototype);}}
 function beginPreview(command,registered=false){if(closed||!enableStructurePreviews||!command||typeof command.id!=='string'||!['center','wall'].includes(command.kind))throw TypeError('Invalid structure preview');const stroke=command.kind==='wall'&&Array.isArray(command.points);if(stroke&&(command.points.length>3000||command.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))||!Number.isSafeInteger(command.maxPieces)||command.maxPieces<0)||!stroke&&![command.x,command.z,command.yaw??0].every(Number.isFinite))throw TypeError('Invalid structure preview coordinates');const key=command.kind==='center'?command.culture:command.material,assets=bank(command.kind,key),height=stroke?null:surface(command.x,command.z),confirmedTargets=stroke?previews.targets(command.id):null,structures=confirmedTargets?state.structures.filter(item=>!confirmedTargets.includes(item.id)):state.structures,slots=stroke?wallStroke(command.points,structures,{maxPieces:command.maxPieces}):null;const target=registered?null:previews.begin(command.id,{requireEvent:stroke});if(target===false){if(previewWatches.has(command.id))previewOutcomes.set(command.id,{reason:'removed',targets:[]});return true;}if(!stroke&&target&&entries.get('s:'+target)?.group.visible){previews.reconcile([],id=>id===target);return true;}if(!stroke&&height===null||stroke&&slots.some(slot=>surface(slot.x,slot.z)===null)){waitingTerrain.set(command.id,structuredClone(command));return true;}waitingTerrain.delete(command.id);
  if(indicator){if(stroke&&slots.length){const xs=slots.map(p=>p.x),zs=slots.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),x=(minX+maxX)/2,z=(minZ+maxZ)/2;if(indicator.show(command.id,{x,y:surface(slots[0].x,slots[0].z),z,width:Math.max(1,(maxX-minX)/2+1),depth:Math.max(1,(maxZ-minZ)/2+1)}))indicatorAnchors.set(command.id,{x:slots[0].x,z:slots[0].z});}else if(!stroke){if(indicator.show(command.id,{x:command.x,y:height,z:command.z,width:command.kind==='center'?3:1,depth:command.kind==='center'?3:1}))indicatorAnchors.set(command.id,{x:command.x,z:command.z});}}
  if(!assets){const waiting={update(){},dispose(){}};previewMeshes.set(command.id,waiting);const request=banks.get(command.kind+':'+key);request.promise.then(()=>{if(closed||previewMeshes.get(command.id)!==waiting)return;previewMeshes.delete(command.id);if(!request.value){previews.abandon(command.id);return;}try{if(!beginPreview(command,true)){previews.abandon(command.id);onError(Error('Structure preview terrain unavailable'));}}catch(error){previews.abandon(command.id);onError(error);}});return true;}
  let object,item;const controller=new AbortController();
  if(command.kind==='center'){const group=assets.group.clone(true),paint=previewMaterials.center();group.traverse(node=>{if(node.isMesh)node.material=paint;});group.position.set(command.x,height+.025,command.z);group.rotation.y=command.yaw??0;object=group;item={object,controller,update(now){paint.opacity=.48+.1*Math.sin(now*.004);},terrainChanged(){const y=surface(command.x,command.z);if(Number.isFinite(y))group.position.y=y+.025;},dispose(){controller.abort();group.removeFromParent();}};
  }else{const staging=new THREE.Group(),walls=new ProvisionalWalls(staging,assets,(x,z)=>surface(x,z),{materialFor:prototype=>previewMaterials.wall(prototype)}),pieces=stroke?slots.map(slot=>({x:slot.x,z:slot.z,yaw:-slot.angle,scaleX:slot.scaleX})):[{x:command.x,z:command.z,yaw:command.yaw??0}];if(!pieces.length){previews.reject(command.id);return true;}if(!walls.begin(command.id,key,pieces,{gate:!!command.gate})){previews.reject(command.id);return false;}object=walls.entries.get(command.id).mesh;item={object,controller,update(){walls.update();},terrainChanged(){walls.terrainChanged();},dispose(){controller.abort();object.removeFromParent();const release=()=>walls.dispose();if(typeof pipelineAdmission?.deferRelease==='function')pipelineAdmission.deferRelease(object,release);else release();}};}
  object.visible=!pipelineAdmission;scene.add(object);previewMeshes.set(command.id,item);if(!pipelineAdmission){indicator?.remove(command.id);indicatorAnchors.delete(command.id);}
  if(pipelineAdmission){const publish=()=>{if(closed||controller.signal.aborted||previewMeshes.get(command.id)!==item)return;object.visible=true;indicator?.remove(command.id);indicatorAnchors.delete(command.id);onSelectableChange?.();},options={signal:controller.signal};Promise.resolve().then(()=>typeof pipelineAdmission.prepareAndPublish==='function'?pipelineAdmission.prepareAndPublish(object,options,publish):Promise.resolve(pipelineAdmission.prepare(object,options)).then(publish)).catch(error=>{if(closed||controller.signal.aborted||previewMeshes.get(command.id)!==item)return;previews.abandon(command.id);failure=String(error?.message??error);onError(error);});}
  if(stroke&&target)previews.reconcile([],id=>entries.get('s:'+id)?.group.visible===true);onSelectableChange?.();return true;
 }
 function rememberModel(gltf){gltf.scene.traverse(o=>{if(!o.isMesh)return;own(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){own(m);for(const value of Object.values(m))if(value?.isTexture){own(value);if(typeof value.source?.data?.close==='function')ownBitmap(value.source.data);}}});}
 async function catalog(){if(!catalogues){const request=Promise.all([json('/content/villages.json'),json('/content/destruction.json'),json('/content/walls.json')]);catalogues=request;request.catch(()=>{if(catalogues===request)catalogues=null;});}return catalogues;}
 async function villageBank(culture){const [villages]=await catalog(),payload=villages.find(v=>v.id===(culture==='saheliana'?'saheliano':culture));if(!payload)throw Error('Unknown village culture '+culture);
  let buffer,material,color=null;
  if(renderer?.backend?.isWebGPUBackend){const [source,manifest,preview]=await Promise.all([bytes(payload.binary.url),json(`/content/structure-preview/village-${payload.id}.json`),bytes(`/content/structure-preview/village-${payload.id}.rgba8`)]);ensure();if(manifest.version!==1||manifest.culture!==payload.id||manifest.texture!==payload.textures.color||manifest.vertices!==payload.vertexCount||payload.vertexBytes!==payload.vertexCount*32||manifest.bytes!==payload.vertexCount*4||preview.byteLength!==manifest.bytes)throw Error('Village preview metadata mismatch');const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value))).map(v=>v.toString(16).padStart(2,'0')).join('');const [sourceHash,previewHash]=await Promise.all([digest(source),digest(preview)]);ensure();if(sourceHash!==manifest.sourceSha256||previewHash!==manifest.sha256)throw Error('Village preview checksum mismatch');buffer=source;color=new THREE.BufferAttribute(new Uint8Array(preview),4,true);
   const placeholder=own(new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1,THREE.RGBAFormat));placeholder.colorSpace=THREE.SRGBColorSpace;placeholder.flipY=false;placeholder.needsUpdate=true;material=own(createWebGpuStructureColorMaterial(placeholder,4));const transition={material,start:null,ready:false};villageTransitions.push(transition);
   void (async()=>{try{const map=await texture(payload.textures.color);ensure();await uploadTexture(map);ensure();setWebGpuStructureColorTexture(transition.material,map);transition.ready=true;onSelectableChange?.();}catch(error){if(!closed&&!abort.signal.aborted){textureFailure=String(error?.message??error);onTextureError(error);}}})();
  }else{const [source,map]=await Promise.all([bytes(payload.binary.url),texture(payload.textures.color)]);ensure();buffer=source;material=own(new THREE.MeshStandardMaterial({map,roughness:.95,metalness:0,side:THREE.DoubleSide}));}
  const interleaved=new THREE.InterleavedBuffer(new Float32Array(buffer,0,payload.vertexBytes/4),8),index=new Uint32Array(buffer,payload.vertexBytes,payload.indexCount),units=new Map();
  for(const unit of payload.units){const geometry=own(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(interleaved,3,0));geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(interleaved,3,3));geometry.setAttribute('uv',new THREE.InterleavedBufferAttribute(interleaved,2,6));if(color)geometry.setAttribute('color',color);geometry.setIndex(new THREE.BufferAttribute(index,1));geometry.setDrawRange(unit.offset,unit.count);geometry.boundingBox=new THREE.Box3(new THREE.Vector3().fromArray(unit.min),new THREE.Vector3().fromArray(unit.max));geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new THREE.Sphere());units.set(unit.key,{geometry,material,unit});}return units;
 }
 async function centerBank(culture){const [,destruction]=await catalog(),descriptor=destruction.buildings.find(b=>b.culture===culture);if(!descriptor)throw Error('Unknown center culture '+culture);let gltf,progressive=null;if(renderer?.backend?.isWebGPUBackend){progressive=await loadProgressiveCenter({renderer,...(characterData?{openStream:(url,options)=>characterData.open(url,options)}:{}),shareCompatibleMaterials:true,packageUrl:`/content/structure-preview/center-${culture}/package.json`,species:culture+'Center',signal:abort.signal,onTextured:()=>{centerTextured++;onSelectableChange?.();},onError:error=>{textureFailure=String(error?.message??error);onTextureError(error);}});track(progressive,()=>progressive.dispose(),'center-package');progressiveCenters.add(progressive);gltf=progressive.preview;}else{gltf=await new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).loadAsync(assetUrl(descriptor.url));rememberModel(gltf);}ensure();gltf.scene.updateMatrixWorld(true);const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});if(meshes.length!==1)throw Error('Unexpected center geometry');const box=new THREE.Box3().setFromObject(gltf.scene),offset=new THREE.Vector3(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2),group=new THREE.Group();gltf.scene.position.add(offset);group.add(gltf.scene);let cameraBoxes=null;if(onCameraStructures){try{const data=await json('/content/structure-preview/center-camera-bounds.json');if(data.version===1)cameraBoxes=await cameraCenterBounds(data.records?.[culture],descriptor,meshes[0].geometry);}catch{}ensure();}let started=false,template=null,prepared=null;
  return {group,cameraBoxes,start(){if(!started&&progressive){started=true;progressive.start();}},
   async prepareDamage(signal){
    if(template||prepared?.matches(meshes[0],descriptor))return;
    const result=await prepareWebGpuCenterDestructionData(gltf,descriptor,{signal});
    ensure();signal.throwIfAborted();
    if(!template&&result.matches(meshes[0],descriptor))prepared=result;
   },
   damage(initialDamage=null){
    if(!template){
     template=createWebGpuCenterDestructionTemplate({gltf,building:descriptor,renderer,softDepth,prepared});
     prepared=null;track(template,()=>template.dispose(),'center-template');centerTemplates.add(template);
    }
    return template.instantiate(initialDamage);
   }
  };
 }
 async function prepareCenterStrike(targetId,signal){
  const entry=entries.get('s:structure-'+targetId);
  // A target outside the resident scene has no graphical data to prepare.
  if(entry?.kind!=='center'||entry.damage)return;
  const assets=banks.get('center:'+entry.key).value;
  await assets.prepareDamage(signal?AbortSignal.any([signal,abort.signal]):abort.signal);
 }
 async function wallVine(){if(!vineTask){const candidate=blessingVineTexture().clone();candidate.needsUpdate=true;const promise=(async()=>{let transferred=false;try{await prepareWebGpuTexture({renderer,texture:candidate,signal:abort.signal,release:()=>candidate.dispose()});transferred=true;ensure();return own(candidate);}catch(error){if(transferred)candidate.dispose();throw error;}})();vineTask=promise;promise.catch(()=>{if(vineTask===promise)vineTask=null;});}return vineTask;}
 let awakeningSelection={selecting:false,targetId:null};
 function setWallPresentation(wall,entity){if(!blessingVisibleAt)return;const at=entity.blessing?blessingVisibleAt(entity.id):Infinity,wound=blessingWoundAt?.(entity.id)??-1000;wall.blessingUniform.value.set(entity.blessing&&Number.isFinite(at)?1:0,Number.isFinite(at)?at:0,Number.isFinite(wound)?wound:-1000,wallAwakeningMode(entity,awakeningSelection));}
 async function wallsBank(materialId){const [,,pack]=await catalog(),reader=wallBufferReader(pack,bytes),result={};let material,colorManifest,colorBytes;
  if(renderer?.backend?.isWebGPUBackend){if(!['zarzas','empalizada','adobe','piedra','reforzado'].includes(materialId))throw Error('Unknown wall material '+materialId);[colorManifest,colorBytes]=await Promise.all([json(`/content/structure-preview/walls-${materialId}.json`),bytes(`/content/structure-preview/walls-${materialId}.rgb8`)]);ensure();if(colorManifest.version!==1||colorManifest.material!==materialId||colorManifest.texture!==pack.texture||colorBytes.byteLength!==colorManifest.bytes)throw Error('Wall preview metadata mismatch');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',colorBytes))).map(v=>v.toString(16).padStart(2,'0')).join('');if(digest!==colorManifest.sha256)throw Error('Wall preview checksum mismatch');
   const placeholder=own(new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1,THREE.RGBAFormat));placeholder.colorSpace=THREE.SRGBColorSpace;placeholder.flipY=false;placeholder.needsUpdate=true;material=own(createWebGpuStructureColorMaterial(placeholder,3));if(blessingVisibleAt)configureWebGpuWallBlessing(material,{vine:await wallVine(),clock:blessingClock});const transition={material,start:null,ready:false};transitions.push(transition);
   void (async()=>{try{const map=await texture(pack.texture);ensure();await uploadTexture(map);ensure();setWebGpuStructureColorTexture(transition.material,map);transition.ready=true;onSelectableChange?.();}catch(error){if(!closed&&!abort.signal.aborted){textureFailure=String(error?.message??error);onTextureError(error);}}})();
  }else material=own(new THREE.MeshStandardMaterial({map:await texture(pack.texture),roughness:.95,metalness:0,side:THREE.DoubleSide}));
  await Promise.all(Object.entries(pack.pieces).filter(([key])=>key.startsWith(materialId+'_')).map(async([key,piece])=>{const [p,n,uv,i,regions]=await Promise.all([piece.p,piece.n,piece.uv,piece.i,piece.faceRegions].map(reader)),morph=Object.fromEntries(await Promise.all(Object.entries(piece.morph).map(async([dest,bridge])=>{const [mp,mn]=await Promise.all([reader(bridge.p),reader(bridge.n)]);return [dest,{peers:bridge.peers,p:new Float32Array(mp),n:new Float32Array(mn)}];})));ensure();let color;if(colorManifest){const record=colorManifest.records[key];if(!record||record.count*8!==uv.byteLength||record.bytes!==record.count*3||record.offset<0||record.offset+record.bytes>colorBytes.byteLength)throw Error('Wall preview layout mismatch');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',uv))).map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==record.uvSha256)throw Error('Wall preview UV mismatch');color=new Uint8Array(colorBytes,record.offset,record.bytes);}const g=own(new THREE.BufferGeometry());g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(p),3));g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(n),3));g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(uv),2));g.setIndex(new THREE.BufferAttribute(new Uint16Array(i),1));g.computeBoundingBox();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,material);mesh.userData.nativePiece={p:new Float32Array(p),n:new Float32Array(n),uv:new Float32Array(uv),i:new Uint16Array(i),faceRegions:new Uint16Array(regions),regions:piece.regions,morph,...(color?{color}:{})};result[key]=mesh;}));if(!Object.keys(result).length)throw Error('Unknown wall material '+materialId);return result;
 }
 function bank(kind,key){const id=kind+':'+key;let result=banks.get(id);if(!result){result={value:null,promise:null};banks.set(id,result);result.promise=(kind==='village'?villageBank(key):kind==='center'?centerBank(key):wallsBank(key)).then(value=>{if(closed)return;result.value=value;sync();if(kind==='village')villagePreview?.assetsReady(key);}).catch(error=>{if(closed||abort.signal.aborted)return;result.preparationError=error;banks.delete(id);failure=String(error?.message??error);onSelectableChange?.();onError(error);});}return result.value;}
 function remove(id,entry){entry.centerAdmission?.abort();scene.remove(entry.group);entry.damage?.dispose();entry.village?.dispose();if(entry.kind==='wall'){if(entry.wall)entry.wall.dispose();else entry.group.dispose();}entries.delete(id);}
 const intactWallPlacement=entity=>JSON.stringify([entity.id,entity.material,entity.x,entity.z,entity.yaw??0,entity.baseScaleX??1,entity.gate===true,entity.status,entity.hp,entity.maxHp,entity.wallPresentation??null]);
 function prepareCenterRuin(source,{signal}){
  const key='s:'+source.center,entry=entries.get(key),entity=state.structures.find(item=>item.id===source.center);
  const points=entity?.kind==='center'?centerFootprint(entity,state).footprint.flatMap(p=>[Math.fround(p.x),Math.fround(p.z)]):[];
  if(points.length!==source.footprint.length||!points.every((v,i)=>v===source.footprint[i]))throw Error('Center ruin footprint changed');
  const resident=(sample,time)=>entity===sample&&state.elapsed===time&&!closed&&entry?.kind==='center'&&entry.centerReady&&entry.hasResidentGeometry&&entry.damage?.upToDate&&
   entry.group.visible&&entry.group.parent===scene&&entry.damage.group.parent===entry.group&&
   !entry.group.children[0].visible&&entries.get(key)===entry&&state.structures.includes(entity);
  if(!entry?.damage)throw Error('Native center ruin is not resident');
  return entry.damage.prepareRuin(source,{signal,resident});
 }
 function prepareNativeWallRemoval(entities,{signal,template}){
  const r=template.removal,entity=entities?.[0],id='s:'+r?.entityId,entry=entries.get(id);
  if(closed||signal?.aborted||!signal||entities.length!==1||!r||entity?.id!==r.entityId||entry?.kind!=='wall'||!entry.wall?.upToDate||entry.group.parent!==scene||!entry.group.visible)throw Error('Native wall removal owner unavailable');
  const current=state.structures.find(e=>e.id===entity.id);if(!current)throw Error('Native wall removal lost its confirmed entity');
  const stamp=intactWallPlacement(current),parts=entry.wall.parts.slice(),retained=entry.wall.captureNativeRemoval(template);
  if(intactWallPlacement(entity)!==stamp||entry.nativeRemoval)throw Error('Native wall removal changed its confirmed entity');
  let active=true,armed=false,attached=false,finalized=false,accepted=false;
  const valid=()=>active&&!closed&&!signal.aborted&&entries.get(id)===entry&&entry.nativeRemoval===part&&retained()&&entry.wall.parts.every((p,i)=>p===parts[i])&&entry.wall.parts.length===parts.length&&state.structures.includes(current)&&intactWallPlacement(current)===stamp;
  const check=()=>{if(!valid())throw Error('Native wall removal became stale');};
  const part={object:entry.group,signal,include:[],valid,eventRoots:()=>[entry.group],presentation:()=>({show:[],hide:[entry.group]}),
   acceptNativeBarrierBinding(data){check();const proof=copyNativeBarrierAdditionAttestation(data);if(!proof.reference.removal||!sameNativeBarrierAdditionReference(proof.preparedReference,template))throw Error('Native wall removal receipt changed');accepted=true;},
   activate(){check();if(armed)throw Error('Native wall removal already armed');armed=true;return true;},
   attach(){check();if(!armed||attached)throw Error('Native wall removal not armed');attached=true;},
   rollback(){attached=false;armed=false;},
   finalize(){check();if(!accepted||!attached||finalized)throw Error('Native wall removal lacks its commit');finalized=true;return {retire(){check();active=false;delete entry.nativeRemoval;remove(id,entry);},notify(){onSelectableChange?.();}};},
   rollbackFinalized(){finalized=false;},
   cancel(){if(!active)return false;if(finalized)throw Error('Native wall removal already finalized');part.rollback();active=false;delete entry.nativeRemoval;return true;}
  };entry.nativeRemoval=part;return [part];
 }
 async function prepareNativeWallRepair(entity,{signal,template}){
  const id='s:'+entity.id,entry=entries.get(id),source=state.structures.find(value=>value.id===entity.id);
  if(closed||signal?.aborted||!source||source.kind!=='wall'||source.gate||source.status!=='ruined'||source.hp!==0||source.blessing||entry?.kind!=='wall'||!entry.group.visible||!entry.wall?.upToDate||preparedWalls.has(id))throw Error('Native Repair needs its resident ruined wall');
  const expected={...source,hp:source.maxHp,status:'intact',collapseRemaining:0};delete expected.wallPresentation;
  const stamp=intactWallPlacement(entity),sourceStamp=JSON.stringify(source),height=surface(source.x,source.z);
  if(entity.wallPresentation||intactWallPlacement(expected)!==stamp||height===null)throw Error('Native Repair differs from its source ruin');
  const part=entry.wall.prepareNativeRepair({entity,elapsed:state.elapsed,signal,template}),record={entry,stamp,repair:true,ready:false,at:null,cancel:null};
  const valid=()=>!closed&&!signal.aborted&&preparedWalls.get(id)===record&&entries.get(id)===entry&&state.structures.includes(source)&&JSON.stringify(source)===sourceStamp&&surface(entity.x,entity.z)===height&&part.valid();
  const cancel=()=>{if(preparedWalls.get(id)!==record)return false;preparedWalls.delete(id);return part.cancel();};record.cancel=cancel;preparedWalls.set(id,record);
  return [{...part,valid,cancel,acceptNativeBarrierBinding(proof){if(!valid())throw Error('Native Repair source changed');const reference=proof.reference;if(reference.gate||reference.removal||reference.additions?.length!==1||reference.additions[0].entityId!==entity.id)throw Error('Native Repair acquired another wall');part.object.nativeGpuRepair.acceptBoundary(proof);record.at=reference.worldBoundary.effectiveTime;},
   finalize(){if(record.at===null)throw Error('Native Repair lacks its barrier receipt');const finalized=part.finalize();return {retire(){finalized.retire();record.ready=true;},notify(){sync();}};}}];
 }

 async function prepareNativeCenterPlacement(placement,view,{signal}={}){
  const source=copyNativeCenterPlacement(placement),entity=source.entity,id='s:'+entity.id;
  const key=centerCulture(entity,state),bankId='center:'+key;
  const current=()=>!closed&&!signal.aborted&&!entries.has(id)&&!preparedCenters.has(id)&&
    !state.structures.some(item=>item.id===entity.id);
  if(!pipelineAdmission||key!==entity.culture||!current())throw Error('Native center graphic owner unavailable');
  let assets=bank('center',key);
  if(!assets){await banks.get(bankId)?.promise;assets=banks.get(bankId)?.value;}
  if(!assets||!current())throw Error('Native center graphic owner changed');
  const at=createSettlementHeightSampler(view),height=at(entity.x,entity.z);
  if(!Number.isFinite(height))throw Error('Native center requires terrain support');
  const group=assets.group.clone(true),entry={kind:'center',key,group,centerReady:true,layout:'',hasResidentGeometry:true};
  group.userData.entityId=entity.id;group.position.set(entity.x,height+.025,entity.z);group.rotation.y=entity.yaw;
  group.visible=false;
  let adopted=false,receipt=null;
  const valid=()=>{
   const live=state.structures.find(item=>item.id===entity.id);
   return !closed&&!signal.aborted&&preparedCenters.get(id)===record&&!entries.has(id)&&
    banks.get(bankId)?.value===assets&&at(entity.x,entity.z)===height&&(!live||sameNativeCenterEntity(live,entity));
  };
  const record={entry,source,ready:false,cancel(){
   if(preparedCenters.get(id)!==record)return false;
   preparedCenters.delete(id);group.removeFromParent();return true;
  }};
  preparedCenters.set(id,record);
  // The retained packet shows the acquired center in place of its input preview.
  // The ordinary scene keeps the preview until the placement is confirmed.
  const provisional=()=>previewMeshes.get(source.commandId)?.object;
  return {object:group,signal,valid,cancel:record.cancel,eventRoots:()=>{
    const preview=provisional();return preview?[group,preview]:[group];
   },
   presentation:()=>{const preview=provisional();return {show:[group],hide:preview?[preview]:[]};},
   acceptCenterPlacement(value){
    const proof=copyNativeCenterPlacement(value,{committed:true}),live=state.structures.find(item=>item.id===entity.id);
    if(receipt||!valid()||!live||!sameNativeCenterPlacement(source,proof))throw Error('Confirmed center differs from its prepared graphic owner');
    receipt=proof;
   },
   activate:()=>receipt!==null&&valid(),
   attach(){scene.add(group);adopted=true;},
   rollback(){if(adopted){group.removeFromParent();adopted=false;}},
   rollbackFinalized(){record.ready=false;},
   finalize(){return {retire(){record.ready=true;},notify(){sync();assets.start();}};}
  };
 }

 async function prepareNativeWallAdditions(entities,{signal,gate=null,template=null}={}){
  if(closed||!pipelineAdmission||!signal||signal.aborted||!Array.isArray(entities)||!entities.length||entities.length>256)throw Error('Native wall placement resources unavailable');
  if(gate&&(entities.length!==1||entities[0]?.id!==gate.entityId))throw Error('Native gate resource owner changed');
  if(!gate&&entities.length===1&&entries.has('s:'+entities[0].id))return prepareNativeWallRepair(entities[0],{signal,template});
  const ids=new Set(),parts=[];
  const owned=(id,entity)=>entries.has(id)||preparedWalls.has(id)||state.structures.some(item=>item.id===entity.id);
  const placements=entities.map(entity=>{
   if(!entity||entity.kind!=='wall'||entity.status!=='intact'||Boolean(entity.gate)!==Boolean(gate)||entity.wallPresentation||entity.blessing||typeof entity.id!=='string'||!entity.id||typeof entity.material!=='string'||![entity.x,entity.z,entity.yaw??0,entity.baseScaleX??1,entity.hp,entity.maxHp].every(Number.isFinite)||entity.hp<=0||entity.hp!==entity.maxHp)throw TypeError('Invalid prepared native wall');
   const id='s:'+entity.id,key=entity.material,height=surface(entity.x,entity.z);
   if(ids.has(id)||owned(id,entity))throw Error('Native wall placement already owned');
   if(height===null)throw Error('Native wall placement requires resident terrain');
   if(gate&&(entity.gateOpen!==gate.opening||Math.abs(height+.025-gate.rootMatrix[13])>1e-5))throw Error('Native gate placement differs from its initial pose');
   ids.add(id);
   return {id,key,height,entity,stamp:intactWallPlacement(entity)};
  });
  const materialBanks=new Map();
  for(const key of new Set(placements.map(placement=>placement.key))){
   bank('wall',key);
   materialBanks.set(key,banks.get('wall:'+key));
  }
  const pending=[...materialBanks.values()].filter(item=>!item.value);
  if(pending.length)await Promise.all(pending.map(item=>item.promise));
  if(closed||signal.aborted)throw new DOMException('Native wall placement cancelled','AbortError');
  for(const item of pending){if(item.preparationError)throw item.preparationError;if(!item.value)throw Error('Native wall placement assets unavailable');}
  try{
   for(const {id,key,height,entity,stamp} of placements){
    if(owned(id,entity)||surface(entity.x,entity.z)!==height||intactWallPlacement(entity)!==stamp||(gate&&entity.gateOpen!==gate.opening))throw new DOMException('Native wall placement changed','AbortError');
    const assets=materialBanks.get(key).value;
    const wall=createWebGpuAdmittedWall({renderer,prototypes:assets,entity,elapsed:state.elapsed,pipelineAdmission,resourceRegistry,onError,setWallPresentation,presentationClock:confirmedClock?.node??null,getPresentationTime,getRepairAge,prepareInitial:true}),group=wall.group,initial=wall.initialParticipant;
    const entry={kind:'wall',key,group,wall,hasResidentGeometry:true},record={entry,stamp,ready:false,cancel:null};
    group.userData.entityId=entity.id;group.position.set(entity.x,height+.025,entity.z);group.rotation.y=entity.yaw??0;
    const cancel=()=>{if(preparedWalls.get(id)!==record)return false;preparedWalls.delete(id);try{scene.remove(group);}finally{wall.dispose();}return true;};
    record.cancel=cancel;preparedWalls.set(id,record);
    const part={...initial,valid:()=>!closed&&!signal.aborted&&preparedWalls.get(id)===record&&group.parent===scene&&surface(entity.x,entity.z)===height&&initial.valid(),cancel,
     finalize(){const finalized=initial.finalize();return {retire(){finalized.retire();record.ready=true;},notify(){sync();}};}};
    parts.push(part);scene.add(group);
   }
   return parts;
  }catch(error){for(const part of parts.reverse())part.cancel();throw error;}
 }
 function sync(events=[],{ignoreUnmatched=false}={}){if(closed)return;if(!confirmedClock)blessingClock.value=state.elapsed??0;const desired=new Map();for(const village of state.villages??[])desired.set('v:'+village.id,{kind:'village',entity:village,key:village.culture});for(const entity of state.structures??[]){if(entity.kind==='center')desired.set('s:'+entity.id,{kind:'center',entity,key:centerCulture(entity,state)});else if(entity.kind==='wall')desired.set('s:'+entity.id,{kind:'wall',entity,key:entity.material});}
  for(const [id,entry] of entries){const wanted=desired.get(id);if(!wanted||entry.kind!==wanted.kind||entry.key!==wanted.key)remove(id,entry);}
  for(const [id,record] of preparedCenters){
   if(!record.ready)continue;
   const wanted=desired.get(id);
   if(!wanted||!sameNativeCenterEntity(wanted.entity,record.source.entity))throw Error('Confirmed center differs from its prepared graphic owner');
   entries.set(id,record.entry);preparedCenters.delete(id);
  }
  for(const [id,record] of preparedWalls){const wanted=desired.get(id);if(!record.ready||!wanted)continue;if(record.repair){if(wanted.entity.status==='ruined')continue;const p=wanted.entity.wallPresentation;if(!p||p.from!==0||p.to!==1||p.at!==record.at||intactWallPlacement({...wanted.entity,wallPresentation:null})!==record.stamp)throw Error('Confirmed Repair differs from its prepared owner');record.entry.wall.update(wanted.entity,state.elapsed);}if(wanted.kind!=='wall'||intactWallPlacement(record.repair?{...wanted.entity,wallPresentation:null}:wanted.entity)!==record.stamp)throw Error('Confirmed wall differs from its prepared graphic owner');entries.set(id,record.entry);preparedWalls.delete(id);}
  for(const [id,wanted] of desired){if(preparedWalls.has(id)||preparedCenters.has(id))continue;const {kind,entity,key}=wanted,assets=bank(kind,key);if(!assets)continue;let entry=entries.get(id);if(!entry){const onReady=()=>{if(!closed&&entries.get(id)===entry){delete entry.preparationError;sync();}},onWallError=error=>{if(!closed&&entries.get(id)===entry){entry.preparationError=error;onSelectableChange?.();}onError(error);},wall=kind==='wall'&&pipelineAdmission?createWebGpuAdmittedWall({renderer,prototypes:assets,entity,elapsed:state.elapsed,pipelineAdmission,resourceRegistry,onReady,onError:onWallError,setWallPresentation,presentationClock:confirmedClock?.node??null,getPresentationTime,getRepairAge}):null,village=kind==='village'&&pipelineAdmission?createWebGpuAdmittedVillage({pipelineAdmission,resourceRegistry,onReady,onError}):null,group=kind==='village'?village?.group??new THREE.Group():kind==='center'?assets.group.clone(true):wall?.group??new NativeWall(assets,entity,state.elapsed);group.userData.entityId=entity.id;const centerAdmission=kind==='center'&&pipelineAdmission?new AbortController():null;if(centerAdmission)group.visible=false;entry={kind,key,group,wall,village,centerAdmission,centerReady:!centerAdmission,layout:''};entries.set(id,entry);scene.add(group);if(kind==='center'){assets.start();if(centerAdmission){const current=()=>!closed&&entries.get(id)===entry&&!centerAdmission.signal.aborted,publish=()=>{if(!current())return;entry.centerReady=true;sync();},options={signal:centerAdmission.signal};Promise.resolve().then(()=>typeof pipelineAdmission.prepareAndPublish==='function'?pipelineAdmission.prepareAndPublish(group,options,publish):Promise.resolve(pipelineAdmission.prepare(group,options)).then(publish)).catch(error=>{if(!current())return;remove(id,entry);failure=String(error?.message??error);onError(error);});}}}
   // A terrain notification is not a changed layout. Preserve the admitted
   // objects when their authored placement and actual sampled support agree.
   if(kind==='village'){const placement=entity.buildings.map(b=>[b.key,b.x,b.z,b.yaw??0,surface(b.x,b.z)]),layout=JSON.stringify(placement);entry.hasResidentGeometry=placement.some(item=>assets.has(item[0])&&item[4]!==null);if(entry.layout!==layout||entry.village&&!entry.village.upToDate){entry.layout=layout;const build=()=>{const result=buildWebGpuVillage(assets,entity.buildings,surface);entry.hasResidentGeometry=result.children.length>0;return result;};if(entry.village)entry.village.update(layout,build);else{entry.group.clear();entry.group.add(...build().children.slice());}}if(entry.village)entry.group.visible=entry.village.ready;}
   else{const height=surface(entity.x,entity.z);entry.hasResidentGeometry=height!==null;entry.group.visible=height!==null&&(!entry.wall||entry.wall.ready)&&(kind!=='center'||entry.centerReady);if(height!==null)entry.group.position.set(entity.x,height+.025,entity.z);entry.group.rotation.y=entity.yaw??0;if(kind==='wall'){if(entry.wall)entry.wall.update(entity,state.elapsed);else{entry.group.update(entity,undefined,state.elapsed);setWallPresentation(entry.group,entity);}}else if(kind==='center'){const damaged=entity.status==='ruined'||entity.status==='collapsing'||entity.hp<entity.maxHp;if(damaged){if(!entry.damage){const damage=assets.damage(entry.lastDamage??null);entry.damage=pipelineAdmission?createWebGpuAdmittedCenterDamage({damage,pipelineAdmission,onReady:()=>{if(!closed&&entries.get(id)===entry)sync();},onError}):damage;entry.group.add(entry.damage.group);}const ruinAt=entity.status==='ruined'?events.findLast(event=>event.type==='StructureRuined'&&event.targetId===entity.id&&event.structureKind==='center')?.simulationTime??null:null;entry.damage.update(entity,state.elapsed,ruinAt);if(pipelineAdmission)entry.group.children[0].visible=!entry.damage.ready;else{entry.group.children[0].visible=false;entry.damage.group.visible=true;}}else{entry.group.children[0].visible=true;if(entry.damage){if(pipelineAdmission)entry.damage.hide();else entry.damage.group.visible=false;}}entry.lastDamage=confirmedCenterDamage(entity);}}
  }
  if(enableStructurePreviews)previews.reconcile(events,id=>entries.get('s:'+id)?.group.visible===true,{ignoreUnmatched});
  if(villagePreviewTarget){const entry=entries.get('v:'+villagePreviewTarget),confirmed=desired.get('v:'+villagePreviewTarget)?.entity;if(villagePreviewReconciled(entry,confirmed)){villagePreview?.clear();villagePreviewTarget=null;}}
  if(onCameraStructures){const records=[];let complete=true;for(const [id,wanted] of desired){const entry=entries.get(id);if(!entry||!entry.group.visible){complete=false;continue;}entry.group.updateWorldMatrix(true,true);if(wanted.kind==='center'){if(entry.damage?.upToDate===false&&(wanted.entity.status==='ruined'||wanted.entity.status==='collapsing'||wanted.entity.hp<wanted.entity.maxHp))complete=false;const boxes=banks.get('center:'+entry.key)?.value?.cameraBoxes;if(!boxes){complete=false;continue;}const damage=confirmedCenterDamage(wanted.entity),name=damage>=.9998?'ash':damage>.79?'fall':'still',bounds=boxes[name].clone();if(damage>.23&&name!=='ash')bounds.union(boxes.ash);records.push({id:id+':center',kind:'center',min:bounds.min.toArray(),max:bounds.max.toArray(),matrix:entry.group.matrixWorld.toArray()});}else if(wanted.kind==='village'){const meshes=entry.village?.meshes??entry.group.children;if(entry.village&&!entry.village.upToDate||meshes.length!==wanted.entity.buildings.length)complete=false;meshes.forEach((mesh,i)=>{const bounds=mesh.geometry.boundingBox;if(!bounds||bounds.isEmpty()){complete=false;return;}records.push({id:id+':'+i,kind:'village',min:bounds.min.toArray(),max:bounds.max.toArray(),matrix:mesh.matrixWorld.toArray()});});}else {if(entry.wall&&!entry.wall.upToDate)complete=false;for(let i=0;i<(entry.wall?.parts??entry.group.parts).length;i++){const mesh=(entry.wall?.parts??entry.group.parts)[i].mesh;if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox;if(bounds.isEmpty())continue;records.push({id:id+':'+i,kind:'wall',min:bounds.min.toArray(),max:bounds.max.toArray(),matrix:mesh.matrixWorld.toArray()});}}}const snapshot={records,complete};const signature=JSON.stringify(snapshot);if(signature!==cameraSignature){if(onCameraStructures(snapshot)!==false)cameraSignature=signature;}}
  onSelectableChange?.();
 }
 const villagePreview=pipelineAdmission&&enableStructurePreviews?createWebGpuVillagePreview({scene,surface,resourceRegistry,indicator,assetsFor:culture=>banks.get('village:'+culture)?.value??null,pipelineAdmission,onError,onChange:()=>onSelectableChange?.()}):null;
 // Use the prepared chunk meshes, never the ineffective native world or a
 // temporary installation into live residency, to sample proposed support.
 function prepareNativeRouteGates({packet,motion,getPickTime,signal}){
  if(closed||!pipelineAdmission)throw Error('Native settlement resource owner unavailable');
  const participants=[];
  try{for(const gate of packet.gates){const entry=entries.get('s:'+gate.entityId);if(entry?.kind!=='wall'||!entry.group.visible||!entry.wall?.upToDate)throw Error('Native gate wall not resident');participants.push(entry.wall.prepareNativeGate({presentation:gate,motion,getPickTime,signal}));}return participants;}
  catch(error){for(const participant of participants)participant.cancel();throw error;}
 }
 function nativeGateLease(){const live=[...entries.values()].map(entry=>entry.wall?.nativeGateLease).filter(Boolean);return live.length?{start:Math.max(...live.map(value=>value.start)),end:Math.max(...live.map(value=>value.end))}:null;}
 // Publication sequence and the resident wall's graphical admission are
 // separate prerequisites. The caller waits through its existing publication
 // waiter; this guard only retains the exact confirmed owners it depends on.
 function nativeGatePreparationReadiness(resources){
  const owners=resources.gates.map(gate=>{
   const entity=state.structures?.find(value=>value.id===gate.entityId);
   if(!entity||entity.kind!=='wall'||!entity.gate||entity.status!=='intact'||!Number.isFinite(entity.hp)||!Number.isFinite(entity.maxHp)||entity.maxHp<=0||entity.hp<=0||entity.hp>entity.maxHp)throw Error('Native gate preparation has no intact confirmed owner');
   return {id:'s:'+entity.id,entityId:entity.id,stamp:intactWallPlacement(entity),entry:entries.get('s:'+entity.id)??null,bank:banks.get('wall:'+entity.material)??null};
  });
  return ()=>{
   if(closed)throw new DOMException('Native gate owner disposed','AbortError');
   let ready=true;
   for(const owner of owners){
    const entity=state.structures?.find(value=>value.id===owner.entityId),entry=entries.get(owner.id);
    if(!entity||intactWallPlacement(entity)!==owner.stamp||owner.entry&&entry!==owner.entry)throw new DOMException('Native gate preparation owner changed','AbortError');
    owner.bank??=banks.get('wall:'+entity.material)??null;
    if(owner.bank?.preparationError)throw owner.bank.preparationError;
    if(!entry){ready=false;continue;}owner.entry??=entry;
    if(entry.preparationError)throw entry.preparationError;
    if(entry.kind!=='wall'||!entry.wall)throw Error('Native gate preparation has no admitted wall owner');
    if(entry.group.parent!==scene||!entry.group.visible||!entry.wall.upToDate)ready=false;
   }
   return ready;
  };
 }
 function prepareNativeGateRetention(presentation,options){
  const entry=entries.get('s:'+presentation.entityId);
  if(closed||entry?.kind!=='wall'||!entry.group.visible||!entry.wall?.upToDate)throw Error('Native retained gate wall not resident');
  return entry.wall.prepareNativeGateRetention({presentation,...options});
 }
 function prepareNativeTerminalGates(resources,presentations,{signal}){
  const ref=resources.nativeHomeArrival??resources.nativeSettlement,ids=(ref.sourceHome??ref.sourceCarry).gateIds;
  if(!Array.isArray(presentations)||presentations.length!==ids.length||new Set(presentations.map(g=>g.gateId)).size!==ids.length||presentations.some(g=>!ids.includes(g.gateId)))throw Error('Native terminal gates differ from their retained source');
  const parts=[];
  try{for(const presentation of presentations){
   const entry=entries.get('s:'+presentation.entityId);
   if(closed||entry?.kind!=='wall'||!entry.group.visible||!entry.wall?.upToDate)throw Error('Native terminal gate wall not resident');
   parts.push(entry.wall.prepareNativeTerminalGateRetention({presentation,resources,signal}));
  }return parts;}catch(error){for(const part of parts.reverse())part.cancel();throw error;}
 }
 function prepareNativeStoppedGate(presentation,{template,signal,getStoppedProjection}){
  const entry=entries.get('s:'+presentation.entityId);
  if(closed||entry?.kind!=='wall'||!entry.group.visible||!entry.wall?.upToDate)throw Error('Native stopped gate wall not resident');
  const motion=createNativeGateGpuClock(presentation,{stopTemplate:template,getStoppedProjection}),part=entry.wall.prepareNativeGate({presentation,motion,signal,getPickTime:()=>presentation.startTime});
  try{return part.chunkParticipant();}catch(error){part.cancel();throw error;}
 }
 function prepareNativeGateMotors(resources,{getPickTime,signal}){
  const participants=[];
  try{for(const gate of resources.gates){const entry=entries.get('s:'+gate.entityId);if(closed||entry?.kind!=='wall'||!entry.group.visible||!entry.wall?.upToDate)throw Error('Native gate motor wall not resident');const motion=createNativeGateGpuClock(gate);participants.push(entry.wall.prepareNativeGate({presentation:gate,motion,getPickTime:()=>getPickTime(motion.nativeGate,motion.status().installed.start.at),signal}));}return participants;}
  catch(error){for(const participant of participants)participant.cancel();throw error;}
 }
 function prepareVillageTerrain(view){
  if(closed||!view||typeof view.get!=='function'||!(view.changedKeys instanceof Set))throw TypeError('Invalid proposed village terrain');
  const liveMeshes=new Map(),sample=createSettlementHeightSampler({get(cx,cz){const mesh=view.get(cx,cz),key=`${cx},${cz}`;if(!view.changedKeys.has(key))liveMeshes.set(key,mesh);return mesh;}}),parts=[];
  try{for(const entity of state.structures??[]){
   if(!view.changedKeys.has(`${Math.floor((entity.x+24)/48)},${Math.floor((entity.z+24)/48)}`)||entity.gate)continue;
   const previousHeight=surface(entity.x,entity.z),nextHeight=sample(entity.x,entity.z);if(previousHeight===nextHeight)continue;
   const id='s:'+entity.id,entry=entries.get(id);if(!entry||entry.kind==='wall'&&!entry.wall?.upToDate||entry.kind==='center'&&!entry.centerReady)throw Error('Structure terrain resources unavailable');
   const stamp=JSON.stringify(entity);parts.push(createPreparedTerrainPlacement({object:entry.group,entity,previousHeight,nextHeight,isCurrent:()=>!closed&&entries.get(id)===entry&&state.structures.includes(entity)&&JSON.stringify(entity)===stamp}));
  }
  for(const entity of state.villages??[]){
   if(!entity.buildings.some(b=>view.changedKeys.has(`${Math.floor((b.x+24)/48)},${Math.floor((b.z+24)/48)}`)))continue;
   const id='v:'+entity.id,entry=entries.get(id),assets=banks.get('village:'+entity.culture)?.value;
   if(!entry?.village||!assets)throw Error('Village terrain resources unavailable');
   const buildings=JSON.stringify(entity.buildings),layout=JSON.stringify(entity.buildings.map(b=>[b.key,b.x,b.z,b.yaw??0,sample(b.x,b.z)]));
   if(layout===entry.layout&&entry.village.upToDate)continue;
   const part=entry.village.prepareParticipant(layout,()=>buildWebGpuVillage(assets,entity.buildings,sample)),valid=part.valid;
   part.valid=()=>valid()&&entries.get(id)===entry&&state.villages?.includes(entity)&&entity.culture===entry.key&&JSON.stringify(entity.buildings)===buildings&&[...liveMeshes].every(([key,mesh])=>{const [cx,cz]=key.split(',').map(Number);return (residency.getVisible??residency.get).call(residency,cx,cz)===mesh;});parts.push(part);
  }return parts;}catch(error){for(const part of parts.reverse())part.cancel();throw error;}
 }
 function tickTransition(t,now){if(!t.ready)return;if(t.start===null)t.start=now;setWebGpuStructureColorBlend(t.material,Math.min(1,Math.max(0,(now-t.start)/350)));}
 // Check only on a pick. Include both admitted and hidden candidate geometry;
 // if a safe envelope is unavailable, retain the conservative global barrier.
 function pendingRayReady(ray,limit){
  if(closed||!ray?.origin?.isVector3||!ray?.direction?.isVector3||typeof ray?.intersectBox!=='function'||![...ray.origin.toArray(),...ray.direction.toArray()].every(Number.isFinite)||ray.direction.lengthSq()===0||!(limit>=0))return false;
  const bounds=new THREE.Box3(),point=new THREE.Vector3();
  for(const entry of entries.values()){
   if(!entry.hasResidentGeometry||entry.group.visible&&entry.wall?.upToDate!==false&&entry.village?.upToDate!==false&&!(entry.kind==='center'&&entry.lastDamage>0&&entry.damage?.upToDate===false))continue;
   entry.group.updateWorldMatrix(true,true);bounds.makeEmpty();
   if(entry.kind==='center'&&entry.lastDamage>0&&entry.damage?.upToDate===false){const boxes=banks.get('center:'+entry.key)?.value?.cameraBoxes;if(!boxes?.still||!boxes?.fall||!boxes?.ash)return false;for(const name of ['still','fall','ash'])bounds.union(boxes[name]);bounds.applyMatrix4(entry.group.matrixWorld);}
   else bounds.setFromObject(entry.group);
   if(bounds.isEmpty()||![...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite))return false;
   bounds.expandByScalar(.001);if(bounds.containsPoint(ray.origin))return false;
   if(ray.intersectBox(bounds,point)&&point.distanceTo(ray.origin)<=limit)return false;
  }
  return true;
 }
 return {sync,prepareNativeCenterPlacement,prepareCenterStrike,prepareCenterRuin,prepareNativeWallAdditions,prepareNativeWallRemoval,nativeGatePreparationReadiness,prepareNativeStoppedGate,prepareNativeGateMotors,prepareNativeGateRetention,prepareNativeTerminalGates,prepareNativeRouteGates,nativeGateLease,prepareVillageTerrain,pendingRayReady,prepareIndicator,get needsSoftDepth(){for(const entry of entries.values())if(entry.damage?.group.visible&&entry.damage.needsSoftDepth)return true;return false;},setSoftDepthEnabled(value){if(typeof value!=='boolean')throw TypeError('Invalid settlement soft depth state');for(const entry of entries.values())entry.damage?.setSoftDepthEnabled(value);},previewVisible(id){return id===villageFeedbackId?(villagePreview?.visible===true||villagePreview?.waitingVisible===true):(indicator?.has(id)===true||previewMeshes.get(id)?.object?.visible===true);},watchPreviewStatus(id){previewWatches.add(id);},previewStatus(id){if(id===villageFeedbackId&&villagePreview?.active)return 'pending';if(previews.has(id))return 'pending';const outcome=previewOutcomes.get(id);if(!outcome)return 'unavailable';if(outcome.reason==='reconciled'&&!outcome.targets.every(target=>entries.get('s:'+target)?.group.visible===true))return 'removed';return outcome.reason;},forgetPreviewStatus(id){previewWatches.delete(id);previewOutcomes.delete(id);},setAwakeningSelection(selecting,targetId=null){if(closed)return;wallAwakeningMode(null,{selecting,targetId});if(awakeningSelection.selecting===selecting&&awakeningSelection.targetId===targetId)return;awakeningSelection={selecting,targetId};const walls=new Map((state.structures??[]).filter(item=>item.kind==='wall').map(item=>[item.id,item]));for(const [id,entry] of entries){if(entry.kind!=='wall')continue;const entity=walls.get(id.slice(2));if(!entity)continue;if(entry.wall)entry.wall.update(entity,state.elapsed);else setWallPresentation(entry.group,entity);}},guardianStructures(){return cameraSignature?JSON.parse(cameraSignature):null;},preparePreview,beginPreview,showVillagePreview(preview){if(!villagePreview)throw Error('Village preview unavailable');villagePreviewTarget=null;villagePreview.show(preview);villageFeedbackId=typeof preview.feedbackId==='string'&&preview.feedbackId?preview.feedbackId:null;bank('village',preview.culture);},clearVillagePreview(){villagePreviewTarget=null;villageFeedbackId=null;villagePreview?.clear();},confirmVillagePreview(targetId){if(typeof targetId!=='string'||!targetId)throw TypeError('Invalid village target');villagePreviewTarget=targetId;sync();},abandonPreview(id){previews.abandon(id);},confirmPreview(id,targetId){previews.confirm(id,targetId);sync();},rejectPreview(id){previews.reject(id);},prepare(camera){if(closed)return;for(const entry of entries.values())if(entry.damage?.group.visible)entry.damage.prepare(camera);},terrainChanged(){if(closed)return;sync();for(const item of previewMeshes.values())item.terrainChanged?.();for(const [id,anchor] of indicatorAnchors){const y=surface(anchor.x,anchor.z);if(Number.isFinite(y))indicator?.moveHeight(id,y);}for(const [id,command] of [...waitingTerrain])if(previews.has(id))try{beginPreview(command,true);}catch(error){previews.abandon(id);onError(error);}villagePreview?.terrainChanged();},tick(now){if(closed)return;if(previewMeshes.size||centerTextured<progressiveCenters.size||transitions.some(t=>t.ready&&t.material._wgTextureBlend<1)||villageTransitions.some(t=>t.ready&&t.material._wgTextureBlend<1))onSelectableChange?.();indicator?.tick(now);for(const item of previewMeshes.values())item.update(now);for(const center of progressiveCenters)center.tick(now);for(const t of transitions)tickTransition(t,now);for(const t of villageTransitions)tickTransition(t,now);},status(){let villages=0,centers=0,walls=0,units=0,damagedCenters=0,selectableReady=!closed;for(const entry of entries.values()){if(entry.hasResidentGeometry&&(!entry.group.visible||entry.wall?.upToDate===false||entry.village?.upToDate===false||entry.kind==='center'&&entry.lastDamage>0&&entry.damage?.upToDate===false))selectableReady=false;if(entry.kind==='village'){villages++;units+=(entry.village?.meshes??entry.group.children).length;}else if(entry.kind==='center'){centers++;if(entry.damage?.group.visible)damagedCenters++;}else walls++;}return {closed,villages,units,centers,walls,damagedCenters,selectableReady,provisional:previews.size,previewHistorySaturated:previews.saturated,destruction:[...entries.values()].filter(e=>e.damage?.group.visible).map(e=>e.damage.status()),banks:banks.size,failure,textureFailure,villagePreviews:villageTransitions.length,villageTextured:villageTransitions.filter(t=>t.material._wgTextureBlend===1).length,centerPreviews:progressiveCenters.size,centerTextured,wallPreviews:transitions.length,wallTextured:transitions.filter(t=>t.material._wgTextureBlend===1).length};},dispose(){if(closed)return;closed=true;villagePreview?.dispose();previews.clear();previewWatches.clear();previewOutcomes.clear();indicator?.dispose();abort.abort();previewMaterials.dispose();manager.abort();for(const record of preparedWalls.values())record.cancel();for(const record of preparedCenters.values())record.cancel();for(const [id,entry] of entries)remove(id,entry);const templates=[...centerTemplates],centers=[...progressiveCenters],owned=[...resources],images=[...bitmaps],leases=new Map(resourceLeases);resourceLeases.clear();centerTemplates.clear();progressiveCenters.clear();resources.clear();bitmaps.clear();banks.clear();const release=()=>{const done=(item,dispose)=>{const lease=leases.get(item);if(lease)lease.release();else dispose();};for(const template of templates)done(template,()=>template.dispose());for(const center of centers)done(center,()=>center.dispose());for(const resource of owned)done(resource,()=>resource.dispose());for(const bitmap of images)done(bitmap,()=>bitmap.close());};releaseAfterWebGpuWork({renderer,admission:pipelineAdmission,uploadsPending:pendingUploads>0,release,onError:onTextureError});}};
}
