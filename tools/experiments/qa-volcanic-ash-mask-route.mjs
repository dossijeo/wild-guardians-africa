import {installVolcanicAshRoute} from './qa-volcanic-ash-route.mjs';
export async function installVolcanicAshMaskRoute(page,{measurePreparation=false}={}){
 await installVolcanicAshRoute(page);
 await page.route('**/src/rendering/biome-ground.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='mask=new THREE.DataTexture(data,35,35,THREE.RGBAFormat);';
  if(!body.includes(anchor))throw Error('Ash mask allocation anchor missing');
  body="import {ashMask} from '/tools/experiments/qa-volcanic-ash-mask.js';\n"+body.replace(anchor,"mask=new THREE.DataTexture(this.field.c.biome==='volcanoes'?ashMask(data,bo):data,35,35,THREE.RGBAFormat);");
  if(measurePreparation){
   body=body.replace('import {ashMask}', 'import {ashMask as rawAshMask}');
   body=`function ashMask(data,bo){const t=performance.now();const result=rawAshMask(data,bo);const elapsed=performance.now()-t;const stats=globalThis.qaAshMaskPreparation??={count:0,totalMs:0,maxMs:0};stats.count++;stats.totalMs+=elapsed;stats.maxMs=Math.max(stats.maxMs,elapsed);return result;}\n`+body;
  }
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
