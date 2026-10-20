import {disableIntegratedRoughness} from './roughness-qa-route.mjs';
import {disableIntegratedWater} from './water-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const study=process.env.WG_MATERIAL_STUDY??'volcanic-charcoal';const mode='fill';
const cases=(process.env.WG_PAIR_CASES??'16').split(',').map(Number);
const output=process.env.WG_PAIR_OUTPUT??'docs/qa/global-visual-lab/'+study+(process.env.WG_PAIR_VIEW==='water'?'/paired-water.json':'/paired.json');
const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
try{for(const sceneCase of cases){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 if(study==='volcanic-charcoal')await page.route('**/src/rendering/african-toon.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('shader.fragmentShader=patchVolcanicCharcoal(shader.fragmentShader);','/* QA baseline before charcoal integration */')});});
 if(study==='ground-roughness')await disableIntegratedRoughness(page);
 if(study.startsWith('water-'))await disableIntegratedWater(page);
 await page.goto(`http://127.0.0.1:5190/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=global-lighting&visualLabReference=1`);
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 ·'),null,{timeout:120000});
 if(process.env.WG_PAIR_VIEW==='water')await page.evaluate(async()=>{const {focusWater}=await import('/tools/experiments/qa-water-view.js');return focusWater(window.qaVisualReference.world)});
 if(process.env.WG_PAIR_VIEW==='side')await page.evaluate(()=>{const {world:w,state}=window.qaVisualReference;const px=state.plants.reduce((n,p)=>n+p.x,0)/state.plants.length,pz=state.plants.reduce((n,p)=>n+p.z,0)/state.plants.length,y=w.nav.field.surface(px,pz);w.controls.target.set(px,y+.9,pz);w.camera.position.set(px+22,y+10,pz);w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};w.render(.016);});
 await page.evaluate(async({mode,study})=>{
  const w=window.qaVisualReference.world;
  const materials=study.startsWith('water-')?(()=>{const set=new Set();w.scene.traverse(o=>{if(o.isMesh&&o.material?.userData?.paintUniforms&&o.material.userData.paintUniforms.uSurfaceLava.value<.5)set.add(o.material)});return [...set]})():[...new Set(w.terrainMeshes.map(m=>m.material))];
  const before=materials.map(m=>[m.onBeforeCompile,m.customProgramCacheKey]);
  const {applyMaterialStudy}=await import('/tools/experiments/qa-'+study+'.js');applyMaterialStudy(w);
  const after=materials.map(m=>[m.onBeforeCompile,m.customProgramCacheKey]);
  window.qaPairSet=(variant)=>{
   if(mode==='fill')materials.forEach((m,i)=>{[m.onBeforeCompile,m.customProgramCacheKey]=(variant?after:before)[i];m.needsUpdate=true;});
   else{w.terrainMeshes.forEach(m=>m.castShadow=!!variant);w.releaseNativeShadow.cache.invalidate();}
  };
  if(mode==='terrain'){
   // Force a depth pass on every measured frame: conservative moving-scene cost.
   w.releaseNativeShadow.cache.enabled=false;
  }
 },{mode,study});
 for(const phase of (process.env.WG_PAIR_PHASES??'day,night').split(',')){
  if(phase==='night')await page.locator('#night').evaluate(e=>e.click());
  await page.waitForFunction(t=>window.qaVisualReference.state.time===t&&!document.querySelector('#night').disabled,phase==='day'?150:350);
  for(const variant of (process.env.WG_PAIR_ORDER??'0,1,1,0').split(',').map(Number)){
   await page.evaluate(v=>window.qaPairSet(v),variant);await page.waitForTimeout(500);
   await page.locator('#benchmarkReport').evaluate(e=>e.textContent='');await page.locator('#benchmark').evaluate(e=>e.click());
   await page.waitForFunction(()=>{try{return !!JSON.parse(document.querySelector('#benchmarkReport').textContent).submittedCalls}catch{return false}},null,{timeout:120000});
   const report=JSON.parse(await page.locator('#benchmarkReport').textContent());
   records.push({sceneCase,phase,variant,view:process.env.WG_PAIR_VIEW??'game',camera:await page.evaluate(()=>({position:window.qaVisualReference.world.camera.position.toArray(),target:window.qaVisualReference.world.controls.target.toArray()})),report,errors:[...errors]});
   console.log(JSON.stringify({sceneCase,phase,variant,gpu:report.gpuElapsedMs?.mean,cpu:report.cpuSubmissionMs.mean,errors:errors.length}));
   await writeFile(output,JSON.stringify({mode,cases,order:records.map(r=>r.variant),note:'Same page, original and material-study programs; explicit order recorded; global-lighting baseline.',records},null,2)+'\n');
  }
 }
 await page.close();
}}finally{await browser.close()}
