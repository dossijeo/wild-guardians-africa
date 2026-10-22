// Retained moss height blend. Reuses existing maps at a rotated second scale.
export function mangroveMossEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('mangroveMoss')==='layered';
}
export function patchMangroveMoss(source){
 const anchor='vec3 arh=textureGrad(uGroundARH,uv,dx,dy).rgb;\n  float fade=';
 if(!source.includes(anchor))throw Error('Mangrove moss shader anchor missing');
 return source.replace(anchor,`vec3 arh=textureGrad(uGroundARH,uv,dx,dy).rgb;
  vec2 uv2=vec2(-uv.y,uv.x)*.57+vec2(.371,.619),dx2=vec2(-dx.y,dx.x)*.57,dy2=vec2(-dy.y,dy.x)*.57;
  vec3 arh2=textureGrad(uGroundARH,uv2,dx2,dy2).rgb;
  vec3 qaWorld=worldPatternPosition(worldP);
  float qaRegion=materialNoise(vec3(qaWorld.x*.18,6.3,qaWorld.z*.18));
  float qaHeight=arh.b-arh2.b+(qaRegion-.5)*.8;
  float qaWidth=max(.055,fwidth(qaHeight)*1.2);
  float qaMix=smoothstep(-qaWidth,qaWidth,qaHeight);
  if(qaMix<1.){
   vec3 tex2=textureGrad(uGroundDetailMap,uv2,dx2,dy2).rgb;
   vec3 normal2=textureGrad(uGroundNormal,uv2,dx2,dy2).rgb*2.-1.;
   normal2.xy=vec2(-normal2.y,normal2.x);
   tex=mix(tex2,tex,qaMix);mapN=mix(normal2,mapN,qaMix);
  }
  mapN=normalize(mapN);arh=mix(arh2,arh,qaMix);
  float fade=`);
}
