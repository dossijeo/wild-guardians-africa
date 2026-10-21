export async function installMossWarp(page){
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='vec2 uv=mat2(.8,-.6,.6,.8)*worldP.xz*uGroundParams.x+uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin*uGroundParams.x,1.);';
  if(!body.includes(anchor))throw Error('Pure moss UV anchor missing');
  const patch=anchor+'\n  vec2 qaWP=worldPatternPosition(worldP).xz;\n  uv+=.45*vec2(sin(dot(qaWP,vec2(.071,.043))),sin(dot(qaWP,vec2(-.037,.083))));';
  body=body.replace(anchor,JSON.stringify(patch).slice(1,-1));await route.fulfill({response,body});
 });
}
