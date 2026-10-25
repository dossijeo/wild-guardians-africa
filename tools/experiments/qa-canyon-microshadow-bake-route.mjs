export async function installCanyonMicroshadowBakeRoute(page,enabled){
 await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();tiles.canyons.scale=.08;if(enabled)tiles.canyons.arh="/assets/visual-lab/canyon-soil-solar-arh.png";await route.fulfill({response,json:tiles});});
 if(!enabled)return;
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const start='void groundMaterial417(';
  if(!body.includes(start))throw Error('Mapped ground missing');body=body.replace(start,'float qaCanyonMicroSun=1.;'+start);
  const anchor='materialAO410=mix(1.,mix(.45,1.,arh.r),amount);';
  const sample='vec3 arh=textureGrad(uGroundARH,uv,dx,dy).rgb;';
  if(!body.includes(sample))throw Error('Packed material sample missing');
  body=body.replaceAll(sample,'vec4 qaArh=textureGrad(uGroundARH,uv,dx,dy);vec3 arh=qaArh.rgb;');
  const code='if(canyon)qaCanyonMicroSun=mix(1.,qaArh.a,canyonFlat*normalFade);';
  if(!body.includes(anchor))throw Error('Ground AO anchor missing');body=body.replace(anchor,anchor+code.replaceAll('\n','\\n'));
  await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/african-toon.js*',async route=>{
  const response=await route.fetch();let body=await response.text();const anchor='vec3 biomeDirect=brdf4(toonN,toonV,uLightDir,groundAlbedo,groundRough,0.)*biomeSun*groundVisibility;';
  if(!body.includes(anchor))throw Error('Mapped direct anchor missing');body=body.replace(anchor,anchor+'if(uBiome>3.5&&uBiome<4.5)biomeDirect*=mix(qaCanyonMicroSun,1.,uNight);');await route.fulfill({response,body});
 });
}
