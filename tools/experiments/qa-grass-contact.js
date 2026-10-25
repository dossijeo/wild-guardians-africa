import {applyMaterialStudy as applyGrass} from './qa-grass-biomes.js';
export async function applyMaterialStudy(world){
 const info=await applyGrass(world);
 if(!['sabana','gran-rio','gran-canon'].includes(world.state.biome))return info;
 world.groundDetails.mesh.castShadow=true;
 world.releaseNativeShadow.cache.invalidate();
 return {...info,castShadow:true,shadowGeometry:'Same closed Blender instanced leaves; no extra map'};
}
