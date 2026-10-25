export async function installMangroveWarpRoute(page){
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='vec2 dx=dFdx(uv),dy=dFdy(uv);';
  if(!body.includes('if(uGroundPureMoss>.5)')||!body.includes(anchor)||body.indexOf(anchor)>body.indexOf('bool moss='))throw Error('Moss UV anchor missing');
  body=body.replace(anchor,'{vec3 wp=worldPatternPosition(worldP);uv+=vec2(materialNoise(vec3(wp.x*.14,7.1,wp.z*.14)),materialNoise(vec3(wp.x*.14+31.7,2.3,wp.z*.14-19.2)))*.48-.24;}'+anchor);
  await route.fulfill({response,body});
 });
}
