import {validateTreeTransitionPolicy} from '../../tools/experiments/tree-transition-range.js';
import {releaseNativeFarGpuCache,registerNativeFarTextureOwner} from '../../tools/experiments/prepare-native-far-gpu.js';
import {createBiomeBackdrop} from './biome-backdrop.js';
import {TextureLoader} from 'three';
import {assetUrl} from './asset-url.js';
import {json} from './assets.js';
import {farAtmosphere} from './far-atmosphere.js';
import {farVegetationProfile} from './far-vegetation-profile.js';
import {attachNativeFarWorld} from '../../tools/experiments/attach-native-far-world.js';

// RGBA8 plus mip estimate from loaded dimensions; this is not driver RAM.
const textureStorageEstimate=(texture,width,height)=>{const image=texture.image;return (image?.width??width)*(image?.height??height)*4*4/3;};

// Baked resources are owned from the beginning of an asynchronous attachment.
// A world closed during fetch/preparation must release late arrivals as well.
export async function attachBiomeFarVegetation(world,{start=60,end=90,residentRange=null,visualRange=null,preserveTerrain=true,transitionMargin=8,includeFarGround=true,logicalStandbyPreload=false,...options}={},services={}){
 if(world.farVegetation)throw Error('Far vegetation already attached');
 const atmosphere=farAtmosphere(options);
 if(typeof logicalStandbyPreload!=='boolean')throw Error('Invalid logical standby option');
 if(typeof includeFarGround!=='boolean')throw Error('Invalid far ground option');
 if(options.qualityDriven!==undefined&&typeof options.qualityDriven!=='boolean')throw Error('Invalid far quality policy');
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||!Number.isFinite(transitionMargin)||transitionMargin<0||transitionMargin>24)throw Error('Invalid far transition distances');
 for(const radius of [residentRange,visualRange])if(radius!==null&&(!Number.isInteger(radius)||radius<1||radius>3))throw Error('Invalid far resident radius');
 if(visualRange!==null&&visualRange>(residentRange??(world.quality==='alta'?3:2)))throw Error('Visual radius exceeds terrain residency');
 const transitionHeight=validateTreeTransitionPolicy(options.transitionHeight,start,end);if(transitionHeight)options.transitionHeight=transitionHeight;const transitionEnd=Math.max(end,transitionHeight?.end??end);
 const loader=new TextureLoader(),loadManifest=services.loadManifest??json,loadTexture=services.loadTexture??(path=>loader.loadAsync(path)),attachSpecies=services.attachSpecies??attachNativeFarWorld,makeBackdrop=services.makeBackdrop??createBiomeBackdrop;
 const attachedSeed=world.state?.seed,ownership=new AbortController(),textures=new Set(),adapters=[],previousCompaction=world.assetGroups.omitZeroColor,previousFog=world.scene.fog,previousRange=world.farResidentRange,previousVisual=world.farVisualRange,previousPreserve=world.farPreserveTerrain,previousTransition=world.farPropTransitionDistance,previousSlots=world.farPropTransitionSlots;
 let closed=false,backdrop=null,owner;
 const cancelled=()=>closed||world.disposed||world.state?.seed!==attachedSeed||world.loading.signal.aborted;
 const release=()=>{if(closed)return;closed=true;ownership.abort();backdrop?.dispose();for(const adapter of adapters)adapter.dispose();adapters.length=0;releaseNativeFarGpuCache(world.renderer);for(const texture of textures)texture.dispose();textures.clear();world.assetGroups.omitZeroColor=previousCompaction;world.scene.fog=previousFog;world.farResidentRange=previousRange;world.farVisualRange=previousVisual;world.farPreserveTerrain=previousPreserve;world.farPropTransitionDistance=previousTransition;world.farPropTransitionSlots=previousSlots;if(world.farVegetation===owner)world.farVegetation=null;};
 owner={update(){},dispose:release};world.farVegetation=owner;
 const load=async path=>{if(cancelled())throw Error('Far vegetation attachment cancelled');const texture=await loadTexture(assetUrl(path.replace(/^\.\//,'')));registerNativeFarTextureOwner(texture,ownership.signal);if(cancelled()){texture.dispose();throw Error('Far vegetation attachment cancelled');}textures.add(texture);return texture;};
 try{
  const manifest=await loadManifest('/content/far-vegetation.json',{signal:world.loading.signal}),species=manifest.biomes[world.nav.config.biome];
  if(cancelled())throw Error('Far vegetation attachment cancelled');if(!species?.length)throw Error('Missing biome impostors');
  const results=await Promise.allSettled(species.map(async metadata=>({metadata,day:await load(metadata.day),night:await load(metadata.night)})));
  const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
  const transitionSlots=species.map(s=>s.slot);
  const groundTreeBases=Object.fromEntries(species.map(s=>[s.slot,s.localBase]));
  for(const result of results){if(cancelled())throw Error('Far vegetation attachment cancelled');const {metadata,day,night}=result.value;
   const adapter=await attachSpecies(world,{groundStep:16,densityStart:Math.max(end+30,180),densityEnd:280,densityMinimum:.04,fadeStart:280,fadeEnd:330,...options,logicalStandbyPreload,cancelled,metadata,texture:day,prelitAtlas:{day,night,rotations:8,views:8,resolution:128,premultipliedLinear:metadata.prelitAlphaEncoding==='srgb-encoded-linear-premultiplied'},slot:metadata.slot,ownsWorld:false,bakedOnly:true,groundTreeBases,includeGround:includeFarGround&&metadata.slot===0&&!['canyons','desert'].includes(world.nav.config.biome),start,end});
   if(cancelled()){adapter.dispose();throw Error('Far vegetation attachment cancelled');}adapters.push(adapter);
  }
  const backdropTexture=await load('assets/far-vegetation/'+world.nav.config.biome+'-backdrop.webp');
  backdrop=makeBackdrop(world,backdropTexture,{...atmosphere,mirrored:options.backdropMirrored,fogBaseMix:options.backdropFogBaseMix,nightTint:options.backdropNightTint,radius:options.backdropRadius,height:options.backdropHeight,parallax:options.backdropParallax,fogMix:options.backdropFogMix});
  owner={enabled:true,adapters,configureQuality(quality){
   if(closed||!options.qualityDriven)return false;
   const next=farVegetationProfile({quality,biome:world.nav.config.biome});
   // Quality changes only the small-tree band. The large-tree/prewarm extent
   // stays owned by the existing banks, so no atlas or geometry is reloaded.
   if(JSON.stringify(next.transitionHeight)!==JSON.stringify(transitionHeight)||next.end>transitionEnd)throw Error('Far quality policy exceeds prepared extent');
   if(adapters.some(adapter=>typeof adapter.configureTransition!=='function'))throw Error('Far quality adapter cannot update its transition');
   for(const adapter of adapters)adapter.configureTransition(next.start,next.end,transitionHeight);
   start=next.start;end=next.end;visualRange=next.visualRange;return true;
  },stats:{logicalStandbyPreload,species:species.length,estimatedAtlasTextureBytes:results.reduce((sum,{value:{metadata,day,night}})=>sum+textureStorageEstimate(day,metadata.atlasWidth??1024,metadata.atlasHeight??1024)+textureStorageEstimate(night,metadata.atlasWidth??1024,metadata.atlasHeight??1024),0),estimatedBackdropTextureBytes:textureStorageEstimate(backdropTexture,2048,512),errors:[]},update(dt){
   if(cancelled()){release();return;}world.farResidentRange=this.enabled&&residentRange!==null?residentRange:previousRange;world.farVisualRange=this.enabled&&visualRange!==null?visualRange:previousVisual;world.farPreserveTerrain=this.enabled&&visualRange!==null?preserveTerrain:previousPreserve;world.farPropTransitionDistance=this.enabled&&visualRange!==null&&preserveTerrain?transitionEnd+transitionMargin:previousTransition;world.farPropTransitionSlots=this.enabled&&visualRange!==null&&preserveTerrain?transitionSlots:previousSlots;world.assetGroups.omitZeroColor=this.enabled;backdrop.root.visible=this.enabled;backdrop.update();
   for(const adapter of adapters){adapter.enabled=this.enabled;adapter.update(dt);}
   if(!this.enabled)world.scene.fog=previousFog;
  },dispose:release};
  world.farVegetation=owner;return owner;
 }catch(error){release();throw error;}
}
