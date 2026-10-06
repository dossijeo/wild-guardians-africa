import * as THREE from 'three';

// Mip selection affects alpha coverage as well as RGB. Both passes must sample
// the authored foliage atlas with the same bias before applying alphaTest.
export const surfaceMapBias=surface=>surface?.params?.[2]>.5?.65:0;
export function surfaceMapFragment(surface){
 return surfaceMapBias(surface)?THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','texture2D( map, vMapUv, .65 )'):THREE.ShaderChunk.map_fragment;
}
