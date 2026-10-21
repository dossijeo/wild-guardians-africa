export async function installCanyonSandMapsRoute(page,enabled,{depositMask=false}={}){
 await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 if(!enabled)return;
 await page.route('**/src/rendering/biome-ground.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  if(depositMask){body="import {canyonDepositMask} from '/tools/experiments/qa-canyon-deposit-mask.js';\n"+body;const from="this.volcanicAsh==='mask'?ashMask(data,bo):data";if(!body.includes(from))throw Error('Mask anchor missing');body=body.replace(from,"this.field.c.biome==='canyons'?canyonDepositMask(data,bo):("+from+")");}
  const anchor='if(this.layeredSavanna)for(const role';
  if(!body.includes(anchor))throw Error('Sand load anchor missing');
  body=body.replace(anchor,`if(biome==='canyons')for(const path of ['/docs/qa/global-visual-lab/desert-aerial-sand/Diffuse.png','/assets/visual-lab/aerial_beach_01-normal.png']){
   const source=await assets.texture(path,false);this.assertOpen();const map=source.clone();map.wrapS=map.wrapT=THREE.RepeatWrapping;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.generateMipmaps=true;map.anisotropy=8;map.needsUpdate=true;this.layerTextures.push(map);
  }`+anchor);
  await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const decl='uniform sampler2D uGroundMask,uGroundDetailMap,uGroundNormal;';if(!body.includes(decl))throw Error('Sand uniforms missing');body=body.replace(decl,decl+'uniform sampler2D uLayerSandBase,uLayerSandNormal;');
  const anchor='materialAO410=mix(1.,mix(.45,1.,arh.r),amount);';
  const code=`if(canyon){
   vec3 wp=worldPatternPosition(worldP);
   float deposit=smoothstep(.32,.62,materialNoise(vec3(wp.x*.10,0.,wp.z*.10))*.75+materialNoise(vec3(wp.x*.27,0.,wp.z*.27))*.25)*canyonFlat;
   vec2 suv=mat2(.8,-.6,.6,.8)*worldP.xz/30.+uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin/30.,1.);
   vec2 sdx=dFdx(suv),sdy=dFdy(suv);
   vec3 sand=textureGrad(uLayerSandBase,suv,sdx,sdy).rgb*vec3(1.,.83,.59);
   vec3 sn=textureGrad(uLayerSandNormal,suv,sdx,sdy).rgb*2.-1.;
   color=mix(color,sand,deposit*.9);
   N=normalize(mix(N,sampleTurfN410(Ng,sn,.65*normalFade),deposit*.9));
   rough=mix(rough,.98,deposit);
   materialAO410=mix(materialAO410,1.,deposit*.9);
  }`;
  if(!body.includes(anchor))throw Error('Sediment shader anchor missing');
  body=body.replace(anchor,anchor+code.replaceAll('\n','\\n'));
  if(depositMask){const from='if(canyon)ctx=vec4(1.,.5,.65,0.);';if(!body.includes(from))throw Error('Context anchor missing');body=body.replace(from,'float qaDepositField=ctx.g;'+from);body=body.replace('materialNoise(vec3(wp.x*.10,0.,wp.z*.10))*.75+materialNoise(vec3(wp.x*.27,0.,wp.z*.27))*.25','qaDepositField');}
  await route.fulfill({response,body});
 });
}
