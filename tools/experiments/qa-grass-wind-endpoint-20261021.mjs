export async function installGrassWindLod(page){
 await page.route('**/tools/experiments/qa-continuous-grass.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const edits=[['float bend=uCoverageRefined*.50','float bend=lod*uCoverageRefined*.50'],['N.y-=uCoverageRefined*uCoverageWindStrength','N.y-=lod*uCoverageRefined*uCoverageWindStrength']];
  for(const [a,b] of edits){if(!body.includes(a))throw Error('Wind LOD anchor missing');body=body.replace(a,b);}
  body=body.replace('float lod=1.-smoothstep(18.,24.,distanceToEye);','float lod=0.;');
  await route.fulfill({response,body});
 });
}
