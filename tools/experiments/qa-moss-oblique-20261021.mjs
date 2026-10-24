export async function installMossOblique(page){
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='vec3 arh=textureGrad(uGroundARH,uv,dx,dy).rgb;\n  float fade=';
  const patch=`vec3 arh=textureGrad(uGroundARH,uv,dx,dy).rgb;
  mat2 qaTurn=mat2(.70710678,.70710678,-.70710678,.70710678);
  vec2 uv2=qaTurn*uv+vec2(.371,.619),dx2=qaTurn*dx,dy2=qaTurn*dy;
  vec3 arh2=textureGrad(uGroundARH,uv2,dx2,dy2).rgb;
  vec3 qaWorld=worldPatternPosition(worldP);
  float qaRegion=materialNoise(vec3(qaWorld.x*.18,6.3,qaWorld.z*.18));
  float qaHeight=arh.b-arh2.b+(qaRegion-.5)*.8;
  float qaWidth=max(.055,fwidth(qaHeight)*1.2);
  float qaMix=smoothstep(-qaWidth,qaWidth,qaHeight);
  if(qaMix<1.){
   vec3 tex2=textureGrad(uGroundDetailMap,uv2,dx2,dy2).rgb;
   vec3 normal2=textureGrad(uGroundNormal,uv2,dx2,dy2).rgb*2.-1.;
   normal2.xy=qaTurn*normal2.xy;
   tex=mix(tex2,tex,qaMix);mapN=mix(normal2,mapN,qaMix);
  }
  mapN=normalize(mapN);arh=mix(arh2,arh,qaMix);
  float fade=`;
  const encoded=x=>JSON.stringify(x).slice(1,-1);
  if(!body.includes(encoded(anchor)))throw Error('Pure moss orientation anchor missing');
  body=body.replace(encoded(anchor),encoded(patch));await route.fulfill({response,body});
 });
}
