import {loadingYieldBudget} from './loading-yield-budget.js';
// Upload only textures referenced by resident native materials and their compiled
// uniforms. Empty instanced batches have no drawable vertices in any pass;
// compilation may still reference their samplers, but does not make a texture
// upload necessary for initial visible readiness. Shared samplers are collected
// through any other nonempty object. Never clone or resize native assets.
export async function initializeLoadingTextures(renderer,scene,{frameBudget=0,now=()=>performance.now(),signal,cancelled=()=>false,nextFrame,onTexture=()=>{}}={}){
 const yieldWork=loadingYieldBudget({frameBudget,now,nextFrame,signal,cancelled});
 const textures=new Set(),materials=new Set();
 const collect=value=>{if(value?.isTexture&&!value.isRenderTargetTexture&&!value.isVideoTexture)textures.add(value);else if(Array.isArray(value))value.forEach(collect);};
 scene.traverse(object=>{if(object.isInstancedMesh&&object.count===0)return;for(const material of [object.material,object.customDepthMaterial,object.customDistanceMaterial].flat().filter(Boolean))materials.add(material);});
 for(const material of materials){const properties=renderer.properties.get(material),program=properties.currentProgram;if(!program)continue;for(const uniform of program.getUniforms().seq){collect(material[uniform.id]);collect(properties.uniforms?.[uniform.id]?.value);}}
 let completed=0;
 for(const texture of textures){if(cancelled()||renderer.getContext().isContextLost())throw Error('Loading texture upload cancelled');renderer.initTexture(texture);onTexture(++completed,textures.size,texture);await yieldWork();}
 return {textures:completed};
}
