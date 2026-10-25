export async function installMangroveSubstrateRoute(page){
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
  const patch=`vec2 ctxUV=((worldP.xz-uGroundRect.xy)/uGroundRect.z+1.5)/uGroundRect.w;
  vec4 ctx=texture(uGroundMask,ctxUV);
  vec3 wp=worldPatternPosition(worldP);
  float patchNoise=materialNoise(vec3(wp.x*.12,3.7,wp.z*.12));
  if(uGroundMapped<.5)ctx=vec4(.8,.5,.65,0.);
  float mossCover=smoothstep(.40,.66,ctx.g*.64+ctx.r*.18+patchNoise*.18-ctx.a*.22);
  mossCover=mix(.12,.98,mossCover);
  vec3 soil=textureGrad(uLayerSandBase,uv,dx,dy).rgb*vec3(.58,.61,.64);
  vec3 soilN=textureGrad(uLayerSandNormal,uv,dx,dy).rgb*2.-1.;
  vec3 soilARH=textureGrad(uLayerSandARH,uv,dx,dy).rgb;
  color=mix(soil,color,mossCover);
  N=normalize(mix(sampleTurfN410(Ng,soilN,.55*fade),N,mossCover));
  rough=mix(clamp(soilARH.g,.78,.96),clamp(arh.g,.5,.99),mossCover);
  wet=0.;materialAO410=mix(mix(.65,1.,soilARH.r),mix(.45,1.,arh.r),mossCover);materialCover410=mossCover;return;`;
  body=body.replace('void groundMaterial417(', 'uniform sampler2D uLayerSandBase,uLayerSandNormal,uLayerSandARH;void groundMaterial417(');
  body=body.replace(anchor,patch.replaceAll('\n','\\n'));await route.fulfill({response,body});
 });
}
