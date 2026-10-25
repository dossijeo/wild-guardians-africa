export async function installCanyonBankProximity(page){
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const a='if(canyon)ctx=vec4(1.,.5,.65,0.);';
  if(!body.includes(a))throw Error('Canyon constant context anchor missing');
  await route.fulfill({response,body:body.replace(a,'if(canyon)ctx=vec4(1.,.5,uGroundMapped>.5?ctx.b:0.,0.);')});
 });

 await page.route('**/src/rendering/biome-ground.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const a="this.volcanicAsh==='mask'?ashMask(data,bo):data";
  if(!body.includes(a))throw Error('Ground mask anchor missing');
  body="import {canyonBankMask} from '/tools/experiments/qa-canyon-bank-mask.js';\n"+body;
  body=body.replace(a,"this.field.c.biome==='canyons'?canyonBankMask(data,bo,this.field):("+a+")");
  await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/global-canyon-sand.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const a='canyonSandWeight=deposit*.9;color=mix(color,sand,deposit*.9);';
  if(!body.includes(a))throw Error('Canyon sediment anchor missing');
  body=body.replace(a,`float bankWet=smoothstep(.05,.95,ctx.b)*canyonFlat;
   deposit*=1.-bankWet*.45;
   ${a}
   color*=mix(vec3(1.),vec3(.72,.76,.80),bankWet);`);
  await route.fulfill({response,body});
 });
}
