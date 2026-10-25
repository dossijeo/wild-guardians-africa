// QA only: preserve night UV and endpoint specialization while remapping day.
export async function installSkyReflectionLatitude(page){
 for(const file of ['fluid-lighting-source.js','environment-endpoints.js'])await page.route('**/src/rendering/'+file+'*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='textureLod(uEnvDay,uv,rough*7.)';
  if(!body.includes(anchor))throw Error('Day environment lookup missing in '+file);
  body=body.replaceAll(anchor,'textureLod(uEnvDay,vec2(uv.x,uv.y-.025*smoothstep(.10,.50,uv.y)),rough*7.)');
  await route.fulfill({response,body});
 });
}
