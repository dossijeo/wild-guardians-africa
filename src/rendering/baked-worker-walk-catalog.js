import {assetUrl} from './asset-url.js';
import {createBakedWalkBank} from './baked-walk-catalog.js';
import {createBakedWorkerWalkTexture,createBakedWorkerRunTexture,createBakedWorkerHarvestTexture,createBakedWorkerIdleTexture,createBakedWorkerAlertTexture,createBakedWorkerWaterTexture,createBakedWorkerPlantTexture,createBakedWorkerCarryTexture} from './webgpu-baked-walk.js';
import {hasBakedWorkerWalk} from './baked-worker-walk-profiles.js';
export {BAKED_WORKER_WALK_PROFILES,hasBakedWorkerWalk} from './baked-worker-walk-profiles.js';

// A worker bake is tied to the verified preview used by the progressive bank.
// Profiles without an authored/validated bake always keep their CPU rig.
export async function loadBakedWorkerWalkAsset(profile,{signal,fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle,clip='Walk_Skip'}={}){
 if(!hasBakedWorkerWalk(profile)||!['Walk_Skip','Run','Harvest','Idle','Water','Plant','Carry_Crate','Alert'].includes(clip)||typeof fetcher!=='function'||typeof subtle?.digest!=='function')throw TypeError('Invalid baked worker walking request');
 if(signal?.aborted)throw new DOMException('Worker walking request cancelled','AbortError');
 const root=assetUrl(`/content/${clip==='Run'?'gpu-worker-run':clip==='Harvest'?'gpu-worker-harvest':clip==='Idle'?'gpu-worker-idle':clip==='Alert'?'gpu-worker-alert':clip==='Water'?'gpu-worker-water':clip==='Plant'?'gpu-worker-plant':clip==='Carry_Crate'?'gpu-worker-carry':'gpu-worker-walk'}/${profile}/walking`),[metaResponse,dataResponse,packageResponse]=await Promise.all([fetcher(root+'.json',{signal}),fetcher(root+'.bin',{signal}),fetcher(assetUrl(`/content/character-preview/${profile}/package.json`),{signal})]);
 if(!metaResponse.ok||!dataResponse.ok||!packageResponse.ok)throw Error('Baked worker walking asset unavailable');
 const [meta,buffer,packageInfo]=await Promise.all([metaResponse.json(),dataResponse.arrayBuffer(),packageResponse.json()]);if(signal?.aborted)throw new DOMException('Worker walking request cancelled','AbortError');
 if(meta?.species!==profile||meta.clip!==clip||packageInfo?.id!==profile||meta.sourceSha256!==packageInfo.preview?.sha256||!/^[a-f0-9]{64}$/.test(meta.sha256??'')||meta.validation?.exactMismatches!==0||meta.validation?.packedMismatches!==0||meta.validation?.visibleAttachments!==0)throw Error('Baked worker walking source mismatch');
 const digest=Array.from(new Uint8Array(await subtle.digest('SHA-256',buffer)),value=>value.toString(16).padStart(2,'0')).join('');if(signal?.aborted)throw new DOMException('Worker walking request cancelled','AbortError');if(digest!==meta.sha256)throw Error('Baked worker walking checksum mismatch');return clip==='Run'?createBakedWorkerRunTexture(meta,buffer):clip==='Harvest'?createBakedWorkerHarvestTexture(meta,buffer):clip==='Idle'?createBakedWorkerIdleTexture(meta,buffer):clip==='Alert'?createBakedWorkerAlertTexture(meta,buffer):clip==='Water'?createBakedWorkerWaterTexture(meta,buffer):clip==='Plant'?createBakedWorkerPlantTexture(meta,buffer):clip==='Carry_Crate'?createBakedWorkerCarryTexture(meta,buffer):createBakedWorkerWalkTexture(meta,buffer);
}
export function createBakedWorkerWalkBank({load=loadBakedWorkerWalkAsset,renderer=null,resourceRegistry=null}={}){return createBakedWalkBank({load,renderer,resourceRegistry,acceptSpecies:hasBakedWorkerWalk});}
export function createBakedWorkerRunBank({load=loadBakedWorkerWalkAsset,renderer=null,resourceRegistry=null}={}){return createBakedWalkBank({load:(profile,options)=>load(profile,{...options,clip:'Run'}),renderer,resourceRegistry,acceptSpecies:hasBakedWorkerWalk});}
export function createBakedWorkerHarvestBank({load=loadBakedWorkerWalkAsset,renderer=null,resourceRegistry=null}={}){return createBakedWalkBank({load:(profile,options)=>load(profile,{...options,clip:'Harvest'}),renderer,resourceRegistry,acceptSpecies:hasBakedWorkerWalk});}
export function createBakedWorkerIdleBank({load=loadBakedWorkerWalkAsset,renderer=null,resourceRegistry=null}={}){return createBakedWalkBank({load:(profile,options)=>load(profile,{...options,clip:'Idle'}),renderer,resourceRegistry,acceptSpecies:hasBakedWorkerWalk});}
export function createBakedWorkerAlertBank({load=loadBakedWorkerWalkAsset,renderer=null,resourceRegistry=null}={}){return createBakedWalkBank({load:(profile,options)=>load(profile,{...options,clip:'Alert'}),renderer,resourceRegistry,acceptSpecies:hasBakedWorkerWalk});}
export function createBakedWorkerWaterBank({load=loadBakedWorkerWalkAsset,renderer=null,resourceRegistry=null}={}){return createBakedWalkBank({load:(profile,options)=>load(profile,{...options,clip:'Water'}),renderer,resourceRegistry,acceptSpecies:hasBakedWorkerWalk});}

export function createBakedWorkerPlantBank({load=loadBakedWorkerWalkAsset,renderer=null,resourceRegistry=null}={}){return createBakedWalkBank({load:(profile,options)=>load(profile,{...options,clip:'Plant'}),renderer,resourceRegistry,acceptSpecies:hasBakedWorkerWalk});}

export function createBakedWorkerCarryBank({load=loadBakedWorkerWalkAsset,renderer=null,resourceRegistry=null}={}){return createBakedWalkBank({load:(profile,options)=>load(profile,{...options,clip:'Carry_Crate'}),renderer,resourceRegistry,acceptSpecies:hasBakedWorkerWalk});}
