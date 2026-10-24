// QA only. A visibility-only change must not rewrite unchanged instance matrices.
export async function installSplitAssetUploadsRoute(page){
 await page.route('**/src/rendering/asset-groups.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const start='if(stamp!==g.stamp){';
  const matrix='matrix.fromArray(e.mesh.instanceMatrix.array,i*16).premultiply(e.group.matrixWorld);matrix.elements[12]-=this.origin.x;matrix.elements[14]-=this.origin.z;matrix.toArray(g.mesh.instanceMatrix.array,offset*16);';
  const upload='g.mesh.count=offset;g.mesh.instanceMatrix.needsUpdate=true;';
  if(![start,matrix,upload].every(s=>body.includes(s)))throw Error('Split uploads anchor missing');
  body=body.replace(start,`if(stamp!==g.stamp){
   const qaMatrixStamp=this.qaSplitUploads&&pass==='color'&&!this.omitZeroColor?entries.map(e=>e.batch.uid+':'+e.level+':'+e.mesh.count+':'+e.mesh.instanceMatrix.version+':'+e.group.matrixWorld.elements.join(',')).join('|'):null;
   const qaMatrixDirty=!this.qaSplitUploads||pass!=='color'||this.omitZeroColor||g.stamp===null||g.qaMatrixStamp!==qaMatrixStamp;
   g.qaMatrixStamp=qaMatrixStamp;
   if(!qaMatrixDirty)stats.skippedMatrixUploads=(stats.skippedMatrixUploads??0)+1;`);
  body=body.replace(matrix,'if(qaMatrixDirty){'+matrix+'}');
  body=body.replace(upload,'g.mesh.count=offset;if(qaMatrixDirty)g.mesh.instanceMatrix.needsUpdate=true;');
  await route.fulfill({response,body});
 });
}
