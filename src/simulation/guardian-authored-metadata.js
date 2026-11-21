import {BIOME_IDS} from '../world/biome-ids.js';
import {assetUrl} from '../rendering/asset-url.js';

// Metadata only: loading the GLB or biome geometry is never necessary.
export async function loadGuardianAuthoredMetadata(biome,{fetcher=fetch}={}){
 const id=BIOME_IDS[biome];if(!id||typeof fetcher!=='function')throw TypeError('Invalid guardian biome');
 const urls=['/content/models.json','/content/crop-stage-heights.json',`/content/biome-${id}.json`],responses=await Promise.all(urls.map(url=>fetcher(assetUrl(url))));const failed=responses.findIndex(response=>!response.ok);if(failed!==-1)throw Error(`Guardian metadata fetch failed: ${urls[failed]} (${responses[failed].status??'unknown'})`);
 const [catalogue,crops,pack]=await Promise.all(responses.map(response=>response.json())),source=catalogue.find(item=>item.source?.includes('Cultivos'))?.url,match=/^(?:\/)?assets\/(?:web\/)?([a-f0-9]{64})\.glb$/.exec(source??'');
 const cropSource=/^(?:\/)?assets\/(?:web\/)?([a-f0-9]{64})\.glb$/.exec(crops?.source??'');
 if(crops?.version!==1||!match||!cropSource||cropSource[1]!==match[1]||crops.sourceSha256!==match[1]||!crops.heights||typeof crops.heights!=='object'||!Array.isArray(pack?.assets)||pack.biomeId!==id)throw Error('Guardian authored metadata mismatch');
 const assets=pack.assets.map(asset=>({min:asset.min,max:asset.max}));
 if(assets.some(asset=>!Array.isArray(asset.min)||asset.min.length!==3||!Array.isArray(asset.max)||asset.max.length!==3||![...asset.min,...asset.max].every(Number.isFinite)))throw Error('Guardian biome bounds unavailable');
 return {assets,cropHeights:crops.heights};
}
