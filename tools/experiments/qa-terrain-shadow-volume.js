// QA-only second iteration. Reuse the resident terrain geometry in the existing
// directional shadow pass; no terrain/nav data or silhouettes are changed.
import {applyGroundShadeCoherence as applyFill} from './qa-ground-shadow-fill.js';
export function applyGroundShadeCoherence(world){
 const fill=applyFill(world);
 let triangles=0;
 for(const mesh of world.terrainMeshes){
  mesh.castShadow=true;
  triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
 }
 world.releaseNativeShadow.cache.invalidate();
 return {fill,terrainCasters:world.terrainMeshes.length,residentTerrainTriangles:triangles,newGeometry:0,newTextures:0,note:'Additional depth draws on shadow-cache misses; cost must be measured with moving camera/actors.'};
}
