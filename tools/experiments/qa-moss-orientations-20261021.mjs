export async function installMossOrientations(page){
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='vec3 arh=textureGrad(uGroundARH,uv,dx,dy).rgb;\n  float fade=';
  const patch=`vec3 arh=textureGrad(uGroundARH,uv,dx,dy).rgb;
  vec2 uv2=vec2(-uv.y,uv.x)+vec2(.371,.619),dx2=vec2(-dx.y,dx.x),dy2=vec2(-dy.y,dy.x);
  vec3 tex2=textureGrad(uGroundDetailMap,uv2,dx2,dy2).rgb;
  vec3 normal2=textureGrad(uGroundNormal,uv2,dx2,dy2).rgb*2.-1.;
  normal2.xy=vec2(-normal2.y,normal2.x);
  vec3 arh2=textureGrad(uGroundARH,uv2,dx2,dy2).rgb;
  vec3 qaWorld=worldPatternPosition(worldP);
  float qaRegion=materialNoise(vec3(qaWorld.x*.18,6.3,qaWorld.z*.18));
  float qaHeight=arh.b-arh2.b+(qaRegion-.5)*.8;
  float qaWidth=max(.055,fwidth(qaHeight)*1.2);
  float qaMix=smoothstep(-qaWidth,qaWidth,qaHeight);
  tex=mix(tex2,tex,qaMix);mapN=normalize(mix(normal2,mapN,qaMix));arh=mix(arh2,arh,qaMix);
  float fade=`;
  const encoded=x=>JSON.stringify(x).slice(1,-1);
  if(!body.includes(encoded(anchor)))throw Error('Pure moss orientation anchor missing');
  body=body.replace(encoded(anchor),encoded(patch));await route.fulfill({response,body});
 });
}
