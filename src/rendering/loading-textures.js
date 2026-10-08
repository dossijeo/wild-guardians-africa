import {loadingYieldBudget} from './loading-yield-budget.js';
// Upload only textures referenced by resident native materials and their compiled
// uniforms. Reuse their exact objects/settings; do not clone or resize assets.
export async function initializeLoadingTextures(renderer,scene,{frameBudget=0,now=()=>performance.now(),cancelled=()=>false,nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),onTexture=()=>{}}={}){
 const yieldWork=loadingYieldBudget({frameBudget,now,nextFrame});
 const textures=new Set(),materials=new Set();
 const collect=value=>{if(value?.isTexture&&!value.isRenderTargetTexture&&!value.isVideoTexture)textures.add(value);else if(Array.isArray(value))value.forEach(collect);};
 scene.traverse(object=>{for(const material of [object.material,object.customDepthMaterial,object.customDistanceMaterial].flat().filter(Boolean))materials.add(material);});
 for(const material of materials){const properties=renderer.properties.get(material),program=properties.currentProgram;if(!program)continue;for(const uniform of program.getUniforms().seq){collect(material[uniform.id]);collect(properties.uniforms?.[uniform.id]?.value);}}
 let completed=0;
 for(const texture of textures){if(cancelled()||renderer.getContext().isContextLost())throw Error('Loading texture upload cancelled');renderer.initTexture(texture);onTexture(++completed,textures.size,texture);await yieldWork();}
 return {textures:completed};
}
