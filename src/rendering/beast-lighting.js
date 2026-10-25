// Character material lighting only. Reuses scene uniforms and shadow
// visibility; never creates lights or changes the environment/exposure.
export function beastLightingFunctions(source){
 const start=source.indexOf('vec3 africanToon4(');if(start<0)throw Error('Beast lighting: toon function missing');
 const body=source.indexOf('{',start);let depth=1,end=body+1;
 while(depth&&end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}
 if(depth)throw Error('Beast lighting: unclosed toon function');
 const legacy=source.slice(start,end).replace('vec3 africanToon4(','vec3 legacyBeastToon4(');
 return source.slice(0,start)+legacy+'\nuniform float uBeastStyle;\n'+`vec3 africanToon4(vec3 lit,vec3 albedo,vec3 N,vec3 V,vec3 sun,vec3 reflected,float rough,float visibility,float leaf,float wet,float metal,float nv,vec3 worldP){
  if(uBeastStyle<.5)return legacyBeastToon4(lit,albedo,N,V,sun,reflected,rough,visibility,leaf,wet,metal,nv,worldP);
  vec3 keyDir=normalize(V*.62+vec3(0.,.82,0.)+sun*.16);
  float key=smoothstep(-.18,.92,dot(N,keyDir));
  vec3 keyColor=mix(vec3(1.16,1.04,.88),vec3(.70,.61,.49),uNight);
  vec3 fillColor=mix(vec3(.22,.23,.25),vec3(.15,.17,.21),uNight);
  float shadow=mix(.58,1.,clamp(visibility,0.,1.));
  vec3 beastLight=albedo*(fillColor+keyColor*(.22+.78*key)*shadow);
  float rim=pow(clamp(1.-nv,0.,1.),2.8)*smoothstep(-.30,.55,N.y);
  beastLight+=sqrt(max(albedo,vec3(0.)))*vec3(.11,.15,.21)*rim*mix(.45,.85,uNight);
  beastLight+=reflected*.012*(1.-rough*.6);
  vec3 color=saturateGrade4(filmic4(beastLight),1.08);
  color=clamp((color-vec3(.40))*1.10+vec3(.40),0.,1.);
  float edge=smoothstep(.30,.68,length(fwidth(N))*2.);
  return color*(1.-edge*.10);
 }`+source.slice(end);
}
