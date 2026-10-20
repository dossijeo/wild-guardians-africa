import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/global-candidate-review';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:process.argv.includes('--headless')});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.argv.find(a=>a.startsWith('--biome='))?.slice(8)?.split(',')??(process.argv.includes('--headless')?['sabana','gran-rio','gran-canon']:['sabana']))){
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



 await page.evaluate(async()=>{window.qaGlobalReview=await(await import('/tools/experiments/qa-global-visual-review.js')).mountGlobalReview(window.qaCampaignWorld)});
 if(process.argv.includes('--headless')){
  await page.screenshot({path:out+'/'+biome+'-day.png'});const checks=[];
  for(const variant of biome==='gran-canon'?['A','B','A','B']:['A','B','C']){
   await page.locator(`[data-variant="${variant}"]`).click();
   await page.waitForFunction(v=>{const h=document.querySelector('#coverage-review')??document.querySelector('#canyon-review');return h.shadowRoot.querySelector(`[data-variant="${v}"]`).getAttribute('aria-pressed')==='true'&&!h.shadowRoot.querySelector(`[data-variant="${v}"]`).disabled},variant);
   const state=await page.evaluate(()=>{const w=window.qaCampaignWorld;w.render(.016);return w.state.biome==='gran-canon'?{enabled:w.qaWarmFloor.audit().enabled,bound:w.qaWarmFloor.audit().allTerrain}:{variant:w.qaContinuousGrass.variant,visible:w.qaContinuousGrass.group.visible,strength:w.qaContinuousGrass.uniforms.uCoverageWindStrength.value}});
   if(biome==='gran-canon'){if(state.enabled!==Number(variant==='B')||!state.bound)throw Error('Canyon control failed');}
   else if(state.variant!==variant||state.visible!==(variant!=='A')||state.strength!==8)throw Error('Coverage control failed');checks.push({variant,...state});
  }
  if(biome!=='gran-canon'){
   await page.locator('#wind').fill('12');await page.locator('#wind').dispatchEvent('input');if(await page.evaluate(()=>window.qaCampaignWorld.qaContinuousGrass.uniforms.uCoverageWindStrength.value)!==12)throw Error('Wind control failed');
   await page.locator('#motion').click();const t=await page.evaluate(()=>window.qaCampaignWorld.qaContinuousGrass.timeOverride);await page.waitForTimeout(100);if(await page.evaluate(()=>window.qaCampaignWorld.qaContinuousGrass.timeOverride)!==t)throw Error('Freeze failed');await page.locator('#motion').click();await page.waitForTimeout(100);if(await page.evaluate(()=>window.qaCampaignWorld.qaContinuousGrass.timeOverride)<=t)throw Error('Resume failed');
  }
  await page.locator('#camera').selectOption('game');await page.waitForTimeout(1200);await page.locator('#light').selectOption('night');
  const pose=await page.evaluate(()=>{const w=window.qaCampaignWorld;return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,glError:w.renderer.getContext().getError()}});
  const expected=biome==='gran-canon'?[12,18,18]:[22,16,18];if(pose.time!==350||pose.glError||pose.camera.some((v,i)=>Math.abs(v-pose.target[i]-expected[i])>1e-6))throw Error('Pose/light failed');
  await page.screenshot({path:out+'/'+biome+'-night.png'});
  const title=await page.locator('h2').last().textContent();if(/[ÃÂ]/.test(title))throw Error('Encoding failed');
  await page.evaluate(()=>window.qaGlobalReview.dispose());if(await page.locator('#coverage-review,#canyon-review').count())throw Error('Cleanup failed');
  if(biome==='gran-canon'&&await page.evaluate(()=>!!window.qaCampaignWorld.qaWarmFloor))throw Error('Canyon helper not released');
  if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,checks,pose,title,errors});await writeFile(out+'/checks.json',JSON.stringify(records,null,2)+'\n');console.log(biome,'verified');await page.close();
 }else{console.log('Revisión abierta: '+biome+'. Cierra la ventana para terminar.');await page.waitForEvent('close',{timeout:0});}
 }}finally{await browser.close()}
