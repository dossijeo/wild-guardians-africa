import {reference,vec4} from 'three/tsl';

// Three's WebGPU shadow override does not copy a material's color map.
// Refer to the original mesh material so each draw binds its own map and
// opacity, while meshes with the same UV channel share one TSL graph.
// TextureNode selects the UV attribute from the texture's channel when the
// graph is built, so different channels must not share the same graph.
const graphs=new Map();
export function biomeShadowCutout(map){
 if(!map?.isTexture||!Number.isInteger(map.channel)||map.channel<0||map.channel>1)throw TypeError('Unsupported biome shadow color map');
 let graph=graphs.get(map.channel);
 if(!graph){const colorMap=reference('material.map','texture'),opacity=reference('material.opacity','float');graph={node:vec4(0,0,0,colorMap.a.mul(opacity)),colorMap,opacity};graphs.set(map.channel,graph);}
 return graph;
}
