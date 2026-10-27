export async function installVolcanicPomRefine(page){
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const from=`float depth=0.;
  for(int k=0;k<8;k++){
   float h=textureGrad(uGroundARH,p,dx,dy).b;
   if(depth>=1.-h)break;
   p-=stepUV;depth+=.125;
  }
  uv=p;`;
  const to=`float depth=0.;vec2 previousP=p;float previousError=0.;
  for(int k=0;k<8;k++){
   float h=textureGrad(uGroundARH,p,dx,dy).b;
   float error=1.-h-depth;
   if(error<=0.){if(k>0&&rock)p=mix(previousP,p,clamp(previousError/max(previousError-error,.00001),0.,1.));break;}
   previousP=p;previousError=error;
   p-=stepUV;depth+=.125;
  }
  uv=p;`;
  const anchor=from.replaceAll('\n','\\n');
  if(!body.includes(anchor))throw Error('POM refinement anchor missing');
  await route.fulfill({response,body:body.replace(anchor,to.replaceAll('\n','\\n'))});
 });
}
