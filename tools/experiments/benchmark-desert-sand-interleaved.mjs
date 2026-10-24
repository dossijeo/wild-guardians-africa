import {disableIntegratedDesertLight} from './desert-light-qa-route.mjs';
import {disableIntegratedNight} from './night-qa-route.mjs';
import {disableIntegratedCanyon} from './canyon-qa-route.mjs';
import {disableIntegratedRoughness} from './roughness-qa-route.mjs';
import {disableIntegratedWater} from './water-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const study=process.env.WG_MATERIAL_STUDY??'desert-sand-dry-specular';const mode='fill';
const cases=(process.env.WG_PAIR_CASES??'26').split(',').map(Number);
const quality=process.env.WG_PAIR_QUALITY??'media';
const output=process.env.WG_PAIR_OUTPUT??`docs/qa/global-visual-lab/desert-aerial-sand/dry-specular/performance/${quality}-interleaved.json`;
const reportDir=output.slice(0,output.lastIndexOf('/'));await mkdir(reportDir,{recursive:true});
await mkdir('docs/qa/global-visual-lab/desert-aerial-sand',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
try{for(const sceneCase of cases){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 if(study==='desert-soft-light')await disableIntegratedDesertLight(page);
 if(study.startsWith('night-'))await disableIntegratedNight(page);
 if(study.startsWith('canyon-'))await disableIntegratedCanyon(page);
 if(study==='volcanic-charcoal')await page.route('**/src/rendering/african-toon.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('shader.fragmentShader=patchVolcanicCharcoal(shader.fragmentShader);','/* QA baseline before charcoal integration */')});});
 if(study==='ground-roughness')await disableIntegratedRoughness(page);
 if(study.startsWith('water-'))await disableIntegratedWater(page);
 // QA-only in-memory route: paired eight-frame ABBA blocks, no production edits.
 await page.route('**/tests/browser/african-toon.html*',async route=>{
  if(!route.request().url().includes('html-proxy'))return route.continue();
  const response=await route.fetch();let source=await response.text();
  const edits=[
   ['for(let i=0;i<30+180;i++){','for(let i=0;i<32+256;i++){'],
   ['if(i===30){recording=true;previous=stamp;}','if(i===32){recording=true;previous=stamp;}'],
   ['if(pairedGround)setOrganicGround(i%4===0||i%4===3);','window.qaPairSet([0,1,1,0][Math.floor((i<32?i:i-32)/8)%4]);if(pairedGround)setOrganicGround(i%4===0||i%4===3);'],
   ['samples.push({cameraPose:','samples.push({sandVariant:window.qaSandVariant,cameraPose:'],
   ['const result={schema:2,','const result={schema:2,sandInterleavedSamples:samples,'],
   ['warmupFrames:30,','warmupFrames:32,']
  ];
  for(const [from,to]of edits){if(!source.includes(from))throw Error('Interleave anchor missing: '+from);source=source.replace(from,to)}
  await route.fulfill({response,body:source});
 });
 await page.goto(`http://127.0.0.1:5190/tests/browser/african-toon.html?case=${sceneCase}&q=${quality}&visualLab=global-lighting&visualLabReference=1`);
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 '),null,{timeout:120000});
 if(process.env.WG_PAIR_VIEW==='water')await page.evaluate(async()=>{const {focusWater}=await import('/tools/experiments/qa-water-view.js');return focusWater(window.qaVisualReference.world)});
 if(process.env.WG_PAIR_VIEW==='side')await page.evaluate(()=>{const {world:w,state}=window.qaVisualReference;const px=state.plants.reduce((n,p)=>n+p.x,0)/state.plants.length,pz=state.plants.reduce((n,p)=>n+p.z,0)/state.plants.length,y=w.nav.field.surface(px,pz);w.controls.target.set(px,y+.9,pz);w.camera.position.set(px+22,y+10,pz);w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};w.render(.016);});
 await page.evaluate(async({mode,study})=>{
  const w=window.qaVisualReference.world;
  const set=new Set();w.scene.traverse(o=>{for(const m of [].concat(o.material??[]))if(m?.userData.biomeGround&&m.userData.groundBiome==='desert')set.add(m)});const materials=[...set];
  const snapshot=()=>({materials:materials.map(m=>[m.onBeforeCompile,m.customProgramCacheKey,m.userData.biomeGround.uGroundParams.value.clone()]),textures:w.biomeGround.textures.slice()});
  const before=snapshot();await(await import('/tools/experiments/qa-'+study+'.js')).applyMaterialStudy(w);const after=snapshot();
  window.qaPairSet=variant=>{window.qaSandVariant=variant;const state=variant?after:before;materials.forEach((m,i)=>{[m.onBeforeCompile,m.customProgramCacheKey]=state.materials[i];m.userData.biomeGround.uGroundParams.value.copy(state.materials[i][2]);m.needsUpdate=true});w.biomeGround.textures=state.textures.slice();for(const m of materials)for(const [key,i] of [['uGroundDetailMap',0],['uGroundNormal',1],['uLayerSandBase',0],['uLayerSandNormal',1]])if(m.userData.biomeGround[key])m.userData.biomeGround[key].value=state.textures[i];};
  if(mode==='terrain'){
   // Force a depth pass on every measured frame: conservative moving-scene cost.
   w.releaseNativeShadow.cache.enabled=false;
  }
 },{mode,study});
 for(const phase of (process.env.WG_PAIR_PHASES??'day,night').split(',')){
  if(phase==='night')await page.locator('#night').evaluate(e=>e.click());
  await page.waitForFunction(t=>window.qaVisualReference.state.time===t&&!document.querySelector('#night').disabled,phase==='day'?150:350);
  for(const [label,v] of [['A',0],['B',1],['A2',0]]){const data=await page.evaluate(v=>{window.qaPairSet(v);const w=window.qaVisualReference.world;w.render(.016);return w.renderer.domElement.toDataURL('image/png').split(',')[1]},v);await writeFile(`${reportDir}/return-${quality}-${phase}-${label}.png`,Buffer.from(data,'base64'));}
  for(const variant of [0,1,2]){
   await page.evaluate(v=>window.qaPairSet(v),variant);await page.waitForTimeout(500);
   await page.locator('#benchmarkReport').evaluate(e=>e.textContent='');await page.locator('#benchmark').evaluate(e=>e.click());
   await page.waitForFunction(()=>{try{return !!JSON.parse(document.querySelector('#benchmarkReport').textContent).submittedCalls}catch{return false}},null,{timeout:120000});
   const report=JSON.parse(await page.locator('#benchmarkReport').textContent());
   records.push({protocol:'8-frame-ABBA-256-samples',sceneCase,quality,study,phase,repeat:variant,view:process.env.WG_PAIR_VIEW??'game',camera:await page.evaluate(()=>({position:window.qaVisualReference.world.camera.position.toArray(),target:window.qaVisualReference.world.controls.target.toArray()})),report,errors:[...errors]});
   console.log(JSON.stringify({sceneCase,phase,variant,gpu:report.gpuElapsedMs?.mean,cpu:report.cpuSubmissionMs.mean,errors:errors.length}));
   await writeFile(output,JSON.stringify({mode,cases,order:'8-frame ABBA cycles within each 256-frame repetition',note:study==='night-readability'?'Same-page ABBA of night-light uniform 1.12/1.55; shader source and geometry unchanged.':'In-memory QA instrumentation, same page; 32 warmup + 256 measured frames per repeat, 8-frame ABBA blocks; sandVariant tags and raw CPU/GPU records retained. QA program switch outside CPU render interval. Not a realtime switching feature.',records},null,2)+'\n');
  }
 }
 await page.close();
}}finally{await browser.close()}
