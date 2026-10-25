// QA color-only experiment. Depth effects and impostor crossfade remain unvalidated.
export async function installObstructionMsaaRoute(page){
 await page.route('**/src/rendering/obstruction.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const discard='if(vNativeVisibility<.999){if(vNativeVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vNativeVisibility)discard;}';
  const anchor="recordNativeDepthHook(material,previous,'obstruction');";
  if(!body.includes(discard)||!body.includes(anchor))throw Error('Obstruction MSAA anchor missing');
  body=body.replace(discard,'if(vNativeVisibility<.002)discard;');
  body=body.replace(anchor,`const qaCompile=material.onBeforeCompile;material.alphaToCoverage=true;
  material.onBeforeCompile=(shader,renderer)=>{qaCompile(shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=clamp(vNativeVisibility,0.,1.);\\n#include <opaque_fragment>');};
  `+anchor);
  await route.fulfill({response,body});
 });
}
