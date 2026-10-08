// QA only. Borrow actual resident textures, including hidden worker tools.
// This avoids geometry draws/uploads; a single texture upload can still block.
import {waitForGpuPreload} from '../../src/rendering/screen-preload.js';
export function residentMaterialTextures(scene){
 const textures=new Set();
 const add=value=>{if(value?.isTexture&&!value.isRenderTargetTexture)textures.add(value);else if(Array.isArray(value))for(const item of value)add(item);};
 scene.traverse(object=>{
  for(const material of [object.material].flat().filter(Boolean)){
   for(const value of Object.values(material))add(value);
   for(const uniform of Object.values(material.uniforms??{}))add(uniform?.value);
  }
 });
 return [...textures];
}

export async function prepareResidentTextures(world,{nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),fence=waitForGpuPreload,now=()=>performance.now()}={}){
 const started=now(),check=()=>{if(world.disposed||world.loading.signal.aborted)throw Error('Resident texture preparation cancelled');};
 check();const textures=residentMaterialTextures(world.scene),uploads=[];
 for(const texture of textures){
  // Yield before every potentially expensive upload. This spreads different
  // textures across frames, not the work inside one texture's native upload.
  await nextFrame();check();const before=now();world.renderer.initTexture(texture);uploads.push({name:texture.name,elapsedMs:now()-before});
 }
 check();await fence(world.renderer,{cancelled:()=>world.disposed||world.loading.signal.aborted,nextFrame});check();
 return {elapsedMs:now()-started,textures:textures.length,uploads,fenced:true,scope:'QA only: resident material texture initialization and completion fence, no geometry/depth/shadow readiness; ownership remains with world. Individual uploads can block.'};
}
