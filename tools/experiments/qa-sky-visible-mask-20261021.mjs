export async function installSkyDepth(page,variant){
 await page.route('**/src/rendering/sky-source.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='return clamp(base,0.,1.);';if(!body.includes(anchor))throw Error('Sky mask anchor missing');body=body.replace(anchor,variant==='base'?'return vec3(0.);':'return vec3(1.);');await route.fulfill({response,body});});
}
