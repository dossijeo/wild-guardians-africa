import {disableIntegratedCanyon} from './canyon-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const integrated=true;
const out='docs/qa/global-visual-lab/canyon-wall-foot/normal';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const biome of ['gran-canon'])for(const variant of ['base','candidate']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});


 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});
 await page.evaluate(async()=>{const {focusWater}=await import('/tools/experiments/qa-water-view.js');await focusWater(window.qaCampaignWorld);const w=window.qaCampaignWorld;w.camera.position.set(w.controls.target.x+22,w.controls.target.y+10,w.controls.target.z);w.render(.016)});
 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});
 if(variant==='candidate')await page.evaluate(async()=>{const {applyMaterialStudy}=await import('/tools/experiments/qa-canyon-wall-foot.js');await applyMaterialStudy(window.qaCampaignWorld)});
 await page.addStyleTag({content:'#stage>*:not(canvas){visibility:hidden!important}'});
 for(const [view,offset] of [['normal',[12,18,18]]]){
 await page.evaluate(async offset=>{const w=window.qaCampaignWorld;w.camera.position.copy(w.controls.target).add({x:offset[0],y:offset[1],z:offset[2]});w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(.016);},offset);
  for(const phase of ['day','night']){
   const info=await page.evaluate(phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.render(.016);return {glError:w.renderer.getContext().getError(),binding:w.qaCliffBinding?.()??null,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures,seed:712,time:w.state.time,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),quality:w.quality,structures:w.state.structures.length,plants:w.state.plants.length,chunks:w.chunks.size}},phase);
   await page.waitForTimeout(500);const file=`${biome}-${variant}-${view}-${phase}.png`;await page.locator('#stage canvas#world').screenshot({path:`${out}/${file}`});records.push({biome,variant,view,phase,file,...info,errors:[...errors]});
  }
 }
 await page.close();await writeFile(`${out}/captures.json`,JSON.stringify({note:'Real campaign launched from menu; QA observation hook and pause; fixed time; no added entities.',records},null,2)+'\n');console.log(biome,variant);
}}finally{await browser.close()}
