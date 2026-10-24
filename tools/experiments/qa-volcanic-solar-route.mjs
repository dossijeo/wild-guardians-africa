export async function installVolcanicSolarRoute(page){
 await page.route('**/src/rendering/african-toon.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const declaration='uniform sampler2D uEnvDay,uEnvNight;',anchor='vec3 biomeSpec=groundReflection';
  if(!body.includes(declaration)||!body.includes(anchor))throw Error('Volcanic solar anchors missing');
  body=body.replace(declaration,'float qaRockSolar=1.;'+declaration).replace(anchor,'if(uBiome>2.5&&uBiome<3.5)biomeDirect*=mix(vec3(1.),vec3(1.35,1.03,.70),qaRockSolar*(1.-uNight)*smoothstep(.2,.85,dot(toonN,uLightDir)));\n          '+anchor);
  await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/global-volcanic-ash.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='rough=mix(baseRough,.96,qaAsh*.8);';
  if(!body.includes(anchor))throw Error('Ash isolation anchor missing');
  body=body.replace(anchor,anchor+'qaRockSolar=1.-qaAsh;');
  await route.fulfill({response,body});
 });
}
