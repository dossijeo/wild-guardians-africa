export async function installResidentMatrixRoute(page){
 await page.route('**/src/rendering/asset-groups.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const start='const matrix=new THREE.Matrix4();let offset=0;';
  const end='g.mesh.boundingBox=null;g.mesh.boundingSphere=null;g.stamp=stamp;stats.uploads++;';
  const retire='const g=cache.get(key);g.mesh.removeFromParent();';
  if(![start,end,retire].every(s=>body.includes(s)))throw Error('Resident matrices anchor missing');
  body="import {residentMatrixPack,disposeResidentMatrices} from '/tools/experiments/qa-resident-matrices.js';\n"+body;
  body=body.replace(start,"if(this.qaResidentMatrices&&pass==='color'){residentMatrixPack(this,g,entries,stats);}else{"+start);
  body=body.replace(end,'}'+end);
  body=body.replace(retire,'const g=cache.get(key);disposeResidentMatrices(g);g.mesh.removeFromParent();');
  await route.fulfill({response,body});
 });
}
