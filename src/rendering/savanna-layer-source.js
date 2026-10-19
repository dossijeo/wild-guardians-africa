// Experimental sand substrate with a straw surface. Both tile families are
// existing game assets; the existing ground mask controls where straw remains.
// UVs and clipping noise use world coordinates, so chunks meet without seams.
export const savannaLayerFunctions=`
uniform float uGroundLayered;
uniform sampler2D uLayerSandBase,uLayerSandNormal,uLayerSandARH;
void groundSavannaLayer(vec3 worldP,vec3 Ng,inout vec3 color,inout vec3 N,inout float rough,inout float wet){
 vec2 world=worldP.xz+uWorldOrigin;
 vec2 edgeWarp=vec2(materialNoise(vec3(world.x*.12+27.,0.,world.y*.12-9.)),materialNoise(vec3(world.x*.12-19.,0.,world.y*.12+31.)))-.5;
 vec2 contextUV=((worldP.xz-uGroundRect.xy+edgeWarp*3.)/uGroundRect.z+1.5)/uGroundRect.w;
 vec4 ctx=texture(uGroundMask,contextUV);
 if(uGroundMapped<.5)ctx=vec4(.5,.5,.65,0.);
 float up=smoothstep(.3,.82,Ng.y);
 float wear=ctx.a*up;
 float breakUp=materialNoise(vec3(world.x*.24,0.,world.y*.24));
 float broad=materialNoise(vec3(world.x*.085+17.,0.,world.y*.085-11.));
 float straw=smoothstep(.28,.66,ctx.r+(ctx.g-.5)*.23+(breakUp-.5)*.29+(broad-.5)*.20);
 straw*=up*(1.-wear*.96);
 vec2 sandUV=mat2(.8,-.6,.6,.8)*world*.20+uGroundSeed;
 vec2 strawUV=mat2(.8,-.6,.6,.8)*world*.155+uGroundSeed;
 vec2 sdx=dFdx(sandUV),sdy=dFdy(sandUV),tdx=dFdx(strawUV),tdy=dFdy(strawUV);
 float footprint=max(length(dFdx(worldP)),length(dFdy(worldP)));
 float reliefFade=1.-smoothstep(.065,.20,footprint);
 if(uGroundLayered>1.5&&straw>.15&&reliefFade>.01){
  vec3 V=normalize(cameraPosition-worldP);
  vec3 T=normalize(vec3(.8,0.,.6)-Ng*dot(Ng,vec3(.8,0.,.6)));
  vec3 B=normalize(cross(Ng,T));
  float nv=max(abs(dot(V,Ng)),.36);
  vec2 ray=vec2(dot(V,T),-dot(V,B))/nv*uGroundParams.w*.155*reliefFade*straw;
  vec2 p=strawUV+ray*.45,stepUV=ray/8.;float depth=0.;
  for(int k=0;k<8;k++){
   float h=textureGrad(uGroundARH,p,tdx,tdy).b;
   if(depth>=1.-h)break;
   p-=stepUV;depth+=.125;
  }
  strawUV=p;
 }
 vec3 sand=textureGrad(uLayerSandBase,sandUV,sdx,sdy).rgb*vec3(1.13,1.05,.89);
 vec3 strawColor=textureGrad(uGroundDetailMap,strawUV,tdx,tdy).rgb*vec3(1.12,1.05,.88);
 color=clamp(mix(sand,strawColor,straw)*(.95+.1*ctx.g),0.,1.);
 vec3 sn=textureGrad(uLayerSandNormal,sandUV,sdx,sdy).rgb*2.-1.;
 vec3 tn=textureGrad(uGroundNormal,strawUV,tdx,tdy).rgb*2.-1.;
 vec3 blended=normalize(mix(sn,tn,straw));
 float normalFade=1.-smoothstep(.12,.60,footprint);
 N=sampleTurfN410(Ng,blended,uGroundParams.z*uGroundMicro*normalFade*up);
 vec3 sarh=textureGrad(uLayerSandARH,sandUV,sdx,sdy).rgb;
 vec3 tarh=textureGrad(uGroundARH,strawUV,tdx,tdy).rgb;
 vec3 arh=mix(sarh,tarh,straw);
 rough=clamp(arh.g,.58,.99);wet=0.;
 materialAO410=mix(.45,1.,arh.r);
 materialCover410=1.;
}
`;
