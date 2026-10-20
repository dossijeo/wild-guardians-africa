export async function disableIntegratedDesertLight(page){
 await page.route('**/src/rendering/african-toon.js*',async route=>{
  const response=await route.fetch(),source=await response.text();
  const anchor='shader.fragmentShader=patchDesertLight(shader.fragmentShader);';
  if(!source.includes(anchor))throw Error('Desert light integration anchor missing');
  await route.fulfill({response,body:source.replace(anchor,'/* QA baseline: quantized desert light */')});
 });
}
