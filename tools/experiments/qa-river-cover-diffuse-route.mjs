import {patchRiverWear} from './river-wear-qa-route.mjs';
export async function installRiverCoverDiffuseRoute(page,enabled){
 await page.route('**/tools/experiments/qa-continuous-grass-river.js',async route=>{
  const response=await route.fetch();let body=patchRiverWear(await response.text());
  {
   const replacements=[['vec3(.93,1.08,.84)','vec3(1.14,1.18,1.05)'],['dayShade=vec3(.17,.28,.34)','dayShade=vec3(.14,.26,.32)'],['vec3(1.55,1.42,1.02)','vec3(1.77,1.79,1.42)']];
   for(const [a,b]of replacements){if(!body.includes(a))throw Error('River palette anchor missing: '+a);body=body.replace(a,b);}
  }
  if(enabled){
   const changes=[
    ['dayShade=vec3(.14,.26,.32)','dayShade=vec3(.55,.63,.67)'],
    ['vec3(1.77,1.79,1.42)','vec3(3.65,3.30,2.78)'],
    ['float drive=.35+.65*max(dot(N,uLightDir),0.);','float drive=(.96/3.14159265359)*max(dot(N,uLightDir),0.);'],
    ['base*mix(dayShade,nightShade,uNight)','base*mix(dayShade,nightShade,uNight)*(.76+.24*clamp(N.y,0.,1.))']
   ];
   for(const [a,b] of changes){if(!body.includes(a))throw Error('Diffuse anchor missing: '+a);body=body.replace(a,b);}
  }
  await route.fulfill({response,body});
 });
}
