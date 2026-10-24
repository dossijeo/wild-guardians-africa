export async function installVolcanicNightRelief(page){
 await page.route('**/src/rendering/global-visual-lighting.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const a='vec3(.095,.17,.32)*uNightLight*((uBiome';
  if(!body.includes(a))throw Error('Volcanic ambient spectrum anchor missing');
  body=body.replace(a,'vec3(.15,.22,.32)*uNightLight*((uBiome');
  await route.fulfill({response,body});
 });
}
