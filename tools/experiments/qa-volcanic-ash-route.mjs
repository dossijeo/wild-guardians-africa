export async function installVolcanicAshRoute(page){
 await page.route('**/src/rendering/african-toon.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='shader.fragmentShader=patchVolcanicCharcoal(shader.fragmentShader);';
  if(!body.includes(anchor))throw Error('Volcanic QA hook missing');
  body="import {patchVolcanicAsh as patchQaVolcanicAsh} from '/tools/experiments/qa-volcanic-ash.js';\n"+body.replace(anchor,anchor+'shader.fragmentShader=patchQaVolcanicAsh(shader.fragmentShader);');
  await route.fulfill({response,body});
 });
}
