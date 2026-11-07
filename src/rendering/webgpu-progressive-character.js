import {normalizeGltfDataTextures,placeholderImageUri} from './webgpu-gltf-texture-semantics.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {openCharacterPreviewStream} from './character-preview-stream.js';
import {makeStableVertexMaterials} from './webgpu-stable-character-material.js';
import {registerNativeBc7Glb} from './native-bc7-glb.js';
import {releaseAfterWebGpuUploads,waitForWebGpuUploads} from './webgpu-texture-upload.js';
import {createPredecodedImageLoader} from './predecoded-image-loader.js';
import {createPreparsedBc7Loader} from './preparsed-bc7-loader.js';

const PIXEL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWP4////fwAJ+wP9CNHoHgAAAABJRU5ErkJggg==';
const aborted=()=>new DOMException('Character preparation cancelled','AbortError');

// A browser can expose createImageBitmap without permitting transfer. Keep
// the verified byte route available if decoding or transfer is unsupported.
export async function loadCharacterTextureData(stream,metadata,{signal}={}){
 if(stream.variant==='webp'&&typeof stream.loadBitmaps==='function')try{return {useBitmaps:true,data:await stream.loadBitmaps(metadata)};}catch(error){if(signal?.aborted||error?.name==='AbortError')throw error;}
 if(stream.variant==='bc7'&&typeof stream.loadCompressedTextures==='function')try{return {useBitmaps:false,useCompressed:true,data:await stream.loadCompressedTextures(metadata)};}catch(error){if(signal?.aborted||error?.name==='AbortError')throw error;}
 return {useBitmaps:false,data:await stream.loadTextures(metadata)};
}

