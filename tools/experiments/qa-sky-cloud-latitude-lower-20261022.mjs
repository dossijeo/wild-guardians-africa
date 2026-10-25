export async function installSkyDepth(page){
 await page.route('**/src/rendering/sky-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='base=applySaturation(base,uSkySaturation);';
  const patch=`base=applySaturation(base,uSkySaturation);
 float qaAltitude=smoothstep(-.05,.65,d.y);
 if(uSkyKind<.5){
 float altitude=smoothstep(-.03,.45,d.y);
 float cloud=smoothstep(.62,.84,min(base.r,base.g))*(1.-smoothstep(.035,.16,base.b-base.r));
 vec3 clearSky=mix(vec3(.66,.76,.83),vec3(.22,.48,.78),altitude);
 base=mix(base,clearSky,(.35+.40*altitude)*(1.-cloud));
 base=mix(base,base*vec3(1.04,1.02,.98),cloud*.65);
 float horizon=1.-smoothstep(.02,.32,max(d.y,0.));
 float lum=dot(base,vec3(.2126,.7152,.0722));
 vec3 haze=vec3(.70,.88,1.06)*lum;
 base=mix(base,haze,horizon*.55*(1.-cloud));
 }
 else {base*=vec3(.66,.80,1.05);}`;
  if(!body.includes(anchor))throw Error('Sky grading anchor missing');
  body=body.replace(anchor,JSON.stringify(patch).slice(1,-1));
  const sample='vec3 base=pow(max(1.-exp(-max(readHDR(uv)';
  if(!body.includes(sample))throw Error('Sky sampling anchor missing');
  body=body.replace(sample,'if(uSkyKind<.5)uv.y+=.045*smoothstep(.10,.50,uv.y); '+sample);await route.fulfill({response,body});
 });
}
