// QA only: retain color batches by resident chunk, independent of camera visibility.
export async function installPersistentAssetGroupsRoute(page,{traceUploads=false}={}){
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
  if(traceUploads){
   const trigger='if(stamp!==g.stamp){';
   if(!body.includes(trigger))throw Error('Upload trace anchor missing');
   body=body.replace(trigger,`const qaParts={
    membership:entries.map(e=>e.batch.uid+':'+e.level+':'+e.mesh.count).join('|'),
    matrix:entries.map(e=>e.mesh.instanceMatrix.version).join('|'),
    visibility:entries.map(e=>e.mesh.geometry.attributes.nativeVisibility?.version??0).join('|'),
    transform:entries.map(e=>e.group.matrixWorld.elements.join(',')).join('|')
   };
   if(stamp!==g.stamp){
    const all=this.qaUploadReasons??=( {color:{},shadow:{}} ),counts=all[pass];
    counts.total=(counts.total??0)+1;
    if(!g.qaPrevious){counts.fresh=(counts.fresh??0)+1;}
    else{for(const k of Object.keys(qaParts))if(qaParts[k]!==g.qaPrevious[k])counts[k]=(counts[k]??0)+1;
     if(qaParts.membership===g.qaPrevious.membership&&qaParts.matrix===g.qaPrevious.matrix&&qaParts.transform===g.qaPrevious.transform&&qaParts.visibility!==g.qaPrevious.visibility)counts.visibilityOnly=(counts.visibilityOnly??0)+1;
    }
    g.qaPrevious=qaParts;`);
  }
  await route.fulfill({response,body});
 });
}
