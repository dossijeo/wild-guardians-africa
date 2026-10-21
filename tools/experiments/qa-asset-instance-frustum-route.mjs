// Diagnostic source interception only; production NativeAssetGroups stays intact.
export async function installInstanceFrustumRoute(page){
 await page.route('**/src/rendering/asset-groups.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchors=["const stamp=(pass==='color'",'const matrix=new THREE.Matrix4();let offset=0;','matrix.elements[12]-=this.origin.x;'];
  if(!anchors.every(a=>body.includes(a)))throw Error('Instance frustum QA anchor missing');
  body=body.replace(anchors[0],"const stamp=(pass==='color'&&this.qaInstanceCull?this.vp.elements.join(',')+'|':'')+(pass==='color'");
  body=body.replace(anchors[1],"const matrix=new THREE.Matrix4(),qaSphere=new THREE.Sphere();if(!source.geometry.boundingSphere)source.geometry.computeBoundingSphere();let offset=0;");
  body=body.replace(anchors[2],"if(pass==='color'&&this.qaInstanceCull){qaSphere.copy(source.geometry.boundingSphere).applyMatrix4(matrix);qaSphere.radius+=2.5;if(!this.frustum.intersectsSphere(qaSphere))continue;}"+anchors[2]);
  const write='matrix.toArray(g.mesh.instanceMatrix.array,offset*16);';
  const upload="g.mesh.count=offset;g.mesh.instanceMatrix.needsUpdate=true;if(pass==='color')g.mesh.geometry.attributes.nativeVisibility.needsUpdate=true;";
  if(!body.includes(write)||!body.includes(upload))throw Error('Upload gate anchors missing');
  body=body.replace('let offset=0;','let offset=0,qaChanged=g.stamp===null;');
  body=body.replace(write,`if(this.qaCullUploadGate&&pass==='color'){
   const dst=g.mesh.instanceMatrix.array;for(let k=0;k<16;k++){const value=Math.fround(matrix.elements[k]);if(dst[offset*16+k]!==value)qaChanged=true;dst[offset*16+k]=value;}
   if(g.mesh.geometry.attributes.nativeVisibility.array[offset]!==Math.fround(e.mesh.geometry.attributes.nativeVisibility?.array[i]??1))qaChanged=true;
  }else{${write}}`);
  body=body.replace(upload,`const qaUpload=!(this.qaCullUploadGate&&pass==='color')||qaChanged||g.mesh.count!==offset;
   g.mesh.count=offset;if(qaUpload){g.mesh.instanceMatrix.needsUpdate=true;if(pass==='color')g.mesh.geometry.attributes.nativeVisibility.needsUpdate=true;}`);
  body=body.replace('g.stamp=stamp;stats.uploads++;','g.stamp=stamp;if(qaUpload)stats.uploads++;');
  await route.fulfill({response,body});
 });
}
