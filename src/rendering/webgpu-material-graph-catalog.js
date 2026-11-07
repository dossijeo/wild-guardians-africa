import {attribute,materialReference,mix,vec4} from 'three/tsl';
import {webGpuTextureBinding} from './webgpu-texture-binding.js';
import {AdditiveBlending,BackSide,DoubleSide,FrontSide} from 'three';

// Recipes define graph identity only. Three still chooses its own render
// pipeline from material state, vertex layout, target and device bindings.
// Three r180 may generate shader-side wrapping for unfiltered sampling, so the
// texture sampling policy remains part of this conservative graph key.
const characters=new Map(),structures=new Map();
const characterDynamic=Object.freeze(['map','color','_wgTextureBlend']);
const structureDynamic=Object.freeze(['map','_wgTextureBlend']);
const waterDynamic=Object.freeze(['clock','palette','offset','environment.day','environment.dark','environment.night','environment.light','environment.blend']);
const beastDynamic=Object.freeze(['diffuseColor','night','sun']);
const guardianDynamic=Object.freeze(['diffuseColor','opacity','night','sun','tint','glow','reveal','dissolve','bottom','height']);
const inheritedPasses=Object.freeze({color:'composed-node',depth:'host-must-preserve-position-and-coverage',shadow:'host-must-preserve-position-and-coverage'});
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

// Palette and offset are per-material references; binding owners remain scoped
// by the caller and clip selects a separate state, not a separate color graph.
export function waterColorRecipe({offset,palette,sun=null,shadowNode=null,globalSurface=false,biome=null,clip=false,reflection=false}={}){
 if(!Array.isArray(offset)||offset.length!==2||!offset.every(Number.isFinite)||!Array.isArray(palette)||palette.some(rgb=>!Array.isArray(rgb)||rgb.length!==3||!rgb.every(Number.isFinite))||sun!==null&&!sun?.isDirectionalLight||shadowNode!==null&&!shadowNode?.isShadowNode||typeof globalSurface!=='boolean'||typeof clip!=='boolean'||typeof reflection!=='boolean')throw TypeError('Invalid water color recipe');
 const structural=Object.freeze({family:'water-color',sunId:sun?.uuid??null,shadowId:shadowNode?.uuid??null,globalSurface,biome,reflection,clip,state:Object.freeze({side:DoubleSide,alphaTest:clip ? .35 : 0,toneMapped:false})});
 const graphKey=JSON.stringify([structural.family,structural.sunId,structural.shadowId,globalSurface,biome,reflection]);return Object.freeze({structural,dynamic:waterDynamic,passes:Object.freeze({color:clip?'chunk-clip':'water-color',depth:clip?'color-pass-chunk-clip':'color-pass',shadow:'fluid-mesh-does-not-cast',reflection:'fluid-excluded'}),graphKey,key:JSON.stringify([graphKey,clip])});
}

export function lavaColorRecipe({offset,palette,clip=false}={}){
 if(!Array.isArray(offset)||offset.length!==2||!offset.every(Number.isFinite)||!Array.isArray(palette)||palette.some(rgb=>!Array.isArray(rgb)||rgb.length!==3||!rgb.every(Number.isFinite))||typeof clip!=='boolean')throw TypeError('Invalid lava color recipe');
 const structural=Object.freeze({family:'lava-color',clip,state:Object.freeze({side:DoubleSide,alphaTest:clip ? .35 : 0,toneMapped:false})}),graphKey=JSON.stringify([structural.family]);return Object.freeze({structural,dynamic:Object.freeze(['clock','palette','offset']),passes:Object.freeze({color:clip?'chunk-clip':'lava-color',depth:clip?'color-pass-chunk-clip':'color-pass',shadow:'fluid-mesh-does-not-cast',reflection:'fluid-excluded'}),graphKey,key:JSON.stringify([graphKey,clip])});
}

export function beastToonRecipe({fur=false,shadow=false}={}){
 if(typeof fur!=='boolean'||typeof shadow!=='boolean')throw TypeError('Invalid beast toon recipe');const structural=Object.freeze({family:'beast-toon',fur,shadow,attributes:Object.freeze(fur?['wgFurLight:float']:[])});return Object.freeze({structural,dynamic:beastDynamic,passes:inheritedPasses,key:JSON.stringify([structural.family,fur,shadow])});
}

const guardianState=Object.freeze({transparent:true,depthWrite:true,forceSinglePass:true,toneMapped:false});
const guardianRecipe=Object.freeze({structural:Object.freeze({family:'guardian-surface',state:guardianState}),dynamic:guardianDynamic,passes:Object.freeze({color:'guardian-alpha-test',depth:'color-pass-alpha-test',shadow:'guardian-mesh-does-not-cast'}),key:JSON.stringify(['guardian-surface',guardianState])});
export function guardianSurfaceRecipe(){return guardianRecipe;}

