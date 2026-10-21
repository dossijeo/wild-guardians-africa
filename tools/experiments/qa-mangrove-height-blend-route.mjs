export async function installMangroveHeightBlendRoute(page,{height=true,calibrated=false,linearSoil=false,toonSoil=false,skipUnusedLighting=false,gateSoilSamples=false,guardSoilDerivatives=false,guardSoilHeight=false}={}){
 await page.route('**/src/rendering/biome-ground.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor="if(this.layeredSavanna)for(const role of ['base','normal','arh']){";
  if(!body.includes(anchor))throw Error('Layer load anchor missing');
  body=body.replace(anchor,"if(this.layeredSavanna||biome==='mangrove')for(const role of ['base','normal','arh']){").replace('assets.texture(tiles.canyons[role],false)',"assets.texture((biome==='mangrove'?tiles.mangrove.mudPatches:tiles.canyons)[role],false)");
  await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/savanna-layer-source.js*',async route=>{const response=await route.fetch();const body=(await response.text()).replace('uniform sampler2D uLayerSandBase,uLayerSandNormal,uLayerSandARH;','');await route.fulfill({response,body});});
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='rough=clamp(arh.g,.5,.99);wet=0.;materialAO410=mix(.45,1.,arh.r);materialCover410=1.;return;';
  if(!body.includes(anchor))throw Error('Pure moss anchor missing');
  let patch=`vec2 ctxUV=((worldP.xz-uGroundRect.xy)/uGroundRect.z+1.5)/uGroundRect.w;
  vec4 ctx=texture(uGroundMask,ctxUV);
  vec3 wp=worldPatternPosition(worldP);
  float patchNoise=materialNoise(vec3(wp.x*.12,3.7,wp.z*.12));
  if(uGroundMapped<.5)ctx=vec4(.8,.5,.65,0.);
  float mossCover=smoothstep(.30,.50,ctx.g*.64+ctx.r*.18+patchNoise*.18-ctx.a*.10);
  mossCover=mix(.38,.98,mossCover);
  vec3 soilRaw=textureGrad(uLayerSandBase,uv,dx,dy).rgb;
  vec3 soil=${linearSoil?'sRGBTransferOETF(vec4(toLinear4(soilRaw)*vec3(.58,.61,.64),1.)).rgb':'soilRaw*vec3(.58,.61,.64)'};
  vec3 soilN=textureGrad(uLayerSandNormal,uv,dx,dy).rgb*2.-1.;
  vec3 soilARH=textureGrad(uLayerSandARH,uv,dx,dy).rgb;
  ${height?`float heightDifference=${calibrated?'clamp((arh.b-186./255.)/(69./255.),-.5,.5)-clamp((soilARH.b-39./255.)/(123./255.),-.5,.5)':'arh.b-soilARH.b'}+(mossCover*2.-1.)*1.4;
  float transitionWidth=max(.10,fwidth(heightDifference)*1.5);
  mossCover=smoothstep(-transitionWidth,transitionWidth,heightDifference);`:''}
  ${toonSoil?'qaSoilAlbedo=toLinear4(soilRaw)*vec3(.58,.61,.64);qaSoilNormal=sampleTurfN410(Ng,soilN,.55*fade);qaSoilRough=max(.04,soilARH.g*.52);qaSoilWeight=1.-mossCover;':''}
  color=mix(soil,color,mossCover);
  N=normalize(mix(sampleTurfN410(Ng,soilN,.55*fade),N,mossCover));
  rough=mix(clamp(soilARH.g,.78,.96),clamp(arh.g,.5,.99),mossCover);
  wet=0.;materialAO410=mix(mix(.65,1.,soilARH.r),mix(.45,1.,arh.r),mossCover);materialCover410=mossCover;return;`;
  if(gateSoilSamples){
   if(!height||!toonSoil||!skipUnusedLighting)throw Error('Sample gating requires full recipe');
   const begin=patch.indexOf('  vec3 soilRaw='),end=patch.indexOf('  vec3 soilARH=');
   const samples=patch.slice(begin,end);
   patch=patch.slice(0,begin)+patch.slice(end);
   const at=patch.indexOf('  qaSoilAlbedo=');
   if(begin<0||end<0||at<0)throw Error('Sample gate anchors missing');
   const gated=samples.replace('vec3 soilRaw=','soilRaw=').replace('vec3 soil=','soil=').replace('vec3 soilN=','soilN=');
   patch=patch.slice(0,at)+'  vec3 soilRaw=vec3(0.),soil=vec3(0.),soilN=vec3(0.,0.,1.);if('+ (guardSoilHeight?'mossCover<1.||heightDifference<transitionWidth+2.*fwidth(heightDifference)':guardSoilDerivatives?'mossCover<1.||fwidth(mossCover)>0.':'mossCover<1.') +'){'+gated+'}\n'+patch.slice(at);
  }
  if(toonSoil)body=body.replace('void groundMaterial417(', 'vec3 qaSoilAlbedo=vec3(0.),qaSoilNormal=vec3(0.,1.,0.);float qaSoilRough=1.,qaSoilWeight=0.;void groundMaterial417(');
  body=body.replace('void groundMaterial417(', 'uniform sampler2D uLayerSandBase,uLayerSandNormal,uLayerSandARH;void groundMaterial417(');
  body=body.replace(anchor,patch.replaceAll('\n','\\n'));await route.fulfill({response,body});
 });
 if(toonSoil)await page.route('**/src/rendering/african-toon.js*',async route=>{
  const response=await route.fetch();let body=await response.text();const anchor='outgoingLight=toLinear4(filmic4(groundLit));';if(!body.includes(anchor))throw Error('Soil light anchor missing');
  body=body.replace(anchor,anchor+`if(uBiome>1.5&&uBiome<2.5){
   float qaSoilLeaf=smoothstep(.018,.13,qaSoilAlbedo.g-qaSoilAlbedo.r*.87)*smoothstep(.06,.20,qaSoilAlbedo.g);
   vec3 qaSoilReflection=uNativeEnvEnabled>.5?environment4(reflect(-toonV,qaSoilNormal),qaSoilRough):vec3(0.);
   vec3 qaSoilLit=toLinear4(africanToon4(vec3(0.),qaSoilAlbedo,qaSoilNormal,toonV,uLightDir,qaSoilReflection,qaSoilRough,groundVisibility,qaSoilLeaf,0.,0.,max(dot(qaSoilNormal,toonV),0.),worldPatternPosition(vToonWorld)));
   outgoingLight=mix(outgoingLight,qaSoilLit,qaSoilWeight);
  }`);
  if(skipUnusedLighting){
   const start='vec3 biomeSun=',soil='if(uBiome>1.5&&uBiome<2.5){';
   if(!body.includes(start)||!body.includes(soil))throw Error('Lighting branch anchors missing');
   body=body.replace(start,'outgoingLight=vec3(0.);if(qaSoilWeight<1.){'+start).replace(anchor,anchor+'}').replace(soil,'if(uBiome>1.5&&uBiome<2.5&&qaSoilWeight>0.){');
  }
  await route.fulfill({response,body});
 });

}
