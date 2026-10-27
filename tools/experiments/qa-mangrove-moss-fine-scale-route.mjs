export async function installMangroveFineScaleRoute(page){
 await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(tiles.mangrove.scale!==.115)throw Error('Unexpected moss scale');tiles.mangrove.scale=.32;await route.fulfill({response,json:tiles});});
}
