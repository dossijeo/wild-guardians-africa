export async function installMangroveFringeRoute(page,{inset=false}={}){
 await page.route('**/tools/experiments/qa-mangrove-mud-moss-blend.js*',async route=>{
  const response=await route.fetch();let body=await response.text();const anchor='float mudWeight=smoothstep(.05,.85,vQAMudEdge);';
  if(!body.includes(anchor))throw Error('Mud fringe anchor missing');
  body=body.replace(anchor,'vec3 fringeP=worldPatternPosition(vToonWorld);float fringe=materialNoise(vec3(fringeP.x*.9,5.3,fringeP.z*.9));float mudWeight=smoothstep(.04,.35+.80*fringe,vQAMudEdge);');
  if(inset)body=body.replace('smoothstep(.04,.35+.80*fringe,vQAMudEdge)','smoothstep(.05,.65,vQAMudEdge-2.2*smoothstep(.25,.75,fringe))');
  await route.fulfill({response,body});
 });
}
