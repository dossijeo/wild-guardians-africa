// QA-only invalidation of derived coverage and shadow buffers.
export async function installLodGate(page){
 await page.route('**/src/rendering/asset-lod.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const replace=(a,b)=>{if(!body.includes(a))throw Error('LOD gate anchor missing: '+a);body=body.replace(a,b);};
  replace('if(batch.key!==key){','if(batch.key!==key){let qaOrdersChanged=false;');
  replace('dummy??=new THREE.Object3D();','qaOrdersChanged=true;dummy??=new THREE.Object3D();');
  replace('packLodCoverage(batch);updateAssetShadow(batch);batch.key=key;',`if(qaOrdersChanged||batch.qaCoverageVersion!==(batch.fade?.attribute.version??-1)){
    packLodCoverage(batch);batch.qaCoverageVersion=batch.fade?.attribute.version??-1;
   }
   if(qaOrdersChanged)updateAssetShadow(batch);batch.key=key;`);
  await route.fulfill({response,body});
 });
}
