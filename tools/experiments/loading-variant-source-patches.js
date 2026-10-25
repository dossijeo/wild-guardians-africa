// Rejected/unproven candidates are injected only by the QA browser harness.
function replaceOnce(source,anchor,replacement){
 if(source.split(anchor).length!==2)throw Error('Loading variant QA anchor changed: '+anchor);
 return source.replace(anchor,replacement);
}
export function patchGroundCandidate(source){
 source=replaceOnce(source,'(material.userData.biomeGround?groundMaterialFunctions+',
  '(material.userData.biomeGround?(material.userData.groundBiome?withoutLegacyGroundRecipe(groundMaterialFunctions,{biome:material.userData.groundBiome}):groundMaterialFunctions)+');
 source=replaceOnce(source,'material.customProgramCacheKey=()=>cache()+',"material.customProgramCacheKey=()=>cache()+'|ground-without-legacy-v1'+");
 return "import {withoutLegacyGroundRecipe} from '/tools/experiments/production-ground-source.js';\n"+source;
}
export function patchSharedSmoothCandidate(source){
 return replaceOnce(source,"material.customProgramCacheKey=()=>key+'|smooth-standby-v1';", "material.customProgramCacheKey=()=>key+'|native-partial-blend-v1';");
}
export function patchEligibleObstructionWarmup(source){
 return replaceOnce(source,'const sources=[...this.colors.values()].map(value=>value.mesh);\n    for(const chunk of chunks.values())for(const batch of chunk.userData.lodBatches??[])sources.push(...batch.levels);',
  `const eligible=new Set(),sources=[];
    for(const chunk of chunks.values())for(const batch of chunk.userData.lodBatches??[]){
      if(!batch.meshes.some(mesh=>!!mesh.geometry.attributes.nativeVisibility))continue;
      for(const level of batch.levels){eligible.add(level.material);sources.push(level);}
    }
    for(const value of this.colors.values())if(!chunks.size||eligible.has(value.mesh.material))sources.push(value.mesh);`);
}
export async function installLoadingVariantRoutes(page,{ground=false,sharedSmooth=false,eligibleWarmup=false}={}){
 for(const [enabled,path,patch] of [[ground,'african-toon',patchGroundCandidate],[sharedSmooth,'smooth-far-transitions',patchSharedSmoothCandidate],[eligibleWarmup,'asset-groups',patchEligibleObstructionWarmup]]){
  if(enabled)await page.route('**/src/rendering/'+path+'.js*',async route=>{
   const response=await route.fetch();await route.fulfill({response,body:patch(await response.text())});
  });
 }
}
