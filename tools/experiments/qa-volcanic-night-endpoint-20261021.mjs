export async function installVolcanicNightEndpoint(page){
 await page.route('**/src/rendering/african-toon.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='vec3 biomeAmbient=mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight,uNight);';
  const patch='vec3 biomeAmbient=mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight*((uBiome>2.5&&uBiome<3.5)?1.65:1.),uNight);';
  if(!body.includes(anchor))throw Error('Ground ambient anchor missing');
  await route.fulfill({response,body:body.replace(anchor,patch)});
 });
}
