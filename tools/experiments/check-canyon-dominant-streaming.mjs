import {chromium} from 'playwright';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
try{for(const sceneCase of [21]){
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:5190/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=global-lighting&visualLabReference=1`);
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 '),null,{timeout:120000});
 const steps=await page.evaluate(async()=>{
  const w=window.qaVisualReference.world,steps=[];const {applyMaterialStudy}=await import('/tools/experiments/qa-canyon-dominant.js');await applyMaterialStudy(w);w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};
  for(const dz of [0,96,-96]){
   w.controls.target.z+=dz;w.camera.position.z+=dz;w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(.016);
   const binding=w.qaCliffBinding();steps.push({dz,camera:w.camera.position.toArray(),chunks:[...w.chunks.keys()],...binding});if(!binding.allBound)throw Error('Missing cliff binding');

  }return steps;
 });records.push({sceneCase,steps});await page.close();
}await writeFile('docs/qa/global-visual-lab/canyon-dominant/streaming.json',JSON.stringify(records,null,2)+'\n');console.log(JSON.stringify(records));}finally{await browser.close()}