const spriteState=Object.freeze({transparent:true,depthWrite:false,side:DoubleSide,toneMapped:false});
const spriteDynamic=Object.freeze(['instanceData','atlasContents','eye','right','up','particle','lightPositions','lightColors']);
const spriteAttributes=Object.freeze(['aCorner:vec2','iPos:vec3','iSize:vec2','iAngle:float','iRect:vec4','iNext:vec4','iColor:vec4','iParams:vec4','iDirection:vec3']);
const spriteGraphs=new WeakMap();
export function vfxSpriteRecipe(atlas){if(!atlas?.isTexture)throw TypeError('Invalid VFX atlas');const shape=textureStructure(atlas),structural=Object.freeze({family:'vfx-sprites',atlasId:atlas.uuid,texture:shape,state:spriteState,attributes:spriteAttributes}),key=JSON.stringify([structural.family,atlas.uuid,...textureKey(shape),spriteState]);return Object.freeze({structural,sampler:Object.freeze({anisotropy:atlas.anisotropy}),dynamic:spriteDynamic,passes:inheritedPasses,key});}
export function catalogVfxSpriteGraph(atlas,build){if(typeof build!=='function')throw TypeError('Invalid VFX graph builder');const recipe=vfxSpriteRecipe(atlas);let byRecipe=spriteGraphs.get(atlas);if(!byRecipe){byRecipe=new Map();spriteGraphs.set(atlas,byRecipe);}let graph=byRecipe.get(recipe.key);if(!graph){graph=build(recipe);if(!graph?.vertexNode?.isNode||!graph?.outputNode?.isNode)throw TypeError('Invalid VFX sprite graph');byRecipe.set(recipe.key,graph);}return graph;}

const vfxPassDefinitions=Object.freeze({
 geometry:Object.freeze({state:Object.freeze({transparent:true,depthWrite:false,side:DoubleSide,toneMapped:false}),vertex:'geometry',attributes:Object.freeze(['position','normal','color','vfxKind'])}),
 blessing:Object.freeze({state:Object.freeze({transparent:true,depthWrite:false,blending:AdditiveBlending,toneMapped:false,side:DoubleSide}),vertex:'billboard',attributes:Object.freeze(['aCorner','aBase','aSource'])}),
 guardianRibbon:Object.freeze({state:Object.freeze({transparent:true,depthWrite:false,side:DoubleSide,forceSinglePass:true,blending:AdditiveBlending,toneMapped:false}),vertex:'ribbon-position',attributes:Object.freeze(['position','uv'])}),
 guardianMote:Object.freeze({state:Object.freeze({transparent:true,depthWrite:false,blending:AdditiveBlending,toneMapped:false}),vertex:'mote-billboard',attributes:Object.freeze(['position','uv','wgSeed'])}),
 guardianBeam:Object.freeze({state:Object.freeze({color:0xffcf79,transparent:true,opacity:0,depthWrite:false,blending:AdditiveBlending,toneMapped:false}),vertex:'geometry',attributes:Object.freeze(['position'])}),
 debris:Object.freeze({state:Object.freeze({side:DoubleSide,toneMapped:false}),vertex:'debris',attributes:Object.freeze(['position','normal','aOffset','aRotation','aScale','aColor'])}),
 smoke:Object.freeze({state:Object.freeze({transparent:true,depthWrite:false,side:DoubleSide,toneMapped:false}),vertex:'billboard',attributes:Object.freeze(['aCorner','aPosSize','aInfo','aColor'])})
});
export function vfxPassRecipe(kind){const definition=vfxPassDefinitions[kind];if(!definition)throw TypeError('Invalid VFX pass recipe');const structural=Object.freeze({family:'vfx-'+kind,...definition});return Object.freeze({structural,dynamic:Object.freeze(['instanceData','clock','camera']),passes:Object.freeze({color:'vfx-node',depth:definition.state.depthWrite===false?'no-depth-write':'color-depth-write',shadow:'mesh-does-not-cast'}),key:JSON.stringify(structural)});}

