import {installObstructionBlendRoute} from './qa-obstruction-blend-route.mjs';

// Deliberately isolated QA candidate: nearest native surface plus alpha atlas.
// Atlas instances remain batched and unsorted; overlapping crowns require review.
export async function installImpostorBlendRoute(page){
 await installObstructionBlendRoute(page,{singleSurface:true,cheapDepth:true});
 await page.route('**/tools/experiments/far-impostor-prototype.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const discard='if(coverageThreshold(gl_FragCoord.xy)<1.-vMix*vDensityFade)discard;';
  const options='const material=new THREE.ShaderMaterial({uniforms,fog:true,side:THREE.DoubleSide,';
  const output='#include <tonemapping_fragment>';
  if(![discard,options,output].every(a=>body.includes(a)))throw Error('Impostor alpha QA anchor missing');
  body=body.replace(discard,'if(vMix*vDensityFade<.002)discard;');
  body=body.replace(options,'const material=new THREE.ShaderMaterial({uniforms,fog:true,transparent:true,depthWrite:false,forceSinglePass:true,side:THREE.DoubleSide,');
  body=body.replace(output,'gl_FragColor.a=clamp(vMix*vDensityFade,0.,1.);\n '+output);
  await route.fulfill({response,body});
 });
}
