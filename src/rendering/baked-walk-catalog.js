import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {assetUrl} from './asset-url.js';
import {createBakedWalkTexture} from './webgpu-baked-walk.js';

// Only called by the graphical owner. A bake is accepted for the exact source
// asset and bytes for which it was authored; no model download is needed here.
export async function loadBakedWalkAsset(species,{signal,fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
 if(!Object.hasOwn(ANIMAL_ACTIONS.animals,species)||typeof fetcher!=='function'||typeof subtle?.digest!=='function')throw TypeError('Invalid baked walking request');
 if(signal?.aborted)throw new DOMException('Baked walking request cancelled','AbortError');
 const root=assetUrl(`/content/gpu-walk/${species}/walking`),[metadataResponse,dataResponse]=await Promise.all([fetcher(root+'.json',{signal}),fetcher(root+'.bin',{signal})]);
 if(!metadataResponse.ok||!dataResponse.ok)throw Error('Baked walking asset unavailable: '+species);
 const [meta,buffer]=await Promise.all([metadataResponse.json(),dataResponse.arrayBuffer()]);if(signal?.aborted)throw new DOMException('Baked walking request cancelled','AbortError');
 const sourceHash=/^\/assets\/([a-f0-9]{64})\.glb$/.exec(ANIMAL_ACTIONS.animals[species].url)?.[1];
 if(!sourceHash||meta?.species!==species||meta.sourceSha256!==sourceHash||!/^[a-f0-9]{64}$/.test(meta.sha256??'')||meta.validation?.exactMismatches!==0||meta.validation?.packedMismatches!==0)throw Error('Baked walking source mismatch: '+species);
 const digest=Array.from(new Uint8Array(await subtle.digest('SHA-256',buffer)),value=>value.toString(16).padStart(2,'0')).join('');if(signal?.aborted)throw new DOMException('Baked walking request cancelled','AbortError');
 if(digest!==meta.sha256)throw Error('Baked walking checksum mismatch: '+species);
 return createBakedWalkTexture(meta,buffer);
}
