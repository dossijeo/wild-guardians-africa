// Optional visual-lab candidate. GPU cost is still pending measurement.
export function desertMesoEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);
 return q.get('visualLab')==='global-lighting'&&q.get('sandRelief')==='1'&&q.get('sandMeso')==='1';
}
export function patchDesertMeso(source){
 const anchor='N=normalize(T*mapN.x*normalAmount+B*mapN.y*normalAmount+Ng*max(mapN.z,.08));';
 if(!source.includes(anchor))throw Error('Desert meso shader anchor missing');
 return source.replace(anchor,anchor+`
   vec3 p=worldPatternPosition(worldP);
   float h=.85*materialNoise(p*.18)+.22*materialNoise(p*.43);
   vec3 dp1=dFdx(worldP),dp2=dFdy(worldP),r1=cross(dp2,Ng),r2=cross(Ng,dp1);
   float det=dot(dp1,r1);
   vec3 grad=sign(det)*(dFdx(h)*r1+dFdy(h)*r2);
   float fade=(1.-smoothstep(.25,1.2,pixelSpan))*up*(1.-wear*.70);
   if(abs(det)>.00000001)N=normalize(abs(det)*N-grad*fade);`);
}