const structureWaitState=Object.freeze({transparent:true,depthWrite:false,side:DoubleSide,toneMapped:false});
const structureWaitStructural=Object.freeze({family:'structure-wait-indicator',state:structureWaitState,attributes:Object.freeze(['position','normal','uv','instanceMatrix'])});
const structureWaitRecipe=Object.freeze({structural:structureWaitStructural,dynamic:Object.freeze(['color','opacity','instanceMatrix']),passes:Object.freeze({color:'mesh-basic-instanced',depth:'no-depth-write',shadow:'mesh-does-not-cast'}),key:JSON.stringify(structureWaitStructural)});
export function structureWaitIndicatorRecipe(){return structureWaitRecipe;}

const auxiliaryPassDefinitions=Object.freeze({
 hiz:Object.freeze({state:Object.freeze({toneMapped:false,depthTest:false,depthWrite:false}),passes:Object.freeze({color:'depth-min-reduction',depth:'no-depth-test-or-write',shadow:'quad-does-not-cast'})}),
 ripple:Object.freeze({state:Object.freeze({transparent:true,depthWrite:false,side:DoubleSide}),passes:Object.freeze({color:'alpha-attribute',depth:'no-depth-write',shadow:'mesh-does-not-cast'})}),
 wallFragments:Object.freeze({state:Object.freeze({roughness:.92,metalness:0,side:DoubleSide}),passes:Object.freeze({color:'mesh-standard-instanced',depth:'standard-instanced',shadow:'standard-instanced'})})
});
export function auxiliaryPassRecipe(kind){const definition=auxiliaryPassDefinitions[kind];if(!definition)throw TypeError('Invalid auxiliary pass recipe');const structural=Object.freeze({family:'auxiliary-'+kind,state:definition.state});return Object.freeze({structural,dynamic:Object.freeze(['geometry','instanceData']),passes:definition.passes,key:JSON.stringify(structural)});}

// Source materials retain their own graph and bindings. Source identity is
// deliberately part of the recipe: treating different authored graphs as
// compatible would allow an incorrect material or pipeline to be reused.
export function authoredDeformationRecipe(kind,source){
 if(!['crop','crop-bridge','center-destruction'].includes(kind)||!source?.isMaterial)throw TypeError('Invalid authored deformation recipe');
 const bridge=kind==='crop-bridge',crop=kind==='crop',state=Object.freeze(kind==='center-destruction'?{}:{metalness:0,roughness:.91,roughnessMap:null,metalnessMap:null,side:FrontSide,...(bridge?{transparent:false,opacity:1,depthWrite:true,alphaTest:0}:{})}),structural=Object.freeze({family:kind,sourceId:source.uuid,sourceVersion:source.version,nodeMaterial:!!source.isNodeMaterial,state});
 const passes=Object.freeze({color:kind==='center-destruction'?'source-position-and-hole-mask':bridge?'source-bridge-position':'source-growth-position',depth:kind==='center-destruction'?'color-pass-hole-mask':'color-pass',shadow:kind==='center-destruction'?'mesh-does-not-cast':bridge?'three-override-position':'three-override-position-and-conventional-cutout'});
 return Object.freeze({structural,dynamic:Object.freeze(crop?['growth','clock']:bridge?['bridge','clock']:['damage','holes','noise']),passes,key:JSON.stringify(structural)});
}

const terrainState=Object.freeze({vertexColors:true,side:DoubleSide,toneMapped:false});
const terrainDynamic=Object.freeze(['vertexColor','shadowVisibility']);
export function vertexTerrainRecipe({shadows=false}={}){if(typeof shadows!=='boolean')throw TypeError('Invalid terrain recipe');const structural=Object.freeze({family:'vertex-terrain',shadows,state:terrainState,attributes:Object.freeze(['position','color'])});return Object.freeze({structural,dynamic:terrainDynamic,passes:Object.freeze({color:'terrain-color',depth:'color-pass',shadow:'terrain-mesh-does-not-cast'}),key:JSON.stringify([structural.family,shadows,terrainState])});}
export function loadingBackdropRecipe(){const structural=Object.freeze({family:'loading-backdrop',state:Object.freeze({transparent:true,depthWrite:false,side:BackSide,toneMapped:false,alphaTest:.01}),attributes:Object.freeze(['position','uv','backdropHeight'])});return Object.freeze({structural,dynamic:Object.freeze(['texture','tint']),passes:Object.freeze({color:'loading-backdrop',depth:'no-depth-write',shadow:'mesh-does-not-cast'}),key:JSON.stringify(structural)});}
export function loadingMistRecipe(){const structural=Object.freeze({family:'loading-mist',state:Object.freeze({transparent:true,depthWrite:false,depthTest:true,toneMapped:false}),attributes:Object.freeze(['position'])});return Object.freeze({structural,dynamic:Object.freeze(['clock','night','camera']),passes:Object.freeze({color:'loading-mist',depth:'no-depth-write',shadow:'mesh-does-not-cast'}),key:JSON.stringify(structural)});}
export function loadingSoilRecipe(){const structural=Object.freeze({family:'loading-soil',state:Object.freeze({roughness:1,metalness:0,transparent:true,depthWrite:true,alphaTest:.01}),attributes:Object.freeze(['position','normal','uv'])});return Object.freeze({structural,dynamic:Object.freeze(['texture']),passes:Object.freeze({color:'loading-soil',depth:'color-pass',shadow:'mesh-does-not-cast'}),key:JSON.stringify(structural)});}
export function loadingSparklesRecipe(){const structural=Object.freeze({family:'loading-sparkles',state:Object.freeze({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,blending:AdditiveBlending,alphaTest:.006}),attributes:Object.freeze(['position','uv','aSeed'])});return Object.freeze({structural,dynamic:Object.freeze(['clock','night','motion','camera']),passes:Object.freeze({color:'loading-sparkles',depth:'no-depth-write',shadow:'mesh-does-not-cast'}),key:JSON.stringify(structural)});}
export function mudSurfaceRecipe(){const structural=Object.freeze({family:'mangrove-mud',state:Object.freeze({side:FrontSide,roughness:.52,metalness:0}),attributes:Object.freeze(['position','normal','uv'])});return Object.freeze({structural,dynamic:Object.freeze(['map','normalMap','roughnessMap','aoMap','color']),passes:Object.freeze({color:'standard-lit',depth:'color-pass',shadow:'mesh-receives-only'}),key:JSON.stringify(structural)});}

