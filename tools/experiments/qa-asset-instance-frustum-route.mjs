// Diagnostic source interception only; production NativeAssetGroups stays intact.
export async function installInstanceFrustumRoute(page){
 await page.route('**/src/rendering/asset-groups.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchors=["const stamp=(pass==='color'",'const matrix=new THREE.Matrix4();let offset=0;','matrix.elements[12]-=this.origin.x;'];
  if(!anchors.every(a=>body.includes(a)))throw Error('Instance frustum QA anchor missing');
  body=body.replace(anchors[0],"const stamp=(pass==='color'&&this.qaInstanceCull?this.vp.elements.join(',')+'|':'')+(pass==='color'");
  body=body.replace(anchors[1],"const matrix=new THREE.Matrix4(),qaSphere=new THREE.Sphere();if(!source.geometry.boundingSphere)source.geometry.computeBoundingSphere();let offset=0;");
  body=body.replace(anchors[2],"if(pass==='color'&&this.qaInstanceCull){qaSphere.copy(source.geometry.boundingSphere).applyMatrix4(matrix);qaSphere.radius+=2.5;if(!this.frustum.intersectsSphere(qaSphere))continue;}"+anchors[2]);
  await route.fulfill({response,body});
 });
}
