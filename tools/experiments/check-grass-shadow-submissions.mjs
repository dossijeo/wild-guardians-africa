import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';


const study=process.env.WG_GRASS_STUDY??'grass-contact';const out=process.env.WG_GRASS_OUTPUT??'docs/qa/global-visual-lab/grass-contact';await mkdir(out,{recursive:true});const records=[],transitions=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const biome of (process.env.WG_GRASS_BIOMES??'sabana,gran-rio').split(','))for(const variant of ['candidate']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});



 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});
 const selected=variant==='candidate'?study:process.env.WG_GRASS_BASELINE;if(selected)await page.evaluate(async study=>{const {applyMaterialStudy}=await import('/tools/experiments/qa-'+study+'.js');await applyMaterialStudy(window.qaCampaignWorld)},selected);
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.camera.position.copy(w.controls.target).add({x:22,y:16,z:18});w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();});
 for(const phase of ['day','night']){
  await page.evaluate(phase=>{window.qaCampaignWorld.state.time=phase==='day'?150:350},phase);await page.waitForTimeout(1000);
  for(const castShadow of [false,true]){
   const info=await page.evaluate(castShadow=>{
    const w=window.qaCampaignWorld,d=w.groundDetails,old=w.renderer.info.autoReset;
    d.mesh.castShadow=castShadow;w.releaseNativeShadow.cache.enabled=false;w.releaseNativeShadow.cache.invalidate();
    try{w.renderer.info.autoReset=false;w.renderer.info.reset();w.render(.016);return {castShadow,instances:d.count,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,shadowDraws:w.releaseNativeShadow.cache.stats.draws,camera:w.camera.position.toArray()};}
    finally{w.renderer.info.autoReset=old;}
   },castShadow);records.push({biome,phase,...info,errors:[...errors]});
  }
 }
 await page.close();
}}finally{await browser.close()}
await writeFile(out+'/shadow-submissions.json',JSON.stringify({note:'All passes: renderer.info.autoReset=false around one actual render per variant, shadow cache disabled; separate from GPU timing blocks.',records},null,2)+'\n');console.log(JSON.stringify(records));
