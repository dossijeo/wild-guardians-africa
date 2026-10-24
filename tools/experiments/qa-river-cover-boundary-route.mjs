import {patchRiverWear} from './river-wear-qa-route.mjs';
export async function installRiverCoverBoundaryRoute(page,enabled){
 await page.route('**/tools/experiments/qa-continuous-grass-river.js',async route=>{
  const response=await route.fetch();let body=patchRiverWear(await response.text());
  {
   const replacements=[['vec3(.93,1.08,.84)','vec3(1.14,1.18,1.05)'],['dayShade=vec3(.17,.28,.34)','dayShade=vec3(.14,.26,.32)'],['vec3(1.55,1.42,1.02)','vec3(1.77,1.79,1.42)']];
   for(const [a,b]of replacements){if(!body.includes(a))throw Error('River palette anchor missing: '+a);body=body.replace(a,b);}
  }
  if(enabled){
   const anchor='vCoverageColor=base*mix(dayShade,nightShade,uNight);vCoverageSun=base*sun*drive;vCoverageTip=uv.x;';
   if(!body.includes(anchor))throw Error('Boundary diagnostic anchor missing');
   body=body.replace(anchor,'vCoverageColor=vec3(1.-farFade,.12,1.-clamp(coverageAnchor.w/.65,0.,1.));vCoverageSun=vec3(0.);vCoverageTip=uv.x;');
   const output='gl_FragColor=vec4(clamp((lit*(2.51*lit+.03))/(lit*(2.43*lit+.59)+.14),0.,1.),1.);';
   if(!body.includes(output))throw Error('Diagnostic output missing');
   body=body.replace(output,'gl_FragColor=vec4(vCoverageColor,1.);');
  }
  await route.fulfill({response,body});
 });
}
