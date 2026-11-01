import {loadingYieldBudget} from './loading-yield-budget.js';
// Upload only textures referenced by resident native materials and their compiled
// uniforms. Empty instanced batches have no drawable vertices in any pass;
// compilation may still reference their samplers, but does not make a texture
// upload necessary for initial visible readiness. Shared samplers are collected
// through any other nonempty object. Never clone or resize native assets.
export async function initializeLoadingTextures(renderer,scene,{frameBudget=0,now=()=>performance.now(),signal,cancelled=()=>false,nextFrame,onTexture=()=>{},onSubmit,cpuBudget=false,getFrame}={}){
 const yieldWork=loadingYieldBudget({frameBudget,now,nextFrame,signal,cancelled,cpuBudget,getFrame});
 const check=()=>{if(signal?.aborted||cancelled()||renderer.getContext().isContextLost())throw Error('Loading texture upload cancelled');};
 check();
 const textures=new Set(),materials=new Set();
 const collect=value=>{if(value?.isTexture&&!value.isRenderTargetTexture&&!value.isVideoTexture)textures.add(value);else if(Array.isArray(value))value.forEach(collect);};
 scene.traverse(object=>{if(object.isInstancedMesh&&object.count===0)return;for(const material of [object.material,object.customDepthMaterial,object.customDistanceMaterial].flat().filter(Boolean))materials.add(material);});
 for(const material of materials){const properties=renderer.properties.get(material),program=properties.currentProgram;if(!program)continue;for(const uniform of program.getUniforms().seq){collect(material[uniform.id]);collect(properties.uniforms?.[uniform.id]?.value);}}
 if(onSubmit){
  const large=[];for(const material of materials)for(const [slot,value] of Object.entries(material))if(value?.isTexture&&(value.image?.width>=2048||value.image?.height>=2048)){const properties=renderer.properties.get(material);large.push({material:material.name??'',slot,name:value.name??'',width:value.image?.width??null,height:value.image?.height??null,selected:textures.has(value),currentProgram:!!properties.currentProgram,programCount:properties.programs?.size??0});}
  try{onSubmit({label:'loading-texture-large-candidates',start:now(),end:now(),duration:0,large});}catch{}
 }
 let completed=0;
 for(const texture of textures){check();const start=cpuBudget||onSubmit?now():0;renderer.initTexture(texture);const end=cpuBudget||onSubmit?now():0;if(cpuBudget)yieldWork.recordWork(end-start);if(onSubmit&&(end-start>=50||texture.image?.width>=4096||texture.image?.height>=4096))try{onSubmit({label:'loading-texture-upload-submit',start,end,duration:end-start,name:texture.name??'',width:texture.image?.width??null,height:texture.image?.height??null,scope:'Synchronous native texture initialization; may include driver work and waits.'});}catch{}check();onTexture(++completed,textures.size,texture);await yieldWork();}
 return {textures:completed};
}
