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
export async function installLoadingVariantRoutes(page,{ground=false,sharedSmooth=false}={}){
 for(const [enabled,path,patch] of [[ground,'african-toon',patchGroundCandidate],[sharedSmooth,'smooth-far-transitions',patchSharedSmoothCandidate]]){
  if(enabled)await page.route('**/src/rendering/'+path+'.js*',async route=>{
   const response=await route.fetch();await route.fulfill({response,body:patch(await response.text())});
  });
 }
}
