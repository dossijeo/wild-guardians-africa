export async function installDesertRippleWarp(page){
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='vec2 du=dFdx(uv),dv=dFdy(uv);';
  const patch=`if(desert){
   vec2 p=worldPatternPosition(worldP).xz;
   uv+=vec2(.65*sin(p.y*.11)+.30*sin(p.x*.075),.45*sin(p.x*.09));
  }
  vec2 du=dFdx(uv),dv=dFdy(uv);`;
  if(!body.includes(anchor))throw Error('Desert UV anchor missing');
  await route.fulfill({response,body:body.replace(anchor,JSON.stringify(patch).slice(1,-1))});
 });
}
