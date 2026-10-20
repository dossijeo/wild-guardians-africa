import {chromium} from 'playwright';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
try{for(const sceneCase of [1,6,21]){
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:5190/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=global-lighting&visualLabReference=1`);
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 '),null,{timeout:120000});
 const steps=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js'),w=window.qaVisualReference.world,steps=[];
  for(const dz of [0,96,-96]){
   w.controls.target.z+=dz;w.camera.position.z+=dz;w.syncChunks();await w.whenChunksReady();w.render(.016);
   const mats=[...new Set(w.terrainMeshes.map(m=>m.material))];let patched=0;
   for(const m of mats){const shader={...(m.isMeshBasicMaterial?THREE.ShaderLib.basic:THREE.ShaderLib.standard),uniforms:{}};m.onBeforeCompile(shader,w.renderer);if(shader.fragmentShader.includes('baseRough=max(baseRough,.86)'))patched++;}
   steps.push({dz,chunks:w.chunks.size,materials:mats.length,patched});if(patched!==mats.length)throw Error('Missing roughness in streamed ground');
  }return steps;
 });records.push({sceneCase,steps});await page.close();
}await writeFile('docs/qa/global-visual-lab/roughness-integrated/streaming.json',JSON.stringify(records,null,2)+'\n');console.log(JSON.stringify(records));}finally{await browser.close()}
