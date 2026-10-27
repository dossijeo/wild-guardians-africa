export async function installVolcanicNightRelief(page){
 await page.route('**/src/rendering/african-toon.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='vec3 biomeSun=mix(vec3(3.65,3.30,2.78),vec3(.22,.36,.66)*uNightLight,uNight);';
  if(!body.includes(anchor))throw Error('Mapped ground lighting anchor missing');
  body=body.replace(anchor,anchor+'\n          if(uBiome>2.5&&uBiome<3.5)biomeSun*=1.+uNight*.45;');
  await route.fulfill({response,body});
 });
}
