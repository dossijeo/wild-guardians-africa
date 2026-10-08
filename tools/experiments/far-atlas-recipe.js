// Offline admission check: obsolete bakes must never overwrite reviewed assets.
export function validateFarAtlasRecipe(day,night,reference,sunPosition){
 if(!reference)throw Error('Missing reviewed atlas reference');
 for(const [phase,bake] of [['day',day],['night',night]]){
  if(bake.errors?.length||bake.webglError)throw Error('Bake errors');
  if(bake.bakedPhase!==phase)throw Error('Wrong baked phase');
  if(bake.nativeSunDirection!==true||JSON.stringify(bake.sunPosition)!==JSON.stringify(sunPosition))throw Error('Obsolete atlas sun: rebake with the native fixed light');
  for(const key of ['slot','species','views','rotationViews','atlasWidth','atlasHeight','bakedLod','elevationDegrees','localBase','impostorWidth','impostorHeight','sourceBounds','baseV']){
   if(JSON.stringify(bake[key])!==JSON.stringify(reference[key]))throw Error(`Atlas frame differs from reviewed reference: ${key}`);
  }
  if(bake.prelitAlphaEncoding!==reference.prelitAlphaEncoding)throw Error('Atlas alpha recipe differs from reviewed reference');
 }
}
