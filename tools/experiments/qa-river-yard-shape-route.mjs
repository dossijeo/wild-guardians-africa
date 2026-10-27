// QA only: world-locked irregularity of the visual yard, preserving corridor masks.
export async function installRiverYardShapeRoute(page){
 await page.route('**/src/rendering/ground-mask.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const old='const core=1-smooth(s.clearRadius*.48,s.clearRadius+2.3+(meso-.5)*3,d);';
  if(!body.includes(old))throw Error('Yard shape anchor missing');
  body=body.replace(old,`const edge=smooth(s.clearRadius*.48,s.clearRadius*.8,d);
 const irregular=field.c.biome==='grand_river'?(noise(x*.16,z*.16,field.seed^97151)-.5)*5*edge:0;
 const core=1-smooth(s.clearRadius*.48,s.clearRadius+2.3+(meso-.5)*3,d+irregular);`);
  await route.fulfill({response,body});
 });
}
