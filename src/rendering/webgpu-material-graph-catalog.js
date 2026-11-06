import {attribute,materialReference,mix,vec4} from 'three/tsl';
import {webGpuTextureBinding} from './webgpu-texture-binding.js';

// Recipes define graph identity only. Three still chooses its own render
// pipeline from material state, vertex layout, target and device bindings.
// Three r180 may generate shader-side wrapping for unfiltered sampling, so the
// texture sampling policy remains part of this conservative graph key.
const characters=new Map(),structures=new Map();
const characterDynamic=Object.freeze(['map','color','_wgTextureBlend']);
const structureDynamic=Object.freeze(['map','_wgTextureBlend']);
const waterDynamic=Object.freeze(['clock','environment.day','environment.dark','environment.night','environment.light','environment.blend']);
const inheritedPasses=Object.freeze({color:'node',depth:'inherited-unverified',shadow:'inherited-unverified'});
function textureStructure(texture){return Object.freeze({binding:Object.freeze(webGpuTextureBinding(texture)),colorSpace:texture.colorSpace,mapping:texture.mapping,uvChannel:texture.channel,wrapS:texture.wrapS,wrapT:texture.wrapT,wrapR:texture.wrapR,magFilter:texture.magFilter,minFilter:texture.minFilter});}
function textureKey(value){return [...value.binding,value.colorSpace,value.mapping,value.uvChannel,value.wrapS,value.wrapT,value.wrapR,value.magFilter,value.minFilter];}

// These describe color-graph compatibility, not a complete WebGPU pipeline:
// the latter additionally depends on the material, geometry and render pass.
export function characterColorRecipe(texture){
 if(!texture?.isTexture)throw TypeError('Invalid character color texture');
 const structural=Object.freeze({family:'progressive-character-color',...textureStructure(texture),attributes:Object.freeze(['color:vec4','wgOriginalColor:vec4'])});
 const sampler=Object.freeze({anisotropy:texture.anisotropy});
 return Object.freeze({structural,sampler,dynamic:characterDynamic,passes:inheritedPasses,key:JSON.stringify([structural.family,...textureKey(structural)])});
}

export function structureColorRecipe(components,texture=null){
 if(components!==3&&components!==4)throw TypeError('Invalid structure color layout');if(texture!==null&&!texture?.isTexture)throw TypeError('Invalid structure color texture');const shape=texture?textureStructure(texture):null,structural=Object.freeze({family:'progressive-structure-color',colorComponents:components,texture:shape,attributes:Object.freeze([`color:vec${components}`])});
 return Object.freeze({structural,sampler:texture?Object.freeze({anisotropy:texture.anisotropy}):null,dynamic:structureDynamic,passes:inheritedPasses,key:JSON.stringify([structural.family,components,shape?textureKey(shape):null])});
}

export function progressiveCharacterColorGraph(texture){
 const {key}=characterColorRecipe(texture);let graph=characters.get(key);
 if(!graph){const preview=attribute('color','vec4'),original=attribute('wgOriginalColor','vec4'),sample=materialReference('map','texture'),blend=materialReference('_wgTextureBlend','float');graph=vec4(mix(preview.rgb,sample.rgb.mul(materialReference('color','color')).mul(original.rgb),blend),mix(preview.a,sample.a.mul(original.a),blend));characters.set(key,graph);}
 return graph;
}

export function structureColorGraph(components,texture=null){
 const {key}=structureColorRecipe(components,texture);let graph=structures.get(key);
 if(!graph){const map=materialReference('map','texture'),blend=materialReference('_wgTextureBlend','float'),color=attribute('color',components===4?'vec4':'vec3');graph=Object.freeze({map,blend,color:mix(components===4?color.rgb:color,map.rgb,blend)});structures.set(key,graph);}
 return graph;
}

// Palette and seed offset are still embedded constants in the existing water
// formula. Binding owners are scoped by its caller; clip selects a separate
// material/pass state while its underlying color graph may be shared.
export function waterColorRecipe({offset,palette,sun=null,shadowNode=null,globalSurface=false,biome=null,clip=false,reflection=false}={}){
 if(!Array.isArray(offset)||offset.length!==2||!offset.every(Number.isFinite)||!Array.isArray(palette)||palette.some(rgb=>!Array.isArray(rgb)||rgb.length!==3||!rgb.every(Number.isFinite))||sun!==null&&!sun?.isDirectionalLight||shadowNode!==null&&!shadowNode?.isShadowNode||typeof globalSurface!=='boolean'||typeof clip!=='boolean'||typeof reflection!=='boolean')throw TypeError('Invalid water color recipe');
 const structural=Object.freeze({family:'water-color',sunId:sun?.uuid??null,shadowId:shadowNode?.uuid??null,globalSurface,biome,reflection,clip,embeddedOffset:Object.freeze([...offset]),embeddedPalette:Object.freeze(palette.map(rgb=>Object.freeze([...rgb])))});
 const graphKey=JSON.stringify([structural.family,offset,palette,structural.sunId,structural.shadowId,globalSurface,biome,reflection]);return Object.freeze({structural,dynamic:waterDynamic,passes:inheritedPasses,graphKey,key:JSON.stringify([graphKey,clip])});
}

export function lavaColorRecipe({offset,palette,clip=false}={}){
 if(!Array.isArray(offset)||offset.length!==2||!offset.every(Number.isFinite)||!Array.isArray(palette)||palette.some(rgb=>!Array.isArray(rgb)||rgb.length!==3||!rgb.every(Number.isFinite))||typeof clip!=='boolean')throw TypeError('Invalid lava color recipe');
 const structural=Object.freeze({family:'lava-color',clip,embeddedOffset:Object.freeze([...offset]),embeddedPalette:Object.freeze(palette.map(rgb=>Object.freeze([...rgb])))}),graphKey=JSON.stringify([structural.family,offset,palette]);return Object.freeze({structural,dynamic:Object.freeze(['clock']),passes:inheritedPasses,graphKey,key:JSON.stringify([graphKey,clip])});
}
