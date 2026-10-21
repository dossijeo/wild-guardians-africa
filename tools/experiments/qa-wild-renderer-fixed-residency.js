import {nativeNearRegion} from '/src/rendering/horizon.js';
import {placeCamera} from './qa-savanna-camera-sweep.js';

// Isolated renderer workload, not a streaming benchmark. Both variants receive
// the same larger resident rectangle covering the entire camera sweep.
export async function installFixedResidency(world){
 if(world.state.biome!=='sabana')throw Error('Fixed-residency fixture currently supports Sabana only');
 const originalEye=world.camera.position.clone();
 const regions=[0,.5,1].map(t=>{placeCamera(world,t);return nativeNearRegion(world.camera.position,world.quality);});
 world.camera.position.copy(originalEye);
 const fixed=nativeNearRegion(originalEye,world.quality,3);
 if(regions.some(r=>r.cx-r.range<fixed.cx-fixed.range||r.cx+r.range>fixed.cx+fixed.range||r.cz-r.range<fixed.cz-fixed.range||r.cz+r.range>fixed.cz+fixed.range))
  throw Error('Fixed rectangle does not contain the camera sweep demand');
 // Sabana has no horizon mesh. Keep syncChunks and its normal visibility/prop
 // update path active, changing only the chosen residency rectangle.
 world.horizon.update=()=>fixed;
 world.streamPlanKey=null;world.syncChunks();await world.whenChunksReady();
 const keys=[...world.chunks.keys()].sort();
 world.qaFixedResidency={region:fixed,keys,created:world.chunkStream.stats.created};
 return world.qaFixedResidency;
}
