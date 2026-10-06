import {createBiomeBackdrop} from './biome-backdrop.js';
import {TextureLoader} from 'three';
import {assetUrl} from './asset-url.js';
import {json} from './assets.js';
import {attachNativeFarWorld} from '../../tools/experiments/attach-native-far-world.js';

// Each species owns its billboard batch; textures are baked offline. Native
// chunks, navigation, buildings and gameplay remain the source of truth.
export async function attachBiomeFarVegetation(world,{start=60,end=90,...options}={}){
 if(world.farVegetation)throw Error('Far vegetation already attached');
 const manifest=await json('/content/far-vegetation.json',{signal:world.loading.signal}),species=manifest.biomes[world.nav.config.biome];
 if(!species?.length)throw Error('Missing biome impostors');
 const loader=new TextureLoader(),textures=[],adapters=[];
 const load=async path=>{if(world.disposed||world.loading.signal.aborted)throw Error('Far vegetation attachment cancelled');const texture=await loader.loadAsync(assetUrl(path.replace(/^\.\//,'')));textures.push(texture);return texture;};
 let backdrop=null;
 const previousCompaction=world.assetGroups.omitZeroColor;
 try{
  const results=await Promise.allSettled(species.map(async metadata=>({metadata,day:await load(metadata.day),night:await load(metadata.night)})));
  const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
  if(world.disposed||world.loading.signal.aborted)throw Error('Far vegetation attachment cancelled');
  const groundTreeBases=Object.fromEntries(species.map(s=>[s.slot,s.localBase]));
  for(const result of results){const {metadata,day,night}=result.value;
   adapters.push(await attachNativeFarWorld(world,{...options,metadata,texture:day,prelitAtlas:{day,night,rotations:8,views:8,resolution:128},slot:metadata.slot,ownsWorld:false,bakedOnly:true,groundStep:16,groundTreeBases,includeGround:metadata.slot===0&&!['canyons','desert'].includes(world.nav.config.biome),start,end}));
  }
  const backdropTexture=await load('assets/far-vegetation/'+world.nav.config.biome+'-backdrop.webp');
  if(world.disposed||world.loading.signal.aborted)throw Error('Far vegetation attachment cancelled');
  backdrop=createBiomeBackdrop(world,backdropTexture);
  let disposed=false;
  const composite={enabled:true,adapters,stats:{species:species.length,textureBytes:species.length*2*1024*1024*4*4/3,errors:[]},update(dt){
   if(disposed)return;world.assetGroups.omitZeroColor=this.enabled;backdrop.root.visible=this.enabled;backdrop.update();
   for(const adapter of adapters){adapter.enabled=this.enabled;adapter.update(dt);}
  },dispose(){if(disposed)return;disposed=true;backdrop.dispose();for(const adapter of adapters)adapter.dispose();for(const texture of textures)texture.dispose();world.assetGroups.omitZeroColor=previousCompaction;if(world.farVegetation===composite)world.farVegetation=null;}};
  world.farVegetation=composite;return composite;
 }catch(error){backdrop?.dispose();for(const adapter of adapters)adapter.dispose();for(const texture of textures)texture.dispose();world.assetGroups.omitZeroColor=previousCompaction;throw error;}
}
