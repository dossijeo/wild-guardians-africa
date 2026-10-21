// Retained V2 soil recipe; explicit laboratory option, existing CC0 Ground079S maps.
export function riverSoilEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('riverSoil')==='1';
}
export function patchRiverSoil(source){
 const edits=[
  [
    "uniform sampler2D uGroundMask,uGroundDetailMap,uGroundNormal;",
    "uniform sampler2D uGroundMask,uGroundDetailMap,uGroundNormal;uniform sampler2D uQaSoilBase,uQaSoilNormal,uQaSoilARH;"
  ],
  [
    "float reliefMask=canyon?canyonFlat:up;",
    "float reliefMask=canyon?canyonFlat:up;if(river)reliefMask*=1.-smoothstep(.12,.70,wear);"
  ],
  [
    "materialAO410=mix(1.,mix(.45,1.,arh.r),amount);",
    "materialAO410=mix(1.,mix(.45,1.,arh.r),amount);\n if(river){\n  float soilWeight=smoothstep(.12,.70,wear);\n  vec2 soilUV=mat2(.8,-.6,.6,.8)*worldP.xz*.2+uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin*.2,1.);\n  vec2 soilDx=dFdx(soilUV),soilDy=dFdy(soilUV);\n  if(soilWeight>.001){\n   vec3 soil=textureGrad(uQaSoilBase,soilUV,soilDx,soilDy).rgb;\n   vec3 soilN=textureGrad(uQaSoilNormal,soilUV,soilDx,soilDy).rgb*2.-1.;\n   vec3 soilARH=textureGrad(uQaSoilARH,soilUV,soilDx,soilDy).rgb;\n   color=mix(color,soil*vec3(.68,.60,.48),soilWeight);\n   N=normalize(mix(N,sampleTurfN410(Ng,soilN,.65*normalFade),soilWeight));\n   rough=mix(rough,max(.86,soilARH.g),soilWeight);\n   materialAO410=mix(materialAO410,mix(.65,1.,soilARH.r),soilWeight);\n  }\n }"
  ]
];
 for(const [before,after] of edits){if(!source.includes(before))throw Error('River soil shader anchor missing: '+before);source=source.replace(before,after);}return source;
}
