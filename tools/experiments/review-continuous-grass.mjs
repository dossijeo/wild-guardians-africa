import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/continuous-grass-review';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:process.argv.includes('--headless')});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of ['sabana']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});


 await page.evaluate(async()=>{await (await import('/tools/experiments/qa-continuous-grass-occupancy.js')).applyMaterialStudy(window.qaCampaignWorld,'C');window.qaCoverageReview=await (await import('/tools/experiments/qa-continuous-grass-review.js')).mountCoverageReview(window.qaCampaignWorld);});
 if(process.argv.includes('--headless')){
  const results=[];
  for(const variant of ['A','B','C']){await page.locator(`[data-variant="${variant}"]`).click();await page.waitForFunction(v=>window.qaCampaignWorld.qaContinuousGrass.variant===v&&![...document.querySelector('#coverage-review').shadowRoot.querySelectorAll('button[data-variant]')].some(b=>b.disabled),variant);results.push(await page.evaluate(()=>({variant:window.qaCampaignWorld.qaContinuousGrass.variant,visible:window.qaCampaignWorld.qaContinuousGrass.group.visible,strength:window.qaCampaignWorld.qaContinuousGrass.uniforms.uCoverageWindStrength.value})));}
  if(results.some(r=>r.visible!==(r.variant!=='A')))throw Error('Variant visibility failed');
  await page.locator('#wind').fill('12');await page.locator('#wind').dispatchEvent('input');
  if(await page.evaluate(()=>window.qaCampaignWorld.qaContinuousGrass.uniforms.uCoverageWindStrength.value)!==12)throw Error('Wind strength control failed');
  await page.locator('#motion').click();const frozen=await page.evaluate(()=>window.qaCampaignWorld.qaContinuousGrass.timeOverride);await page.waitForTimeout(100);if(await page.evaluate(()=>window.qaCampaignWorld.qaContinuousGrass.timeOverride)!==frozen)throw Error('Freeze failed');
  await page.locator('#motion').click();await page.waitForTimeout(100);if(await page.evaluate(()=>window.qaCampaignWorld.qaContinuousGrass.timeOverride)<=frozen)throw Error('Resume failed');
  await page.locator('#camera').selectOption('game');await page.waitForTimeout(1200);await page.locator('#light').selectOption('night');
  const pose=await page.evaluate(()=>({camera:window.qaCampaignWorld.camera.position.toArray(),time:window.qaCampaignWorld.state.time,glError:window.qaCampaignWorld.renderer.getContext().getError()}));if(pose.time!==350||pose.camera[0]!==157||pose.glError!==0)throw Error('Camera/light failed');
  if(await page.locator('#coverage-review').innerText().then(t=>t.includes('Ã')||t.includes('Â')))throw Error('UI encoding failed');
  await page.screenshot({path:out+'/review-panel.png'});
  await page.evaluate(()=>window.qaCoverageReview.dispose());if(await page.locator('#coverage-review').count())throw Error('Panel cleanup failed');
  await writeFile(out+'/review-check.json',JSON.stringify({quality,results,pose,errors},null,2)+'\n');if(errors.length)throw Error(errors.join('\n'));await page.close();
 }else{console.log('Revisión abierta. Cierra la ventana para terminar.');await page.waitForEvent('close',{timeout:0});}
 }}finally{await browser.close()}
