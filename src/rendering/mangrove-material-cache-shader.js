import {toonFunctions} from './african-toon-source.js';
// Static material composition cache. RGBA = secondary moss weight, moss/soil weight, final AO,
// final roughness. Color and normal detail, lighting and shadows remain live.
const noise=toonFunctions.slice(toonFunctions.indexOf('float detailHash('),toonFunctions.indexOf('vec3 toLinear4('));
export const bakeFragment=`precision highp float;
uniform sampler2D uGroundARH,uLayerSandARH,uGroundMask,uWetBank;
uniform vec4 uGroundRect,uGroundParams;uniform vec2 uGroundSeed;
uniform float resolution;varying vec2 vUv;
${noise}
void main(){
 vec2 local=(vUv*(resolution+2.)-1.)/resolution;
 vec2 p=uGroundRect.xy+local*48.;
 vec2 uv=mat2(.8,-.6,.6,.8)*p*uGroundParams.x+uGroundSeed;
 vec2 dx=dFdx(uv),dy=dFdy(uv);
 vec2 uv2=vec2(-uv.y,uv.x)*.57+vec2(.371,.619);
 vec2 dx2=vec2(-dx.y,dx.x)*.57,dy2=vec2(-dy.y,dy.x)*.57;
 vec3 arh=textureGrad(uGroundARH,uv,dx*1.35,dy*1.35).rgb;
 vec3 arh2=textureGrad(uGroundARH,uv2,dx2*1.35,dy2*1.35).rgb;
 float region=materialNoise(vec3(p.x*.18,6.3,p.y*.18));
 float h=arh.b-arh2.b+(region-.5)*.8;
 float width=max(.055,fwidth(h)*1.2);
 float mossMix=smoothstep(-width,width,h);
 arh=mix(arh2,arh,mossMix);
 vec2 ctxUV=((p-uGroundRect.xy)/uGroundRect.z+1.5)/uGroundRect.w;
 vec4 ctx=texture2D(uGroundMask,ctxUV);
 float patchNoise=materialNoise(vec3(p.x*.12,3.7,p.y*.12));
 float cover=smoothstep(.30,.50,ctx.g*.64+ctx.r*.18+patchNoise*.18-ctx.a*.10);
 cover=mix(.38,.98,cover);
 float shoreDistance=texture2D(uWetBank,ctxUV).r*8.;
 float bankWet=(1.-smoothstep(.2,3.2,shoreDistance))*smoothstep(.20,.75,patchNoise);
 cover=mix(cover,.18,bankWet*.85);
 float baseCover=cover;
 vec3 soil=textureGrad(uLayerSandARH,uv,dx,dy).rgb;
 float hd=clamp((arh.b-186./255.)/(69./255.),-.5,.5)-clamp((soil.b-39./255.)/(123./255.),-.5,.5)+(cover*2.-1.)*1.4;
 float tw=max(.10,fwidth(hd)*1.5);
 cover=smoothstep(-tw,tw,hd);
 float ao=mix(mix(.65,1.,soil.r),mix(.45,1.,arh.r),cover);
 float rough=mix(clamp(soil.g,.78,.96),clamp(arh.g,.5,.99),cover);
 gl_FragColor=vec4(mossMix,cover,ao,rough);
}`;
export const liveBranch=`if(uGroundPureMoss>.5){
 vec2 uv=mat2(.8,-.6,.6,.8)*worldP.xz*uGroundParams.x+uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin*uGroundParams.x,1.);
 vec2 dx=dFdx(uv),dy=dFdy(uv);
 vec2 cacheUV=((worldP.xz-uGroundRect.xy)/48.*uQaCacheResolution+1.)/(uQaCacheResolution+2.);
 vec4 cached=texture(uQaGroundCache,cacheUV);
 vec3 tex=textureGrad(uGroundDetailMap,uv,dx*1.35,dy*1.35).rgb;
 vec3 mapN=textureGrad(uGroundNormal,uv,dx*1.35,dy*1.35).rgb*2.-1.;
 vec2 secondaryUV=uv+floor(mat2(.8,-.6,.6,.8)*uWorldOrigin*uGroundParams.x);
 vec2 uv2=vec2(-secondaryUV.y,secondaryUV.x)*.57+vec2(.371,.619),dx2=vec2(-dx.y,dx.x)*.57,dy2=vec2(-dy.y,dy.x)*.57;
 if(cached.r<1.){
  vec3 tex2=textureGrad(uGroundDetailMap,uv2,dx2*1.35,dy2*1.35).rgb;
  vec3 n2=textureGrad(uGroundNormal,uv2,dx2*1.35,dy2*1.35).rgb*2.-1.;n2.xy=vec2(-n2.y,n2.x);
  tex=mix(tex2,tex,cached.r);mapN=mix(n2,mapN,cached.r);
 }
 mapN=normalize(mapN);
 float fade=1.-smoothstep(.12,.60,max(length(dFdx(worldP)),length(dFdy(worldP))));
 color=tex*vec3(1.,1.03,.96);N=sampleTurfN410(Ng,mapN,uGroundParams.z*uGroundMicro*.8*fade);
 qaSoilWeight=1.-cached.g;
 if(qaSoilWeight>0.){
  vec3 soilRaw=textureGrad(uLayerSandBase,uv,dx,dy).rgb;
  vec3 soil=sRGBTransferOETF(vec4(toLinear4(soilRaw)*vec3(.58,.61,.64),1.)).rgb;
  vec3 soilN=textureGrad(uLayerSandNormal,uv,dx,dy).rgb*2.-1.;
  float soilRough=textureGrad(uLayerSandARH,uv,dx,dy).g;
  qaSoilAlbedo=toLinear4(soilRaw)*vec3(.58,.61,.64);qaSoilNormal=sampleTurfN410(Ng,soilN,.55*fade);qaSoilRough=max(.04,soilRough*.52);
  color=mix(soil,color,cached.g);N=normalize(mix(qaSoilNormal,N,cached.g));
 }
 rough=cached.a;wet=0.;materialAO410=cached.b;materialCover410=cached.g;return;
 }
 `;

