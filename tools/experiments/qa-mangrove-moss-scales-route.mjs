export async function installMangroveScalesRoute(page){
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='float fade=1.-smoothstep(.12,.60,max(length(dFdx(worldP)),length(dFdy(worldP))));';
  if(!body.includes(anchor))throw Error('Pure moss scale anchor missing');
  const code=`vec3 wp=worldPatternPosition(worldP);
   float fineWeight=mix(.18,.92,smoothstep(.30,.68,materialNoise(vec3(wp.x*.065,4.7,wp.z*.065))));
   vec2 fineUV=mat2(.8,-.6,.6,.8)*worldP.xz*uGroundParams.x*3.7+uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin*uGroundParams.x*3.7,1.);
   vec2 fdx=dFdx(fineUV),fdy=dFdy(fineUV);
   tex=mix(tex,textureGrad(uGroundDetailMap,fineUV,fdx,fdy).rgb,fineWeight);
   mapN=normalize(mix(mapN,textureGrad(uGroundNormal,fineUV,fdx,fdy).rgb*2.-1.,fineWeight));
   arh=mix(arh,textureGrad(uGroundARH,fineUV,fdx,fdy).rgb,fineWeight);
  `;
  body=body.replace(anchor,code.replaceAll('\n','\\n')+anchor);
  await route.fulfill({response,body});
 });
}
