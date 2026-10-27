export async function installCanyonShore(page){
 await page.route('**/src/rendering/biome-ground.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='const data=bytes??buildGroundMask417(this.field.c,this.profile,this.field,bo);';
  if(!body.includes(anchor))throw Error('Ground data anchor missing');
  body=body.replace(anchor,anchor+`if(this.field.canyon&&this.field.riverActive){for(let z=0;z<35;z++)for(let x=0;x<35;x++){const shore=this.field.waterInfo(bo.minX+(x-1)*1.5,bo.minZ+(z-1)*1.5).shore;const t=Math.min(1,Math.max(0,shore/4));data[(z*35+x)*4+2]=Math.round(255*(1-t*t*(3-2*t)));}}`);
  await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();const anchor='if(canyon)ctx=vec4(1.,.5,.65,0.);';
  if(!body.includes(anchor))throw Error('Canyon context anchor missing');
  body=body.replace(anchor,'float canyonShore=ctx.b;if(canyon)ctx=vec4(1.,.5,.65,0.);');await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/global-canyon-sand.js*',async route=>{
  const response=await route.fetch();let body=await response.text();const anchor='materialAO410=mix(materialAO410,1.,deposit*.9);';
  if(!body.includes(anchor))throw Error('Canyon material anchor missing');
  body=body.replace(anchor,anchor+`float damp=smoothstep(.16,.85,canyonShore)*canyonFlat*(.72+.28*materialNoise(vec3(wp.x*.8,0.,wp.z*.8)));color*=mix(vec3(1.),vec3(.55,.65,.68),damp);rough=mix(rough,.58,damp);`);await route.fulfill({response,body});
 });
}
