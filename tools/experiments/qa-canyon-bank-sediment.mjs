export async function installCanyonBankSediment(page){
 await page.route('**/src/rendering/global-canyon-sand.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const a='canyonSandWeight=deposit*.9;color=mix(color,sand,deposit*.9);';
  if(!body.includes(a))throw Error('Canyon sediment anchor missing');
  body=body.replace(a,`float bankHeight=worldP.y-3.28;
   float bankWet=(1.-smoothstep(.15,1.8,bankHeight+(materialNoise(vec3(wp.x*.32,0.,wp.z*.32))-.5)*.45))*canyonFlat;
   deposit*=1.-bankWet*.75;
   ${a}
   color*=mix(vec3(1.),vec3(.65,.69,.73),bankWet);`);
  await route.fulfill({response,body});
 });
}
