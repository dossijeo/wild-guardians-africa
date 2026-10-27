export async function installCanyonMicroshadowRoute(page,enabled){
 await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 if(!enabled)return;
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const start='void groundMaterial417(';
  if(!body.includes(start))throw Error('Mapped ground missing');body=body.replace(start,'float qaCanyonMicroSun=1.;'+start);
  const anchor='materialAO410=mix(1.,mix(.45,1.,arh.r),amount);';
  const code=`
 if(canyon&&canyonFlat>.01){
  vec2 sunXZ=uLightDir.xz;float horizontal=max(length(sunXZ),.01);
  vec2 rayUV=mat2(.8,-.6,.6,.8)*(sunXZ/horizontal)*uGroundParams.x;
  float blocking=0.;
  for(int j=0;j<3;j++){
   float stepM=j==0?.05:(j==1?.12:.25);
   float neighbor=textureGrad(uGroundARH,uv+rayUV*stepM,dx,dy).b;
   float clearance=(neighbor-arh.b)*uGroundParams.w-stepM*max(uLightDir.y,.01)/horizontal;
   blocking=max(blocking,smoothstep(.003,.018,clearance));
  }
  qaCanyonMicroSun=1.-blocking*.45*canyonFlat*normalFade;
 }
`;
  if(!body.includes(anchor))throw Error('Ground AO anchor missing');body=body.replace(anchor,anchor+code.replaceAll('\n','\\n'));
  await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/african-toon.js*',async route=>{
  const response=await route.fetch();let body=await response.text();const anchor='vec3 biomeDirect=brdf4(toonN,toonV,uLightDir,groundAlbedo,groundRough,0.)*biomeSun*groundVisibility;';
  if(!body.includes(anchor))throw Error('Mapped direct anchor missing');body=body.replace(anchor,anchor+'if(uBiome>3.5&&uBiome<4.5)biomeDirect*=mix(qaCanyonMicroSun,1.,uNight);');await route.fulfill({response,body});
 });
}
