import {prepareLoadingImage,ownLoadingBitmap} from './loading-image.js';
import {LoadingImageDecoder} from './loading-image-decoder.js';
import {prepareBiomeTangentsAsync} from './prepare-biome-tangents.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {assetUrl} from './asset-url.js';
import {json,bytes} from './asset-fetch.js';
import {beginAssetTransfer,updateAssetTransfer,finishAssetTransfer,cachedAssetTransfer,observeLoadingManager} from './asset-transfer.js';
export {json,bytes} from './asset-fetch.js';
import {prepareNativeBuilding,prepareNativeBuildingAsync} from './buildings.js';
import {nativeAssetMaterial} from './asset-surface.js';
import {computeTangents} from './surface-source.js';
export class Assets {
  constructor(){this.preparation=new AbortController();this.activeModelTransfers=new Set();this.loadedTextureKeys=new Set();const manager=new THREE.LoadingManager();this.transfers=observeLoadingManager(manager,{skip:url=>this.activeModelTransfers.has(url)});this.loader=new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);this.textures=new THREE.TextureLoader(manager);this.cache=new Map();this.modelSources=new Map();this.ownedResources=new Set();this.disposedResources=new WeakSet();}
  assertOpen(){if(this.modelsDisposed)throw new Error('Asset collection is disposed');}
  own(resource){
    if(this.modelsDisposed){this.release(resource);return resource;}
    if(!this.ownedResources.has(resource)&&!this.disposedResources.has(resource)){
      this.ownedResources.add(resource);
      const onDispose=()=>{this.ownedResources.delete(resource);this.disposedResources.add(resource);resource.removeEventListener('dispose',onDispose);};
      resource.addEventListener('dispose',onDispose);
    }
    return resource;
  }
  release(resource){if(resource&&!this.disposedResources.has(resource)){this.disposedResources.add(resource);this.ownedResources.delete(resource);resource.dispose();}}
  ownModel(gltf){gltf.scene.traverse(mesh=>{if(!mesh.isMesh)return;this.own(mesh.geometry);for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){this.own(material);for(const value of Object.values(material))if(value?.isTexture)this.own(value);}});return gltf;}
  async model(url) {
    this.assertOpen();
    if(!this.cache.has(url)){const source=assetUrl(url),transfer=beginAssetTransfer(source,'gltf');this.activeModelTransfers.add(source);const pending=this.loader.loadAsync(source,event=>updateAssetTransfer(transfer,event.loaded,event.lengthComputable?event.total:null)).then(gltf=>{finishAssetTransfer(transfer);this.activeModelTransfers.delete(source);this.ownModel(gltf);if(!this.modelsDisposed)this.modelSources.set(url,gltf);return gltf;},error=>{finishAssetTransfer(transfer,{failed:true});this.activeModelTransfers.delete(source);throw error;});this.cache.set(url,pending);pending.catch(()=>{if(this.cache.get(url)===pending)this.cache.delete(url);});}else if(this.modelSources.has(url))cachedAssetTransfer(assetUrl(url));return this.cache.get(url);
  }
  disposeModels(){
    if(this.modelsDisposed)return;this.modelsDisposed=true;
    // Also owns packed biome/village/wall prototypes and standalone textures,
    // including resources whose meshes never entered the rendered scene.
    for(const resource of this.ownedResources)this.release(resource);
    this.preparation.abort();this.transfers.release();this.activeModelTransfers.clear();this.loadedTextureKeys.clear();this.releaseLoadingImageDecoder();this.ownedResources.clear();this.modelSources.clear();this.cache.clear();
  }
  async building(descriptor){
    this.assertOpen();const key='building:'+descriptor.url;
    if(!this.cache.has(key)){
      const pending=this.model(descriptor.url).then(gltf=>{this.assertOpen();return this.asyncTextureImages?prepareNativeBuildingAsync(gltf,descriptor,{signal:this.preparation.signal}):prepareNativeBuilding(gltf,descriptor);});
      this.cache.set(key,pending);
      pending.catch(()=>{if(this.cache.get(key)===pending)this.cache.delete(key);});
    }
    return this.cache.get(key);
  }
  async texture(url,color=false) {
    this.assertOpen();const key=url+color;
    if(!this.cache.has(key)){const bitmapPath=this.asyncTextureImages&&typeof Worker!=='undefined'&&typeof createImageBitmap==='function',load=bitmapPath?this.loadingTexture(url):this.textures.loadAsync(assetUrl(url));const pending=load.then(async texture=>{if(color)texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;if(this.asyncTextureImages&&!bitmapPath){try{await prepareLoadingImage(texture,{cancelled:()=>this.modelsDisposed,onDiagnostic:this.loadingDiagnostics});}catch(error){this.release(texture);throw error;}}const owned=this.own(texture);if(!this.modelsDisposed)this.loadedTextureKeys.add(key);return owned;});this.cache.set(key,pending);pending.catch(()=>{if(this.cache.get(key)===pending)this.cache.delete(key);});}
    if(this.loadedTextureKeys.has(key))cachedAssetTransfer(assetUrl(url));
    return this.cache.get(key);
  }
  releaseLoadingImageDecoder(){if(this.loadingImageDecoder)this.loadingImageDecodeStats={...this.loadingImageDecoder.stats};this.loadingImageDecoder?.dispose();this.loadingImageDecoder=null;}
  async loadingTexture(url,{flipY=false,premultiplyAlpha=false}={}){
    this.assertOpen();const buffer=await bytes(url,{signal:this.preparation.signal});this.assertOpen();
    this.loadingImageDecoder??=new LoadingImageDecoder({signal:this.preparation.signal});
    let bitmap;try{bitmap=await this.loadingImageDecoder.decode(buffer,'',{flipY,premultiplyAlpha});}catch(error){
      if(!error.unsupported)throw error;
      // Older Worker implementations retain the native synchronous-image path.
      const texture=await this.textures.loadAsync(assetUrl(url));texture.flipY=flipY;texture.premultiplyAlpha=premultiplyAlpha;try{if(!flipY&&!premultiplyAlpha)await prepareLoadingImage(texture,{cancelled:()=>this.modelsDisposed,onDiagnostic:this.loadingDiagnostics});return texture;}catch(failure){this.release(texture);throw failure;}
    }
    if(this.modelsDisposed){bitmap.close();throw Error('Loading image decode cancelled');}
    const texture=ownLoadingBitmap(new THREE.Texture(),bitmap);texture.flipY=flipY;texture.premultiplyAlpha=premultiplyAlpha;return texture;
  }
  async biome(pack) {
    this.assertOpen();
    const [buffer,entries]=await Promise.all([bytes(pack.binary.url),Promise.all(pack.textures.map(async t=>[t.role,await this.texture(t.base64.url,t.role==='baseColor')]))]),textures=Object.fromEntries(entries);this.assertOpen();
    const preparedTangents=this.asyncTextureImages?await prepareBiomeTangentsAsync(buffer,pack.assets,{signal:this.preparation.signal}):null;this.assertOpen();
    let preparationFrame=performance.now();
    const types={'<f4':Float32Array,'<u2':Uint16Array,'<u4':Uint32Array};
    const attribute=desc=>new types[desc.type](buffer,desc.offset,desc.count);
    const result=[];for(const [index,a] of pack.assets.entries()){const levels=[];for(const [level,lod] of a.lods.entries()){
      const geometry=this.own(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.BufferAttribute(attribute(lod.position),3));geometry.setAttribute('normal',new THREE.BufferAttribute(attribute(lod.normal),3));geometry.setAttribute('uv',new THREE.BufferAttribute(attribute(lod.uv),2));geometry.setIndex(new THREE.BufferAttribute(attribute(lod.index),1));geometry.computeBoundingSphere();
      geometry.setAttribute('tangent',new THREE.BufferAttribute(preparedTangents?.[index][level]??computeTangents(geometry.attributes.position.array,geometry.attributes.normal.array,geometry.attributes.uv.array,geometry.index.array),4));geometry.computeBoundingBox();
      levels.push(geometry);
      if(this.asyncTextureImages&&performance.now()-preparationFrame>=4){await new Promise(resolve=>requestAnimationFrame(resolve));this.assertOpen();preparationFrame=performance.now();}
    }const material=this.own(nativeAssetMaterial(pack,a,index,textures,levels[0].boundingBox));result.push(levels.map(geometry=>new THREE.Mesh(geometry,material)));}return result;
  }
  async village(payload) {
    this.assertOpen();
    const buffer=await bytes(payload.binary.url),vertices=new Float32Array(buffer,0,payload.vertexBytes/4),index=new Uint32Array(buffer,payload.vertexBytes,payload.indexCount);
    const interleaved=new THREE.InterleavedBuffer(vertices,8),map=await this.texture(payload.textures.color,true);
    this.assertOpen();const material=this.own(new THREE.MeshStandardMaterial({map,roughness:.95,metalness:0,side:THREE.DoubleSide}));
    material.userData.artSurface=5;material.userData.artBounds={min:new THREE.Vector3(),size:new THREE.Vector3(1,1,1),crown:.43};
    return payload.units.map(unit=>{
      const geometry=this.own(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(interleaved,3,0));geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(interleaved,3,3));geometry.setAttribute('uv',new THREE.InterleavedBufferAttribute(interleaved,2,6));geometry.setIndex(new THREE.BufferAttribute(index,1));geometry.setDrawRange(unit.offset,unit.count);
      // Units borrow the complete village buffer; drawRange does not constrain
      // Three's automatic bounds. Use the authored unit envelope for both passes.
      geometry.boundingBox=new THREE.Box3(new THREE.Vector3().fromArray(unit.min),new THREE.Vector3().fromArray(unit.max));
      geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
      const mesh=new THREE.Mesh(geometry,material);mesh.userData.unit=unit;mesh.castShadow=mesh.receiveShadow=true;return mesh;
    });
  }
  async walls(pack) {
    this.assertOpen();
    const map=await this.texture(pack.texture,true);this.assertOpen();const material=this.own(new THREE.MeshStandardMaterial({map,roughness:.95,metalness:0,side:THREE.DoubleSide})),result={};
    await Promise.all(Object.entries(pack.pieces).map(async([key,piece])=>{
      const [positions,normals,uv,index,faceRegions]=await Promise.all([piece.p,piece.n,piece.uv,piece.i,piece.faceRegions].map(p=>bytes(p.url)));
      const morph=Object.fromEntries(await Promise.all(Object.entries(piece.morph).map(async([dest,bridge])=>{
        const [p,n]=await Promise.all([bytes(bridge.p.url),bytes(bridge.n.url)]);return [dest,{peers:bridge.peers,p:new Float32Array(p),n:new Float32Array(n)}];
      })));
      this.assertOpen();const geometry=this.own(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(positions),3));geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(normals),3));geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(uv),2));geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(index),1));geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,material);mesh.userData.nativePiece={p:new Float32Array(positions),n:new Float32Array(normals),uv:new Float32Array(uv),i:new Uint16Array(index),faceRegions:new Uint16Array(faceRegions),regions:piece.regions,morph};mesh.castShadow=mesh.receiveShadow=true;result[key]=mesh;
    }));return result;
  }
}
