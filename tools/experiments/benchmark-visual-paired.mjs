import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const mode=process.env.WG_PAIR_MODE??'fill';
const cases=(process.env.WG_PAIR_CASES??'1,6,21').split(',').map(Number);
const output=`docs/qa/global-visual-lab/${mode==='fill'?'ground-shadow-fill':'terrain-shadow-volume'}/paired-${mode}.json`;
const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
try{for(const sceneCase of cases){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(`http://127.0.0.1:5190/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=0&visualLabReference=1`);
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 ·'),null,{timeout:120000});
 await page.evaluate(async(mode)=>{
  const w=window.qaVisualReference.world;
  const materials=[...new Set(w.terrainMeshes.map(m=>m.material))];
  const before=materials.map(m=>[m.onBeforeCompile,m.customProgramCacheKey]);
  const {applyGroundShadeCoherence}=await import('/tools/experiments/qa-ground-shadow-fill.js');applyGroundShadeCoherence(w);
  const after=materials.map(m=>[m.onBeforeCompile,m.customProgramCacheKey]);
  window.qaPairSet=(variant)=>{
   if(mode==='fill')materials.forEach((m,i)=>{[m.onBeforeCompile,m.customProgramCacheKey]=(variant?after:before)[i];m.needsUpdate=true;});
   else{w.terrainMeshes.forEach(m=>m.castShadow=!!variant);w.releaseNativeShadow.cache.invalidate();}
  };
  if(mode==='terrain'){
   // Force a depth pass on every measured frame: conservative moving-scene cost.
   w.releaseNativeShadow.cache.enabled=false;
  }
 },mode);
 for(const phase of ['day','night']){
  if(phase==='night')await page.locator('#night').evaluate(e=>e.click());
  await page.waitForFunction(t=>window.qaVisualReference.state.time===t&&!document.querySelector('#night').disabled,phase==='day'?150:350);
  for(const variant of [0,1,1,0,1,0,0,1]){
   await page.evaluate(v=>window.qaPairSet(v),variant);await page.waitForTimeout(500);
   await page.locator('#benchmarkReport').evaluate(e=>e.textContent='');await page.locator('#benchmark').evaluate(e=>e.click());
   await page.waitForFunction(()=>{try{return !!JSON.parse(document.querySelector('#benchmarkReport').textContent).submittedCalls}catch{return false}},null,{timeout:120000});
   const report=JSON.parse(await page.locator('#benchmarkReport').textContent());
   records.push({sceneCase,phase,variant,report,errors:[...errors]});
   console.log(JSON.stringify({sceneCase,phase,variant,gpu:report.gpuElapsedMs?.mean,cpu:report.cpuSubmissionMs.mean,errors:errors.length}));
   await writeFile(output,JSON.stringify({mode,cases,note:'Same page, original and candidate programs; ABBA BAAB; terrain mode disables shadow cache to measure every depth pass.',records},null,2)+'\n');
  }
 }
 await page.close();
}}finally{await browser.close()}
