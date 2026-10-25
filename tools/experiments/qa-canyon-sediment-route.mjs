export async function installCanyonSedimentRoute(page,enabled){
 await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 if(!enabled)return;
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='materialAO410=mix(1.,mix(.45,1.,arh.r),amount);';
  const code=`if(canyon){
   vec3 wp=worldPatternPosition(worldP);
   float deposit=smoothstep(.32,.62,materialNoise(vec3(wp.x*.10,0.,wp.z*.10))*.75+materialNoise(vec3(wp.x*.27,0.,wp.z*.27))*.25)*canyonFlat;
   float grain=dot(tex,vec3(.299,.587,.114));
   vec3 sand=vec3(.66,.44,.23)*(.94+.12*grain);
   color=mix(color,sand,deposit*.9);
   N=normalize(mix(N,Ng,deposit*.86));
   rough=mix(rough,.98,deposit);
   materialAO410=mix(materialAO410,1.,deposit*.9);
  }`;
  if(!body.includes(anchor))throw Error('Sediment shader anchor missing');
  body=body.replace(anchor,anchor+code.replaceAll('\n','\\n'));
  await route.fulfill({response,body});
 });
}
