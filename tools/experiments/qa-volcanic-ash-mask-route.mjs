import {installVolcanicAshRoute} from './qa-volcanic-ash-route.mjs';
export async function installVolcanicAshMaskRoute(page){
 await installVolcanicAshRoute(page);
 await page.route('**/src/rendering/biome-ground.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='mask=new THREE.DataTexture(data,35,35,THREE.RGBAFormat);';
  if(!body.includes(anchor))throw Error('Ash mask allocation anchor missing');
  body="import {ashMask} from '/tools/experiments/qa-volcanic-ash-mask.js';\n"+body.replace(anchor,"mask=new THREE.DataTexture(this.field.c.biome==='volcanoes'?ashMask(data,bo):data,35,35,THREE.RGBAFormat);");
  await route.fulfill({response,body});
 });
 await page.route('**/tools/experiments/qa-volcanic-ash.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const start='if(rock){vec3 p=worldPatternPosition(worldP);',end='qaAsh=smoothstep(.39,.66,broad*.78+edge*.22)';
  if(!body.includes(start)||!body.includes(end))throw Error('Ash field shader anchor missing');
  body=body.replace(start,'if(rock){float field=ctx.r;if(uGroundMapped<.5){vec3 p=worldPatternPosition(worldP);').replace(end,'field=broad*.78+edge*.22;}qaAsh=smoothstep(.39,.66,field)');
  await route.fulfill({response,body});
 });
}
