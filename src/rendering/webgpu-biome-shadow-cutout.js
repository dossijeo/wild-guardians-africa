import {float,reference,vec4} from 'three/tsl';
import {chunkClipMask} from './webgpu-chunk-clip.js';
import {catalogBiomeShadowGraph} from './webgpu-material-graph-catalog.js';

// Three's WebGPU shadow override does not copy a material's color map.
// Refer to the original mesh material so each draw binds its own map and
// opacity, while meshes with the same UV channel share one TSL graph.
// TextureNode selects the UV attribute from the texture's channel when the
// graph is built, so different channels must not share the same graph.
export function biomeShadowCutout(map,{clip=false}={}){
 if(map!==null&&(!map?.isTexture||!Number.isInteger(map.channel)||map.channel<0||map.channel>1)||typeof clip!=='boolean'||!map&&!clip)throw TypeError('Unsupported biome shadow color map');
 return catalogBiomeShadowGraph({map,clip},recipe=>{const colorMap=map?reference('material.map','texture'):null,opacity=reference('material.opacity','float'),coverage=(colorMap?colorMap.a:float(1)).mul(opacity).mul(clip?chunkClipMask:1);return Object.freeze({node:vec4(0,0,0,coverage),colorMap,opacity,recipe});});
}
