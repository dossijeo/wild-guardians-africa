import {json} from './assets.js';
import {loadFarSceneData} from '../../tools/experiments/far-scene-loader.js';
import {nativeFarRegionRequest} from '../../tools/experiments/far-region-tracker.js';
import {loadingAwaitWitness,loadingSyncWitness} from './loading-sync-witness.js';

// Start only procedural data after the real home camera has been chosen.
// GPU roots, textures, ground seams and fences are still admitted later.
export function startInitialFarRegion(world,options={},services={}){
 const controller=new AbortController(),signal=world.loading.signal,center={x:world.camera.position.x,z:world.camera.position.z};
 const config=structuredClone(world.nav.config),profile=structuredClone(world.pack.profile);
 const loadManifest=services.loadManifest??json,loadRegion=services.loadRegion??loadFarSceneData;
 const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
 let descriptor,used=false;
 const manifest=Promise.resolve().then(()=>{if(controller.signal.aborted)throw new DOMException('Far scene load aborted','AbortError');return loadManifest('/content/far-vegetation.json',{signal:controller.signal});});
 const ready=Promise.resolve(manifest).then(payload=>{
  const species=payload.biomes[config.biome];if(!species?.length)throw Error('Missing biome impostors');
  const metadata=species[0],groundTreeBases=Object.fromEntries(species.map(s=>[s.slot,s.localBase]));
  const includeGround=(options.includeFarGround??true)&&metadata.slot===0&&!['canyons','desert'].includes(config.biome);
  descriptor={...nativeFarRegionRequest(config,profile,center,{groundStep:16,...options,metadata,slot:metadata.slot,groundTreeBases,includeGround,bakedOnly:true}),treesOnly:!includeGround};
  return loadingAwaitWitness(world.onLoadingSpan,'initial-far-region-worker',()=>loadRegion(descriptor,{signal:controller.signal}));
 }).finally(()=>signal.removeEventListener('abort',abort));
 // The request starts before its consumer exists. Observe failures now, but
 // retain the original rejection for the eventual owner/readiness boundary.
 Promise.resolve(manifest).catch(()=>{});ready.catch(()=>{});
 return {manifest,ready,cancel:abort,async take(request,{signal:requestSignal}={}){
  const cancel=()=>controller.abort();requestSignal?.addEventListener('abort',cancel,{once:true});if(requestSignal?.aborted)cancel();
  try{
   await manifest;
   if(requestSignal?.aborted||world.disposed||world.loading.signal.aborted)throw new DOMException('Far scene load aborted','AbortError');
   const match=!used&&descriptor&&JSON.stringify(request)===JSON.stringify(descriptor);
   if(!match){abort();return await loadingAwaitWitness(world.onLoadingSpan,'initial-far-region-fallback',()=>loadRegion(request,{signal:requestSignal}));}
   used=true;const result=await ready;
   if(requestSignal?.aborted||world.disposed||world.loading.signal.aborted)throw new DOMException('Far scene load aborted','AbortError');return loadingSyncWitness(world.onLoadingSpan,'initial-far-region-adopt',()=>result);
  }finally{requestSignal?.removeEventListener('abort',cancel);}
 }};
}
