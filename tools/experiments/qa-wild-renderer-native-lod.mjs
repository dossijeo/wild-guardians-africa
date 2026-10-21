export async function installNativeLod(page){
 await page.route('**/src/rendering/asset-lod.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const original='nativeLodBins(batch.instances,batch.prototype,batch.group,eye,quality,batch.meshes.length)';
  if(!body.includes(original))throw Error('Native LOD QA anchor missing');
  body=body.replace(original,`(globalThis.qaCampaignWorld?.assetGroups?.qaWildRenderer?.nativeLod?globalThis.qaCampaignWorld.assetGroups.qaWildRenderer.nativeLodBins(batch,group,eye,quality):${original})`);
  await route.fulfill({response,body});
 });
}
