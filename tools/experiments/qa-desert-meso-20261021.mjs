export async function installDesertRippleWarp(page){
 await page.route('**/src/rendering/global-desert-sand.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='N=normalize(T*mapN.x*normalAmount+B*mapN.y*normalAmount+Ng*max(mapN.z,.08));';
  const patch=anchor+`
   vec3 p=worldPatternPosition(worldP);
   float h=.85*materialNoise(p*.18)+.22*materialNoise(p*.43);
   vec3 dp1=dFdx(worldP),dp2=dFdy(worldP),r1=cross(dp2,Ng),r2=cross(Ng,dp1);
   float det=dot(dp1,r1);
   vec3 grad=sign(det)*(dFdx(h)*r1+dFdy(h)*r2);
   float fade=(1.-smoothstep(.6,2.,pixelSpan))*up*(1.-wear*.70);
   if(abs(det)>.00000001)N=normalize(abs(det)*N-grad*fade);`;
  if(!body.includes(anchor))throw Error('Desert meso anchor missing');
  await route.fulfill({response,body:body.replace(anchor,patch)});
 });
}