// This provider embeds texture identities and tile constants into its graph;
// declaring them prevents treating a different atlas or light as equivalent.
export function mangroveGroundRecipe({textures,scale,normalBoost,light=null,shadowNode=null,shadows=false,environment=null}={}){
 if(!Array.isArray(textures)||textures.length!==3||textures.some(t=>!t?.isTexture)||!Number.isFinite(scale)||!Number.isFinite(normalBoost)||typeof shadows!=='boolean'||light!==null&&!light?.isDirectionalLight||shadowNode!==null&&!shadowNode?.isShadowNode||environment!==null&&(!environment.day?.isTextureNode||!environment.dark?.isTextureNode||!environment.blend?.isNode||!environment.night?.isNode))throw TypeError('Invalid mangrove ground recipe');
 const structural=Object.freeze({family:'mangrove-ground',textureIds:Object.freeze(textures.map(t=>t.uuid)),textures:Object.freeze(textures.map(textureStructure)),scale,normalBoost,lightId:light?.uuid??null,shadowId:shadowNode?.uuid??null,environmentIds:environment?Object.freeze([environment.day.uuid,environment.dark.uuid,environment.blend.uuid,environment.night.uuid]):null,shadows,state:Object.freeze({side:DoubleSide,toneMapped:false})});
 return Object.freeze({structural,dynamic:Object.freeze(['night','sunDirection','atlasContents','environmentContents','environmentBlend']),passes:Object.freeze({color:'mangrove-ground-output',depth:'color-pass',shadow:'terrain-mesh-does-not-cast'}),key:JSON.stringify(structural)});
}

export function volcanicGroundRecipe({relief,...options}={}){
 if(!Number.isFinite(relief))throw TypeError('Invalid volcanic ground relief');
 const base=mangroveGroundRecipe(options),structural=Object.freeze({...base.structural,family:'volcanic-ground',relief,attributes:Object.freeze(['position','normal'])});
 return Object.freeze({structural,dynamic:Object.freeze([...base.dynamic,'chunkMask','chunkOrigin']),passes:Object.freeze({color:'volcanic-ground-output',depth:'color-pass',shadow:'terrain-mesh-does-not-cast'}),key:JSON.stringify(structural)});
}

export function savannaGroundRecipe(options={}){
 const base=volcanicGroundRecipe(options),{scale,normalBoost,relief,...shared}=base.structural,structural=Object.freeze({...shared,family:'savanna-ground',state:Object.freeze({...base.structural.state,vertexColors:true}),attributes:Object.freeze(['position','normal','color'])});
 return Object.freeze({structural,dynamic:Object.freeze([...base.dynamic,'vertexColor','grassTint','coverageFloor','scale','normalBoost','relief']),passes:Object.freeze({...base.passes,color:'savanna-ground-output'}),key:JSON.stringify(structural)});
}

