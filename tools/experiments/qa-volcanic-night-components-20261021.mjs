export async function installVolcanicNightComponents(page,mode){
 if(!['ambient','ao'].includes(mode))throw Error('Unknown component');
 await page.route('**/src/rendering/african-toon.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor=mode==='ambient'?'vec3 biomeAmbient=mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight,uNight);':'float biomeAO=nativeContact4(vToonWorld)*materialAO410;';
  const patch=mode==='ambient'?anchor+'\n if(uBiome>2.5&&uBiome<3.5)biomeAmbient*=1.+uNight*.65;':'float biomeAO=nativeContact4(vToonWorld)*mix(materialAO410,1.,(uBiome>2.5&&uBiome<3.5)?uNight*.5:0.);';
  if(!body.includes(anchor))throw Error('Ground component anchor missing');
  await route.fulfill({response,body:body.replace(anchor,patch)});
 });
}
