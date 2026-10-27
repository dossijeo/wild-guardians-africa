import {disableIntegratedNight} from './night-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const integrated=process.env.WG_NIGHT_INTEGRATED==='1';
const out='docs/qa/global-visual-lab/'+(integrated?'night-integrated':'night-campaign');await mkdir(out,{recursive:true});const records=[],transitions=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])for(const variant of ['base','candidate']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});


 if(!integrated||variant==='base')await disableIntegratedNight(page);
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});
 if(!integrated&&variant==='candidate')await page.evaluate(async()=>{const {applyMaterialStudy}=await import('/tools/experiments/qa-night-biome.js');await applyMaterialStudy(window.qaCampaignWorld)});
 for(const [view,offset] of [['settlement',[22,16,18]]]){
 await page.evaluate(async offset=>{const w=window.qaCampaignWorld;w.camera.position.copy(w.controls.target).add({x:offset[0],y:offset[1],z:offset[2]});w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(.016);},offset);
  for(const phase of ['day','dusk','night','dawn']){
   const info=await page.evaluate(phase=>{const w=window.qaCampaignWorld;w.state.day=phase==='dawn'?2:1;w.state.time=({day:150,dusk:300.25,night:350,dawn:.25})[phase];w.render(.016);return {night:w.toon.uniforms.uNight.value,nightLight:w.toon.uniforms.uNightLight.value,day:w.state.day,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures,seed:712,time:w.state.time,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),quality:w.quality,structures:w.state.structures.length,plants:w.state.plants.length,chunks:w.chunks.size}},phase);
   await page.waitForTimeout(500);const file=`${biome}-${variant}-${view}-${phase}.png`;await page.locator('#stage canvas#world').screenshot({path:`${out}/${file}`});records.push({biome,variant,view,phase,file,...info,errors:[...errors]});
  }
 }
 const samples=await page.evaluate(()=>{const w=window.qaCampaignWorld,out=[];for(const edge of ['dusk','dawn'])for(const t of [0,.01,.05,.1,.25,.5,1,2,4]){w.state.day=edge==='dawn'?2:1;w.state.time=edge==='dusk'?300+t:t;w.render(.016);out.push({edge,t,night:w.toon.uniforms.uNight.value,nightLight:w.toon.uniforms.uNightLight.value});}return out;});transitions.push({biome,variant,samples});
 await page.close();await writeFile(`${out}/captures.json`,JSON.stringify({note:'Real campaign launched from menu; QA observation hook and pause; fixed time; no added entities.',records,transitions},null,2)+'\n');console.log(biome,variant);
}}finally{await browser.close()}
