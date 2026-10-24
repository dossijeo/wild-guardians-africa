export async function installDesertRippleWarp(page){
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='vec2 du=dFdx(uv),dv=dFdy(uv);';
  const patch=`vec2 qaSandShear=vec2(0.);
  if(desert){
   vec2 p=mat2(.8,-.6,.6,.8)*worldPatternPosition(worldP).xz*uGroundParams.x;
   uv+=vec2(.60*sin(p.y*.25),.40*sin(p.x*.20));
   qaSandShear=vec2(.15*cos(p.y*.25),.08*cos(p.x*.20));
  }
  vec2 du=dFdx(uv),dv=dFdy(uv);`;
  if(!body.includes(anchor))throw Error('Desert UV anchor missing');
  await route.fulfill({response,body:body.replace(anchor,JSON.stringify(patch).slice(1,-1))});
 });
 await page.route('**/src/rendering/global-desert-sand.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='vec3 mapN=tileN*2.-1.;N=normalize(';
  if(!body.includes(anchor))throw Error('Desert normal anchor missing');
  body=body.replace(anchor,'vec3 mapN=tileN*2.-1.;mapN.xy=vec2(mapN.x-qaSandShear.y*mapN.y,mapN.y-qaSandShear.x*mapN.x);N=normalize(');
  await route.fulfill({response,body});
 });
}
