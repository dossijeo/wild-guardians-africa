export async function installRiverYardIslands(page){
 await page.route('**/src/rendering/biome-ground.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor="this.volcanicAsh==='mask'?ashMask(data,bo):data";
  if(!body.includes(anchor))throw Error('Yard mask anchor missing');
  body="import {riverYardIslands as qaRiverYardIslands} from '/tools/experiments/qa-river-yard-islands.js';\n"+body;
  body=body.replace(anchor,"this.field.c.biome==='grand_river'?qaRiverYardIslands(data,bo,this.field):("+anchor+")");
  await route.fulfill({response,body});
 });
}
