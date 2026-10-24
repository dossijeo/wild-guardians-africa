export async function installMossHeightRegions(page){
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='vec3 arh=textureGrad(uGroundARH,uv,dx,dy).rgb;\n  float fade=';
  const patch=`vec3 arh=vec3(0.);tex=vec3(0.);mapN=vec3(0.);float qaTotal=0.;
  vec2 qaGrid=uv*.75,qaCell=floor(qaGrid),qaF=fract(qaGrid);qaF=qaF*qaF*(3.-2.*qaF);
  for(int qaY=0;qaY<2;qaY++)for(int qaX=0;qaX<2;qaX++){
   vec2 corner=vec2(float(qaX),float(qaY)),id=qaCell+corner;
   vec2 offset=fract(sin(vec2(dot(id,vec2(127.1,311.7)),dot(id,vec2(269.5,183.3))))*43758.5453);
   vec2 qUV=uv+offset;
   float weight=(qaX==0?1.-qaF.x:qaF.x)*(qaY==0?1.-qaF.y:qaF.y);
   vec3 qaARH=textureGrad(uGroundARH,qUV,dx,dy).rgb;
   weight*=exp2((qaARH.b-.5)*12.);qaTotal+=weight;
   tex+=textureGrad(uGroundDetailMap,qUV,dx,dy).rgb*weight;
   mapN+=(textureGrad(uGroundNormal,qUV,dx,dy).rgb*2.-1.)*weight;
   arh+=qaARH*weight;
  }
  tex/=qaTotal;arh/=qaTotal;mapN=normalize(mapN);
  float fade=`;
  const encoded=x=>JSON.stringify(x).slice(1,-1);
  if(!body.includes(encoded(anchor)))throw Error('Pure moss region anchor missing');
  body=body.replace(encoded(anchor),encoded(patch));await route.fulfill({response,body});
 });
}
