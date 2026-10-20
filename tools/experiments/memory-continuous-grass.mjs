import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/continuous-grass';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
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



 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.set(135,9.400129699707032,45);w.camera.position.set(157,25.400129699707032,63);w.syncChunks();await w.whenChunksReady();w.render(.016)});await page.waitForTimeout(1200);
 const measure=async()=>{await cdp.send('HeapProfiler.collectGarbage');const p=await cdp.send('Performance.getMetrics');return {jsHeapBytes:p.metrics.find(m=>m.name==='JSHeapUsedSize').value,...await page.evaluate(()=>({renderer:{...window.qaCampaignWorld.renderer.info.memory},programs:window.qaCampaignWorld.renderer.info.programs.length}))}};
 const before=await measure();
 const audit=await page.evaluate(async()=>{const w=window.qaCampaignWorld;await (await import('/tools/experiments/qa-continuous-grass.js')).applyMaterialStudy(w,'C');w.render(.016);return w.qaContinuousGrass.audit()});await page.waitForTimeout(1200);const enabled=await measure();
 await page.evaluate(()=>{const w=window.qaCampaignWorld;w.qaContinuousGrass.dispose();delete w.qaContinuousGrass;w.groundDetails={enabled:false,chunk(){},release(){},flush(){},dispose(){}};w.render(.016)});await page.waitForTimeout(1200);const disposed=await measure();
 await writeFile(out+'/memory-'+quality+'.json',JSON.stringify({before,enabled,disposed,audit,heapDelta:enabled.jsHeapBytes-before.jsHeapBytes,note:'CDP JS heap after explicit GC; includes QA module import and shader caches. GPU buffer allocation is known, driver VRAM is not exposed by WebGL2.',errors},null,2));
 await page.close();
 }}finally{await browser.close()}
