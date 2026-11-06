import {attribute,materialReference,mix} from 'three/tsl';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {DoubleSide,LinearFilter,LinearMipmapLinearFilter} from 'three';
import {webGpuTextureBinding} from './webgpu-texture-binding.js';
import {structureMaterialReplica} from './structure-material-replica.js';

// A graph belongs to a vertex layout, not a particular village or wall.
// Map and transition are read from each material, so changing appearance does
// not introduce a new TSL graph for every culture or construction material.
const graphs=new Map();
const replicas=new WeakMap();
export function webGpuStructureColorGraph(components){
 if(components!==3&&components!==4)throw TypeError('Invalid structure color layout');
 let graph=graphs.get(components);if(!graph){const map=materialReference('map','texture'),blend=materialReference('_wgTextureBlend','float'),color=attribute('color',components===4?'vec4':'vec3');graph=Object.freeze({map,blend,color:mix(components===4?color.rgb:color,map.rgb,blend)});graphs.set(components,graph);}return graph;
}
export function createWebGpuStructureColorMaterial(placeholder,components){
 if(!placeholder?.isTexture)throw TypeError('Invalid structure placeholder');
 // Match the sampler of the final THREE.Texture from the structure loader.
 // DataTexture defaults to nearest filtering and would otherwise change the
 // binding/pipeline layout when its real texture is installed.
 placeholder.magFilter=LinearFilter;placeholder.minFilter=LinearMipmapLinearFilter;placeholder.generateMipmaps=true;placeholder.needsUpdate=true;
 const material=new MeshStandardNodeMaterial({map:placeholder,roughness:.95,metalness:0,side:DoubleSide});material._wgTextureBlend=0;material.colorNode=webGpuStructureColorGraph(components).color;const record={items:new Set(),closed:false};replicas.set(material,record);
 Object.defineProperty(material,structureMaterialReplica,{value:replica=>{if(record.closed||!replica?.isMaterial)throw TypeError('Invalid structure material replica');record.items.add(replica);replica.map=material.map;replica._wgTextureBlend=material._wgTextureBlend;let active=true;return ()=>{if(active){active=false;record.items.delete(replica);}};}});
 material.addEventListener('dispose',()=>{record.closed=true;record.items.clear();});return material;
}
const textureProperties=['colorSpace','mapping','channel','wrapS','wrapT','wrapR','magFilter','minFilter','anisotropy'];
const textureLayout=texture=>JSON.stringify([...webGpuTextureBinding(texture),...textureProperties.map(key=>texture[key])]);
export function setWebGpuStructureColorTexture(material,texture){
 if(!material?.isNodeMaterial||!material.map?.isTexture||!texture?.isTexture)throw TypeError('Invalid structure texture');
 if(textureLayout(material.map)!==textureLayout(texture))throw Error('Structure texture binding mismatch');
 material.map=texture;for(const replica of replicas.get(material)?.items??[])replica.map=texture;
}
export function setWebGpuStructureColorBlend(material,value){
 if(!material?.isNodeMaterial||!Number.isFinite(value)||value<0||value>1)throw TypeError('Invalid structure texture blend');
 material._wgTextureBlend=value;for(const replica of replicas.get(material)?.items??[])replica._wgTextureBlend=value;
}