// Reuses the validated package and stable material implementation from the
// WebGPU lab. Only the Worker can own this loader, its textures and renderer.
export async function openProgressiveWebGpuCharacter({renderer,packageUrl,species,signal,onTextured=()=>{},onError=()=>{},configureMaterial=()=>{},prepareObject=()=>{},materialVariant=null,shareCompatibleMaterials=false,onSelectableChange=()=>{},openStream=openCharacterPreviewStream,blendMs=350}={}){
 if(typeof document!=='undefined'||!renderer?.backend?.isWebGPUBackend||!packageUrl||typeof species!=='string'||typeof onTextured!=='function'||typeof onError!=='function'||typeof configureMaterial!=='function'||typeof prepareObject!=='function'||materialVariant!==null&&typeof materialVariant!=='function'||typeof shareCompatibleMaterials!=='boolean'||typeof onSelectableChange!=='function'||typeof openStream!=='function'||!Number.isFinite(blendMs)||blendMs<=0)throw TypeError('Invalid progressive character');
 const manager=new (await import('three')).LoadingManager(),lifetime=new AbortController(),cancel=()=>{manager.abort();lifetime.abort();},owned=new Set(),ownedBitmaps=new Set();let stream,stable,preview,ktx,bitmapLoader,bc7Loader,closed=false,transition=null,finalTextures=[],uploadPending=false;
 const check=()=>{if(closed||signal?.aborted)throw aborted();};
 const own=resource=>{if(!resource)return;if(closed){if(resource.isTexture&&typeof resource.source?.data?.close==='function')resource.source.data.close();resource.dispose();}else owned.add(resource);};
 const ownMaterial=material=>{if(!material)return;own(material);for(const value of Object.values(material))if(value?.isTexture)own(value);};
 const dispose=()=>{if(closed)return;closed=true;lifetime.abort();stable?.dispose();stream?.close();manager.abort();ktx?.dispose();bitmapLoader?.dispose();bc7Loader?.dispose();const resources=[...owned],images=new Set(ownedBitmaps);owned.clear();ownedBitmaps.clear();const release=()=>{for(const resource of resources){if(resource.isTexture&&typeof resource.source?.data?.close==='function')images.add(resource.source.data);resource.dispose();}for(const image of images)image.close();};if(uploadPending)void releaseAfterWebGpuUploads(renderer,release).catch(onError);else release();signal?.removeEventListener('abort',cancel);};
 signal?.addEventListener('abort',cancel,{once:true});
 try{
  check();const features=renderer.hasFeature('texture-compression-bc')?['texture-compression-bc']:[];stream=await openStream(packageUrl,{features,signal});if(stream.id!==species)throw Error('Character package species mismatch');
  const loader=new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder),metadata=await stream.loadMetadata();
  // The package contains native BC7 KTX2, not Basis payloads, so no runtime
  // transcoder or development-only /node_modules URL is needed.
  if(stream.variant==='bc7'){ktx=new KTX2Loader(manager).detectSupport(renderer);bc7Loader=createPreparsedBc7Loader(manager,ktx);registerNativeBc7Glb(loader,bc7Loader.loader);}
  preview=await loader.parseAsync((await stream.loadPreview()).buffer,new URL('.',new URL(packageUrl,globalThis.location.href)).href);
  preview.scene.traverse(o=>{if(o.isMesh){own(o.geometry);for(const material of Array.isArray(o.material)?o.material:[o.material])ownMaterial(material);}});check();
  const placeholder=structuredClone(metadata.materials);placeholder.images=placeholder.images.map((image,index)=>({...image,uri:placeholderImageUri(PIXEL,index)}));
  if(stream.variant==='bc7'){for(const entry of placeholder.textures){const ext=entry.extensions?.WG_native_ktx2;if(ext){entry.source=ext.source;delete entry.extensions.WG_native_ktx2;}}placeholder.extensionsUsed=(placeholder.extensionsUsed??[]).filter(name=>name!=='WG_native_ktx2');placeholder.extensionsRequired=(placeholder.extensionsRequired??[]).filter(name=>name!=='WG_native_ktx2');}
  const temp=await loader.parseAsync(JSON.stringify(placeholder),new URL('.',new URL(packageUrl,globalThis.location.href)).href);
  const temporaryMaterials=await Promise.all((placeholder.materials??[]).map((_,i)=>temp.parser.getDependency('material',i)));normalizeGltfDataTextures(temporaryMaterials,own);temporaryMaterials.forEach(ownMaterial);check();
  stable=await makeStableVertexMaterials(renderer,preview,temp,metadata.mapping,{shareCompatibleMaterials,materialVariant});if(closed||signal?.aborted)stable.dispose();check();const configured=new Set();preview.scene.traverse(object=>{if(!object.isMesh)return;prepareObject(object);for(const material of Array.isArray(object.material)?object.material:[object.material])if(!configured.has(material)){configureMaterial(material,object);configured.add(material);}});
  async function hydrate(){
   const urls=[];try{
    const {useBitmaps,useCompressed,data}=await loadCharacterTextureData(stream,metadata,{signal});if(useBitmaps){if(closed||signal?.aborted){for(const bitmap of data.values())bitmap.close();throw aborted();}for(const bitmap of data.values())ownedBitmaps.add(bitmap);bitmapLoader??=createPredecodedImageLoader(manager);}check();const full=structuredClone(metadata.materials);
    full.images.forEach((image,index)=>{const resource=data.get(metadata.texturePaths[index]);if(useBitmaps)image.uri=bitmapLoader.add(resource);else if(useCompressed)image.uri=bc7Loader.add(resource);else{const url=URL.createObjectURL(new Blob([resource],{type:stream.variant==='bc7'?'image/ktx2':'image/webp'}));urls.push(url);image.uri=url;}});
    const materials=await loader.parseAsync(JSON.stringify(full),new URL('.',new URL(packageUrl,globalThis.location.href)).href);
    const finalMaterials=await Promise.all((full.materials??[]).map((_,i)=>materials.parser.getDependency('material',i)));normalizeGltfDataTextures(finalMaterials,own);finalMaterials.forEach(ownMaterial);check();
    finalTextures=await stable.resolveFinal(materials);for(const texture of finalTextures)own(texture);check();
    for(const texture of finalTextures){uploadPending=true;renderer.initTexture(texture);await new Promise(resolve=>setTimeout(resolve,0));check();}
    await waitForWebGpuUploads(renderer,{signal:lifetime.signal});uploadPending=false;check();stable.apply({blend:0});onSelectableChange();transition={start:null};
   }catch(error){if(!closed&&!signal?.aborted)onError(error);}finally{urls.forEach(url=>URL.revokeObjectURL(url));}
  }
  return {preview,variant:stream.variant,start(){check();if(transition!==null)throw Error('Character hydration already started');transition={pending:true};void hydrate();},tick(now){if(!transition||transition.pending)return;if(!Number.isFinite(now))throw TypeError('Invalid presentation clock');if(transition.start===null)transition.start=now;const blend=Math.min(1,Math.max(0,(now-transition.start)/blendMs));stable.setBlend(blend);onSelectableChange();if(blend===1){transition={pending:true};onTextured();}},dispose};
 }catch(error){dispose();throw error;}
}
