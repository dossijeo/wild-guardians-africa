import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/campaign-shadow-review';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const biome of ['sabana','gran-rio','gran-canon']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
 await page.goto('http://127.0.0.1:5190/?qa-seed=712');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});
 for(const variant of ['base','fill','terrain']){
  if(variant==='fill')await page.evaluate(async()=>{const {applyGroundShadeCoherence}=await import('/tools/experiments/qa-ground-shadow-fill.js');applyGroundShadeCoherence(window.qaCampaignWorld)});
  if(variant==='terrain')await page.evaluate(()=>{const w=window.qaCampaignWorld;w.terrainMeshes.forEach(m=>m.castShadow=true);w.releaseNativeShadow.cache.invalidate()});
  for(const phase of ['day','night']){
   const info=await page.evaluate(phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.render(.016);return {seed:712,time:w.state.time,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),quality:w.quality,structures:w.state.structures.length,plants:w.state.plants.length,chunks:w.chunks.size}},phase);
   await page.waitForTimeout(500);const file=`${biome}-${variant}-${phase}.png`;await page.locator('#stage canvas#world').screenshot({path:`${out}/${file}`});records.push({biome,variant,phase,file,...info,errors:[...errors]});
  }
 }
 await page.close();await writeFile(`${out}/captures.json`,JSON.stringify({note:'Real campaign launched from menu; QA observation hook and pause; fixed time; no added entities.',records},null,2)+'\n');console.log(biome);
}}finally{await browser.close()}
