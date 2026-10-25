// Reproduce the pre-integration baseline without changing the worktree.
export async function disableIntegratedRoughness(page){
 await page.route('**/src/rendering/african-toon.js*',async route=>{
  const response=await route.fetch(),source=await response.text();
  const anchor='shader.fragmentShader=patchDryGroundRoughness(shader.fragmentShader);';
  if(!source.includes(anchor))throw Error('Integrated roughness baseline anchor missing');
  await route.fulfill({response,body:source.replace(anchor,'/* QA pre-roughness baseline */')});
 });
}
