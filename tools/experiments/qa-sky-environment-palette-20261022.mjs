export async function installSkyEnvironmentPalette(page){
 await page.route('**/src/rendering/sky-pixels.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor=/import\s*\{\s*buildEnvironmentPixels\s*\}\s*from\s*['"][^'"]*fluid-lighting-source\.js[^'"]*['"];?/;
  if(!anchor.test(body))throw Error('Sky pixel preparation anchor missing');
  body=body.replace(anchor,"import {buildGradedEnvironmentPixels as buildEnvironmentPixels} from '/tools/experiments/qa-sky-environment-palette-20261022.js';");
  await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/sky.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='images.forEach(({image,environment},i)=>{';
  if(!body.includes(anchor))throw Error('Sky audit anchor missing');
  body=body.replace(anchor,'globalThis.qaEnvironmentPalette=images.map(v=>v.environment.qaPalette??null);'+anchor);
  await route.fulfill({response,body});
 });
}
