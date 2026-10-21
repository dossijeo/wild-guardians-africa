import {patchRiverSoilEarlyExit} from './qa-river-soil-early-exit.mjs';
import {installRiverCoverPaletteRoute} from './qa-river-cover-palette-route.mjs';
export async function installRiverSoilLayerV2Route(page,enabled,{earlyExit=false,wearAligned=false,fringeMask=false,materialFringe=false,soilMottling=false}={}){
 await installRiverCoverPaletteRoute(page,true);
 if(!enabled)return;
 await page.route('**/src/rendering/biome-ground.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  if(fringeMask){body="import {riverFringeMask} from '/tools/experiments/qa-river-fringe-mask.js';\n"+body;const anchor='this.volcanicAsh===\'mask\'?ashMask(data,bo):data';if(!body.includes(anchor))throw Error('Mask transform anchor missing');body=body.replace(anchor,"this.field.c.biome==='grand_river'?riverFringeMask(data,bo):("+anchor+")");}
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
  if(soilMottling){const from='color=mix(color,soil*vec3(.68,.60,.48),soilWeight);';if(!body.includes(from))throw Error('Soil color missing');body=body.replace(from,'vec3 qaSoilP=worldPatternPosition(worldP);float qaSoilBroad=materialNoise(vec3(qaSoilP.x*.16,7.3,qaSoilP.z*.16));float qaSoilFine=materialNoise(vec3(qaSoilP.x*.49,2.1,qaSoilP.z*.49));vec3 qaSoilTint=mix(vec3(.72,.76,.80),vec3(1.12,1.08,1.02),smoothstep(.23,.75,qaSoilBroad*.8+qaSoilFine*.2));color=mix(color,soil*vec3(.68,.60,.48)*qaSoilTint,soilWeight);');}
  if(materialFringe){const from='float soilWeight=smoothstep(.12,.70,wear);';if(!body.includes(from))throw Error('Material fringe anchor missing');body=body.replace(from,'vec3 qaSoilWorld=worldPatternPosition(worldP);float qaSoilNoise=materialNoise(vec3(qaSoilWorld.x*.35,2.7,qaSoilWorld.z*.35));float soilWeight=smoothstep(.12,.70,wear);soilWeight=clamp(soilWeight+(qaSoilNoise-.5)*1.8*soilWeight*(1.-soilWeight),0.,1.);');}
  if(wearAligned)body=body.replaceAll('smoothstep(.12,.70,wear)','smoothstep(.08,.30,wear)');
  if(earlyExit&&wearAligned)throw Error('Early exit threshold has not been validated for aligned wear');
  if(earlyExit)body=patchRiverSoilEarlyExit(body);
  await route.fulfill({response,body});
 });
}
