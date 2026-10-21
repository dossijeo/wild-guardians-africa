import {patchRiverSoilEarlyExit} from './qa-river-soil-early-exit.mjs';
import {installRiverCoverPaletteRoute} from './qa-river-cover-palette-route.mjs';
export async function installRiverSoilLayerV2Route(page,enabled,{earlyExit=false,wearAligned=false}={}){
 await installRiverCoverPaletteRoute(page,true);
 if(!enabled)return;
 await page.route('**/src/rendering/biome-ground.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const a='if(this.layeredSavanna)for(const role';
  if(!body.includes(a))throw Error('Soil loading anchor missing');
  body=body.replace(a,"if(this.layeredSavanna||biome==='grand_river')for(const role");
  const u='uLayerSandBase:{value:';
  if(!body.includes(u))throw Error('Soil binding missing');
  body=body.replace(u,'uQaSoilBase:{value:this.layerTextures[0]??this.textures[0]},uQaSoilNormal:{value:this.layerTextures[1]??this.textures[1]},uQaSoilARH:{value:this.layerTextures[2]??this.textures[2]},'+u);
  await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const changes=[
   ['uniform sampler2D uGroundMask,uGroundDetailMap,uGroundNormal;','uniform sampler2D uGroundMask,uGroundDetailMap,uGroundNormal;uniform sampler2D uQaSoilBase,uQaSoilNormal,uQaSoilARH;'],
   ['float reliefMask=canyon?canyonFlat:up;','float reliefMask=canyon?canyonFlat:up;if(river)reliefMask*=1.-smoothstep(.12,.70,wear);'],
   ['materialAO410=mix(1.,mix(.45,1.,arh.r),amount);',`materialAO410=mix(1.,mix(.45,1.,arh.r),amount);
 if(river){
  float soilWeight=smoothstep(.12,.70,wear);
  vec2 soilUV=mat2(.8,-.6,.6,.8)*worldP.xz*.2+uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin*.2,1.);
  vec2 soilDx=dFdx(soilUV),soilDy=dFdy(soilUV);
  if(soilWeight>.001){
   vec3 soil=textureGrad(uQaSoilBase,soilUV,soilDx,soilDy).rgb;
   vec3 soilN=textureGrad(uQaSoilNormal,soilUV,soilDx,soilDy).rgb*2.-1.;
   vec3 soilARH=textureGrad(uQaSoilARH,soilUV,soilDx,soilDy).rgb;
   color=mix(color,soil*vec3(.68,.60,.48),soilWeight);
   N=normalize(mix(N,sampleTurfN410(Ng,soilN,.65*normalFade),soilWeight));
   rough=mix(rough,max(.86,soilARH.g),soilWeight);
   materialAO410=mix(materialAO410,mix(.65,1.,soilARH.r),soilWeight);
  }
 }`.replaceAll('\n','\\n')]
  ];
  for(const [a,b]of changes){if(!body.includes(a))throw Error('Soil shader anchor missing: '+a);body=body.replace(a,b);}
  if(wearAligned)body=body.replaceAll('smoothstep(.12,.70,wear)','smoothstep(.08,.30,wear)');
  if(earlyExit&&wearAligned)throw Error('Early exit threshold has not been validated for aligned wear');
  if(earlyExit)body=patchRiverSoilEarlyExit(body);
  await route.fulfill({response,body});
 });
}
