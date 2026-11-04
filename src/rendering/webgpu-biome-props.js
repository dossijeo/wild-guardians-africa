import * as THREE from 'three';
import {BIOME_IDS} from '../world/biome-ids.js';
import {assetUrl} from './asset-url.js';
import {nearTreeGeometry,removeReviewedTreeTriangles} from './near-tree-textures.js';

// Worker-owned visual instances from the same confirmed Wild Engine chunk
// payload used by the game. Navigation and suppression remain authoritative.
// Slots 0-18 cover vegetation and solid biome props; slot 19 needs the
// separate native fluid/clipping presentation. Materials remain provisional.
export function createWebGpuBiomeProps({scene,state,onError=()=>{}}={}){
 if(!scene?.isScene||!state||!BIOME_IDS[state.biome]||typeof onError!=='function')throw TypeError('Invalid biome props');
 const controller=new AbortController(),chunks=new Map(),versions=new Map(),resources=new Set(),bitmaps=new Set();let closed=false,prototypes=null,suppressionKey='',failure=null;
 const ensure=()=>{if(closed)throw new DOMException('Biome props disposed','AbortError');};
 const own=resource=>{if(closed){resource.dispose();throw new DOMException('Biome props disposed','AbortError');}resources.add(resource);return resource;};
 const load=async url=>{const response=await fetch(assetUrl(url),{signal:controller.signal});if(!response.ok)throw Error(`Biome asset ${response.status}: ${url}`);return response;};
 async function image(url,color){const blob=await (await load(url)).blob(),bitmap=await createImageBitmap(blob);if(closed){bitmap.close();ensure();}bitmaps.add(bitmap);const texture=own(new THREE.Texture(bitmap));texture.flipY=false;texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.needsUpdate=true;return texture;}
 function clear(record){for(const mesh of record.meshes){scene.remove(mesh);mesh.dispose();}record.meshes=[];}
 function rebuild(record,suppressed){
  if(!prototypes||closed)return;const next=[],dummy=new THREE.Object3D();
  try{for(let slot=0;slot<19;slot++){const proto=prototypes[slot],items=record.instances[slot].filter(p=>!suppressed.has(p.id));if(!proto||!items.length)continue;const mesh=new THREE.InstancedMesh(proto.geometry,proto.material,items.length);mesh.position.set(record.cx*48,0,record.cz*48);for(let i=0;i<items.length;i++){const p=items[i];dummy.position.set(p.x-record.cx*48,p.y,p.z-record.cz*48);dummy.rotation.y=p.yaw;dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;mesh.castShadow=true;mesh.userData.nativePropSlot=slot;mesh.userData.spatialChunk=`${record.cx},${record.cz}`;scene.add(mesh);next.push(mesh);}}
  catch(error){for(const mesh of next){scene.remove(mesh);mesh.dispose();}throw error;}clear(record);record.meshes=next;
 }
 function suppressed(){return new Set(state.suppressed??[]);}
 function sync(){if(closed)return;const key=JSON.stringify(state.suppressed??[]);if(key===suppressionKey)return;suppressionKey=key;if(prototypes){const removed=suppressed();for(const entry of chunks.values())rebuild(entry,removed);}}
 const ready=(async()=>{
  const pack=await (await load(`/content/biome-${BIOME_IDS[state.biome]}.json`)).json();ensure();const buffer=await (await load(pack.binary.url)).arrayBuffer();ensure();
  const cache=new Map(),loadTexture=(url,color)=>{const key=url+':'+color;if(!cache.has(key))cache.set(key,image(url,color));return cache.get(key);};
  async function textureSet(entries){return Object.fromEntries(await Promise.all(entries.map(async t=>[t.role,await loadTexture(t.base64.url,t.role==='baseColor')])));}
  const [base,sets]=await Promise.all([textureSet(pack.textures),Promise.all((pack.textureSets??[]).map(textureSet))]);ensure();const types={'<f4':Float32Array,'<u2':Uint16Array,'<u4':Uint32Array},attribute=desc=>new types[desc.type](buffer,desc.offset,desc.count),next=[];
  for(let slot=0;slot<19;slot++){
   const asset=pack.assets[slot],lod=asset.lods[0],geometry=own(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.BufferAttribute(attribute(lod.position),3));geometry.setAttribute('normal',new THREE.BufferAttribute(attribute(lod.normal),3));geometry.setAttribute('uv',new THREE.BufferAttribute(attribute(lod.uv),2));geometry.setIndex(new THREE.BufferAttribute(attribute(lod.index),1));geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const maps={...(asset.textureSet===undefined?base:sets[asset.textureSet])},factor=pack.material.baseColorFactor??[1,1,1,1];let selected=geometry;
   if(asset.nearTextures){const [uv,entries]=await Promise.all([(await load(asset.nearTextures.cornerUV)).arrayBuffer(),Promise.all(Object.entries(asset.nearTextures.textures).map(async([role,url])=>[role,await loadTexture(url,role==='baseColor')]))]);ensure();selected=own(nearTreeGeometry(geometry,new Float32Array(uv)));for(const [role,near] of entries){const copy=own(near.clone());copy.channel=1;copy.needsUpdate=true;maps[role]=copy;}}
   removeReviewedTreeTriangles(selected,asset.geometryCleanup?.removedTriangles?.[0]);
   const material=own(new THREE.MeshStandardMaterial({map:maps.baseColor,normalMap:maps.normal,roughnessMap:maps.metallicRoughness,metalnessMap:maps.metallicRoughness,roughness:1,metalness:0,alphaTest:.35,opacity:factor[3],side:asset.doubleSidedFoliage?THREE.DoubleSide:THREE.FrontSide}));material.color.fromArray(factor);material.normalScale.setScalar(pack.material.normalScale??.6);next.push({geometry:selected,material});
  }
  ensure();prototypes=next;const removed=suppressed();for(const entry of chunks.values())rebuild(entry,removed);return true;
 })().catch(error=>{if(!closed){failure=String(error?.message??error);onError(error);}return false;});
 function replace(payload,revision){if(closed)throw Error('Biome props disposed');if(!payload.instances)return;const key=`${payload.cx},${payload.cz}`,previous=versions.get(key);if(previous!==undefined&&revision<=previous)return;if(!Array.isArray(payload.instances)||payload.instances.length!==20)throw TypeError('Invalid biome instances');const entry={cx:payload.cx,cz:payload.cz,instances:payload.instances,meshes:[]},old=chunks.get(key);if(prototypes)rebuild(entry,suppressed());if(old)clear(old);chunks.set(key,entry);versions.set(key,revision);}
 return {ready,replace,sync,status(){return {ready:!!prototypes,chunks:chunks.size,meshes:[...chunks.values()].reduce((n,e)=>n+e.meshes.length,0),failure};},dispose(){if(closed)return;closed=true;controller.abort();for(const entry of chunks.values())clear(entry);chunks.clear();versions.clear();for(const resource of resources)resource.dispose();resources.clear();for(const bitmap of bitmaps)bitmap.close();bitmaps.clear();}};
}
