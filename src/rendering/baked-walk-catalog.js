import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {assetUrl} from './asset-url.js';
import {createBakedWalkTexture} from './webgpu-baked-walk.js';
import {prepareWebGpuTexture} from './webgpu-texture-upload.js';

// Only called by the graphical owner. A bake is accepted for the exact source
// asset and bytes for which it was authored; no model download is needed here.
export async function loadBakedWalkAsset(species,{signal,fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
 if(!Object.hasOwn(ANIMAL_ACTIONS.animals,species)||typeof fetcher!=='function'||typeof subtle?.digest!=='function')throw TypeError('Invalid baked walking request');
 if(signal?.aborted)throw new DOMException('Baked walking request cancelled','AbortError');
 const root=assetUrl(`/content/gpu-walk/${species}/walking`),[metadataResponse,dataResponse]=await Promise.all([fetcher(root+'.json',{signal}),fetcher(root+'.bin',{signal})]);
 if(!metadataResponse.ok||!dataResponse.ok)throw Error('Baked walking asset unavailable: '+species);
 const [meta,buffer]=await Promise.all([metadataResponse.json(),dataResponse.arrayBuffer()]);if(signal?.aborted)throw new DOMException('Baked walking request cancelled','AbortError');
 const sourceHash=/^\/assets\/([a-f0-9]{64})\.glb$/.exec(ANIMAL_ACTIONS.animals[species].url)?.[1];
 if(!sourceHash||meta?.species!==species||meta.sourceSha256!==sourceHash||!/^[a-f0-9]{64}$/.test(meta.sha256??'')||!Array.isArray(meta.boneInverses)||meta.validation?.exactMismatches!==0||meta.validation?.packedMismatches!==0)throw Error('Baked walking source mismatch: '+species);
 const digest=Array.from(new Uint8Array(await subtle.digest('SHA-256',buffer)),value=>value.toString(16).padStart(2,'0')).join('');if(signal?.aborted)throw new DOMException('Baked walking request cancelled','AbortError');
 if(digest!==meta.sha256)throw Error('Baked walking checksum mismatch: '+species);
 return createBakedWalkTexture(meta,buffer);
}

let nextBakedWalkBank=0,nextDirectBake=0;
// Direct-load profile keeps its existing deferred-disposal owner.
export function ownDirectBakedWalkAsset(asset,resourceRegistry){
 if(!resourceRegistry)return asset;if(typeof resourceRegistry.adopt!=='function'||!asset?.texture?.isDataTexture||typeof asset.dispose!=='function')throw TypeError('Invalid direct baked resource');let lease;try{lease=resourceRegistry.adopt({namespace:'baked-walk',key:'direct:'+(++nextDirectBake),bytes:asset.texture.image?.data?.byteLength??null,dispose:()=>asset.dispose()});lease.commit();return {...asset,dispose:()=>lease.release()};}catch(error){if(lease)lease.release();else asset.dispose();throw error;}
}

// The graphical Worker owns one texture per species for its lifetime. Actors
// borrow it; their removal never disposes a texture used by another actor.
export function createBakedWalkBank({load=loadBakedWalkAsset,renderer=null,resourceRegistry=null,acceptSpecies=species=>Object.hasOwn(ANIMAL_ACTIONS.animals,species)}={}){
 if(resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function'||typeof load!=='function'||typeof acceptSpecies!=='function'||renderer!==null&&(!renderer?.backend?.isWebGPUBackend||typeof renderer.initTexture!=='function'||typeof renderer.backend.device?.queue?.onSubmittedWorkDone!=='function'))throw TypeError('Invalid baked walking bank');
 const entries=new Map(),controller=new AbortController(),bankId=++nextBakedWalkBank;let closed=false,disposed=false,nextLoad=0;
 function close(){if(closed)return;closed=true;controller.abort();}
 return {
  get(species){
   if(closed)return Promise.reject(Error('Baked walking bank disposed'));
   if(!acceptSpecies(species))return Promise.reject(TypeError('Unknown baked walking species'));
   let entry=entries.get(species);if(!entry){entry={asset:null,promise:null};entries.set(species,entry);entry.promise=Promise.resolve().then(()=>load(species,{signal:controller.signal})).then(async asset=>{if(!asset?.texture?.isDataTexture||renderer&&!asset.texture.isTexture||asset.meta?.species!==species||typeof asset.dispose!=='function'){asset?.dispose?.();throw TypeError('Invalid baked walking asset');}if(closed){asset.dispose();throw new DOMException('Baked walking bank disposed','AbortError');}let lease=null,released=false,uploadPending=false;const release=()=>{if(released)return;released=true;if(lease)lease.release();else asset.dispose();};entry.release=release;try{if(resourceRegistry)lease=resourceRegistry.adopt({namespace:'baked-walk',key:`${bankId}:${species}:${++nextLoad}`,bytes:asset.texture.image?.data?.byteLength??null,dispose:()=>asset.dispose()});if(renderer){uploadPending=true;await prepareWebGpuTexture({renderer,texture:asset.texture,signal:controller.signal,release});uploadPending=false;}if(closed){release();throw new DOMException('Baked walking bank disposed','AbortError');}lease?.commit();entry.asset=asset;return asset;}catch(error){if(!uploadPending)release();throw error;}}).catch(error=>{if(entries.get(species)===entry)entries.delete(species);throw error;});}return entry.promise;
  },
  status(){return {closed,species:[...entries].map(([species,entry])=>({species,ready:!!entry.asset}))};},
  close,
  dispose(){if(disposed)return;disposed=true;close();for(const entry of entries.values())if(entry.asset)entry.release();entries.clear();},
 };
}

// Close producers before capturing active compilations, so no new user can
// start using these textures after their deferred release has been scheduled.
export function closeBakedWalkResources({bank=null,workerBank=null,workerRunBank=null,bake=null,admission=null}={}){
 bank?.close();workerBank?.close();workerRunBank?.close();admission?.dispose();const release=()=>{bake?.dispose();bank?.dispose();workerBank?.dispose();workerRunBank?.dispose();};
 if(typeof admission?.deferCompilations==='function')admission.deferCompilations(release);else release();
}
