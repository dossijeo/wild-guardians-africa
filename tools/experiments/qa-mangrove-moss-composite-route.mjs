export async function installMangroveCompositeRoute(page){
 await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();for(const role of ['base','normal','arh'])tiles.mangrove[role]='/assets/visual-lab/moss-composite/'+role+'.png';await route.fulfill({response,json:tiles});});
}
