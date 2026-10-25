export function patchRiverSoilEarlyExit(source){
 const anchor='float footprint=max(length(dFdx(worldP)),length(dFdy(worldP)));';
 const soilCoords='  vec2 soilUV=mat2(.8,-.6,.6,.8)*worldP.xz*.2+uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin*.2,1.);\n  vec2 soilDx=dFdx(soilUV),soilDy=dFdy(soilUV);';
 // Source is a JavaScript string literal containing escaped GLSL newlines.
 const escaped=soilCoords.replaceAll('\n','\\n');
 if(!source.includes(anchor)||!source.includes(escaped))throw Error('Early soil anchors missing');
 source=source.replace(escaped,'');
 const early=`
 vec2 soilUV=mat2(.8,-.6,.6,.8)*worldP.xz*.2+uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin*.2,1.);
 vec2 soilDx=dFdx(soilUV),soilDy=dFdy(soilUV);
 if(river&&wear>=.70&&uGroundDebug<.5){
  color=textureGrad(uQaSoilBase,soilUV,soilDx,soilDy).rgb*vec3(.68,.60,.48);
  vec3 soilN=textureGrad(uQaSoilNormal,soilUV,soilDx,soilDy).rgb*2.-1.;
  vec3 soilARH=textureGrad(uQaSoilARH,soilUV,soilDx,soilDy).rgb;
  N=normalize(sampleTurfN410(Ng,soilN,.65*(1.-smoothstep(.12,.60,footprint))));
  rough=max(.86,soilARH.g);wet=0.;materialAO410=mix(.65,1.,soilARH.r);
  materialCover410=clamp(uGroundStrength*uGroundParams.y*mix(.70,1.,smoothstep(.15,.64,ctx.r))*(1.-wear*.91),0.,1.);
  return;
 }
`;
 return source.replace(anchor,anchor+early.replaceAll('\n','\\n'));
}
