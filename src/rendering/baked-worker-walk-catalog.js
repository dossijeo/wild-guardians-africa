import {assetUrl} from './asset-url.js';
import {createBakedWalkBank} from './baked-walk-catalog.js';
import {createBakedWorkerWalkTexture} from './webgpu-baked-walk.js';
import {hasBakedWorkerWalk} from './baked-worker-walk-profiles.js';
export {BAKED_WORKER_WALK_PROFILES,hasBakedWorkerWalk} from './baked-worker-walk-profiles.js';

// A worker bake is tied to the verified preview used by the progressive bank.
// Profiles without an authored/validated bake always keep their CPU rig.
export async function loadBakedWorkerWalkAsset(profile,{signal,fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
 if(!hasBakedWorkerWalk(profile)||typeof fetcher!=='function'||typeof subtle?.digest!=='function')throw TypeError('Invalid baked worker walking request');
 if(signal?.aborted)throw new DOMException('Worker walking request cancelled','AbortError');
 const root=assetUrl(`/content/gpu-worker-walk/${profile}/walking`),[metaResponse,dataResponse,packageResponse]=await Promise.all([fetcher(root+'.json',{signal}),fetcher(root+'.bin',{signal}),fetcher(assetUrl(`/content/character-preview/${profile}/package.json`),{signal})]);
 if(!metaResponse.ok||!dataResponse.ok||!packageResponse.ok)throw Error('Baked worker walking asset unavailable');
 const [meta,buffer,packageInfo]=await Promise.all([metaResponse.json(),dataResponse.arrayBuffer(),packageResponse.json()]);if(signal?.aborted)throw new DOMException('Worker walking request cancelled','AbortError');
 if(meta?.species!==profile||packageInfo?.id!==profile||meta.sourceSha256!==packageInfo.preview?.sha256||!/^[a-f0-9]{64}$/.test(meta.sha256??'')||meta.validation?.exactMismatches!==0||meta.validation?.packedMismatches!==0||meta.validation?.visibleAttachments!==0)throw Error('Baked worker walking source mismatch');
 const digest=Array.from(new Uint8Array(await subtle.digest('SHA-256',buffer)),value=>value.toString(16).padStart(2,'0')).join('');if(signal?.aborted)throw new DOMException('Worker walking request cancelled','AbortError');if(digest!==meta.sha256)throw Error('Baked worker walking checksum mismatch');return createBakedWorkerWalkTexture(meta,buffer);
}
export function createBakedWorkerWalkBank({load=loadBakedWorkerWalkAsset,renderer=null,resourceRegistry=null}={}){return createBakedWalkBank({load,renderer,resourceRegistry,acceptSpecies:hasBakedWorkerWalk});}
