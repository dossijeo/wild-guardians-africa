export async function routeDayReflection(page){
 await page.route('**/src/rendering/global-water-surface.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  body=body.replace('export function patchGlobalWaterSurface(source)','function originalPatchGlobalWaterSurface(source)');
  body+=`\nexport function patchGlobalWaterSurface(source){let s=originalPatchGlobalWaterSurface(source);const a='float f=.022+.978*pow(1.-max(dot(wn,V),0.),5.);',b='environment4(reflect(-V,wn),.10)';if(!s.includes(a)||!s.includes(b))throw Error('Day reflection anchors absent');s=s.replace(a,'vec3 reflectionN=wn;if(uNight<1.)reflectionN=normalize(vec3(wn.xz*mix(.25+.75*smoothstep(.12,.65,V.y),1.,uNight),wn.y).xzy);float f=.022+.978*pow(1.-max(dot(reflectionN,V),0.),5.);');return s.replace(b,'environment4(reflect(-V,reflectionN),.10)');}\n`;
  await route.fulfill({response,body});
 });
}
