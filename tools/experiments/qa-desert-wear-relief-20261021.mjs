export async function installDesertWearRelief(page){
 await page.route('**/src/rendering/global-desert-sand.js*',async route=>{
  const response=await route.fetch();const body=await response.text(),anchor='normalAmount=.65*up*(1.-wear*.85);';
  if(!body.includes(anchor))throw Error('Sand wear anchor missing');
  await route.fulfill({response,body:body.replace(anchor,'normalAmount=.65*up*(1.-wear*.55);')});
 });
}
