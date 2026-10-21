export async function installSkyDepth(page){
 await page.route('**/src/rendering/sky-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='base=applySaturation(base,uSkySaturation);';
  const patch=`base=applySaturation(base,uSkySaturation);
 float qaAltitude=smoothstep(-.05,.65,d.y);
 if(uSkyKind<.5){base=mix(base,base*vec3(.66,.85,1.12),qaAltitude*.65);base=mix(base,base*vec3(1.04,1.01,.96),(1.-qaAltitude)*.25);}
 else {base*=vec3(.66,.80,1.05);}`;
  if(!body.includes(anchor))throw Error('Sky grading anchor missing');
  body=body.replace(anchor,JSON.stringify(patch).slice(1,-1));await route.fulfill({response,body});
 });
}
