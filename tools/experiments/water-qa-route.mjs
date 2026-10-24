// Reconstruct the pre-water baseline after the experiment is integrated.
export async function disableIntegratedWater(page){
 await page.route('**/src/rendering/scene.js*',async route=>{
  const response=await route.fetch(),body=await response.text(),anchor='globalWaterSurface:this.toon.globalVisualLighting';
  if(!body.includes(anchor))throw Error('Integrated water QA baseline anchor missing');
  await route.fulfill({response,body:body.replace(anchor,'globalWaterSurface:false')});
 });
}
