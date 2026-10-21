// QA only: retain color batches by resident chunk, independent of camera visibility.
export async function installPersistentAssetGroupsRoute(page){
 await page.route('**/src/rendering/asset-groups.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const before="if(visible){add(colorEntries,batch.slot+':'+level,entry);stats.rawColorSlices++;}";
  const after="for(const [key,entries] of colorEntries)this.prepare(this.colors,key,entries,'color',stats);";
  if(!body.includes(before)||!body.includes(after))throw Error('Persistent groups QA anchors missing');
  body=body.replace(before,"if(visible||this.qaPersistentGroups){add(colorEntries,batch.slot+':'+level+(this.qaPersistentGroups?':chunk:'+key:''),entry);stats.rawColorSlices++;}");
  body=body.replace(after,`for(const [key,entries] of colorEntries){
   this.prepare(this.colors,key,entries,'color',stats);
   const mesh=this.colors.get(key).mesh;
   mesh.visible=!this.qaPersistentGroups||this.frustum.intersectsBox(nativeChunkBounds(entries[0].group));
  }`);
  await route.fulfill({response,body});
 });
}
