// QA: expose the existing contextual moss branch without adding parallax.
export async function installMangroveContextRoute(page){
 await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(tiles.mangrove.pureMoss!==true)throw Error('Unexpected moss mode');tiles.mangrove.pureMoss=false;tiles.mangrove.relief=0;await route.fulfill({response,json:tiles});});
}
