import {patchRiverWear} from './river-wear-qa-route.mjs';
export async function installRiverCoverTwoSidedRoute(page,enabled){
 await page.route('**/tools/experiments/qa-continuous-grass-river.js',async route=>{
  const response=await route.fetch();let body=patchRiverWear(await response.text());
  {
   const replacements=[['vec3(.93,1.08,.84)','vec3(1.14,1.18,1.05)'],['dayShade=vec3(.17,.28,.34)','dayShade=vec3(.14,.26,.32)'],['vec3(1.55,1.42,1.02)','vec3(1.77,1.79,1.42)']];
   for(const [a,b]of replacements){if(!body.includes(a))throw Error('River palette anchor missing: '+a);body=body.replace(a,b);}
  }
  if(enabled){const anchor='float drive=.35+.65*max(dot(N,uLightDir),0.);';if(!body.includes(anchor))throw Error('Two-sided light anchor missing');body=body.replace(anchor,'float nl=dot(N,uLightDir);float drive=.35+.65*(max(nl,0.)+.5*max(-nl,0.));');}
  await route.fulfill({response,body});
 });
}