export function desertGroundRecipe({textures,scale,blend,normalBoost,jitter,light=null,shadowNode=null,shadows=false}={}){
 if(!Array.isArray(textures)||textures.length!==2||textures.some(t=>!t?.isTexture)||![scale,blend,normalBoost,jitter].every(Number.isFinite)||typeof shadows!=='boolean'||light!==null&&!light?.isDirectionalLight||shadowNode!==null&&(!shadows||!light||!shadowNode?.isShadowNode||shadowNode.light!==light))throw TypeError('Invalid desert ground recipe');
 const structural=Object.freeze({family:'desert-ground',textureIds:Object.freeze(textures.map(t=>t.uuid)),textures:Object.freeze(textures.map(textureStructure)),scale,blend,normalBoost,jitter,lightId:light?.uuid??null,shadowId:shadowNode?.uuid??null,shadows,state:Object.freeze({side:DoubleSide,toneMapped:false,vertexColors:true}),attributes:Object.freeze(['position','normal','color'])});
 return Object.freeze({structural,dynamic:Object.freeze(['night','sunDirection','atlasContents','chunkMask','chunkOrigin','seed']),passes:Object.freeze({color:'desert-ground-output',depth:'color-pass',shadow:'terrain-mesh-does-not-cast'}),key:JSON.stringify(structural)});
}

const bakedDynamic=Object.freeze(['phaseOffset','clockWeight','bind','inverse','duration','sampleRate','frames','lastSample']);
export function bakedWalkRecipe({texture,clock=false,phaseSource=false}={}){if(!texture?.isDataTexture||typeof clock!=='boolean'||typeof phaseSource!=='boolean')throw TypeError('Invalid baked walk recipe');const shape=textureStructure(texture),structural=Object.freeze({family:'baked-walk',textureId:texture.uuid,texture:shape,clock,phaseSource,attributes:Object.freeze(['skinIndex:uvec4','skinWeight:vec4'])});return Object.freeze({structural,dynamic:bakedDynamic,passes:inheritedPasses,key:JSON.stringify([structural.family,texture.uuid,...textureKey(shape),clock,phaseSource])});}

const biomeShadowGraphs=new Map(),biomeShadowDynamic=Object.freeze(['material.map','material.opacity','chunkBounds']);
export function biomeShadowRecipe({map=null,clip=false}={}){if(map!==null&&(!map?.isTexture||!Number.isInteger(map.channel)||map.channel<0||map.channel>1)||typeof clip!=='boolean'||!map&&!clip)throw TypeError('Invalid biome shadow recipe');const shape=map?textureStructure(map):null,structural=Object.freeze({family:'biome-shadow-coverage',texture:shape,clip,attributes:Object.freeze(clip?['wgChunkClip:vec4']:[])});return Object.freeze({structural,dynamic:biomeShadowDynamic,passes:Object.freeze({color:'source-material',depth:'three-override-position',shadow:'castShadowNode-coverage'}),key:JSON.stringify([structural.family,shape?textureKey(shape):null,clip])});}
export function catalogBiomeShadowGraph(options,build){if(typeof build!=='function')throw TypeError('Invalid biome shadow graph builder');const recipe=biomeShadowRecipe(options);let graph=biomeShadowGraphs.get(recipe.key);if(!graph){graph=build(recipe);if(!graph?.node?.isNode)throw TypeError('Invalid biome shadow graph');biomeShadowGraphs.set(recipe.key,graph);}return graph;}

const biomeDynamic=Object.freeze(['color','opacity','roughness','metalness','normalScale','map','normalMap','roughnessMap','metalnessMap']);
export function biomeSurfaceRecipe({instanceContract='native',clip=false,shadowCutout=false,side=FrontSide,map=null,normalMap=null,roughnessMap=null}={}){
 if(!['native','attributes'].includes(instanceContract)||typeof clip!=='boolean'||typeof shadowCutout!=='boolean'||![FrontSide,DoubleSide].includes(side)||[map,normalMap,roughnessMap].some(value=>value!==null&&!value?.isTexture))throw TypeError('Invalid biome surface recipe');
 const textures=Object.freeze([map,normalMap,roughnessMap].map(value=>value?textureStructure(value):null)),state=Object.freeze({side,alphaTest:.35}),structural=Object.freeze({family:'biome-surface',instanceContract,clip,shadowCutout,nodeMaterial:instanceContract==='attributes'||clip||shadowCutout,textures,state}),passes=Object.freeze({color:'mesh-standard',depth:'color-pass',shadow:shadowCutout?'catalog-cutout':map?'unsupported-alpha-map-without-cutout':'three-override-opaque'}),key=JSON.stringify([structural.family,instanceContract,clip,shadowCutout,side,textures.map(shape=>shape?textureKey(shape):null)]);
 return Object.freeze({structural,dynamic:biomeDynamic,passes,key});
}
