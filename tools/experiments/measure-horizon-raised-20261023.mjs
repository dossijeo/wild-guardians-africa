import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const selectedBiome=process.env.WG_FIXTURE_BIOME??'sabana';const sourceDir=`docs/qa/global-visual-lab/${selectedBiome==='gran-canon'?'gran-canon-populated-native-camera-20261022':selectedBiome==='desierto'?'desert-populated-frozen-20261022':selectedBiome+'-populated-frozen-20261022'}`;const out=process.env.WG_REVIEW_OUT??`docs/qa/global-visual-lab/${selectedBiome}-horizon-raised-cost-20261023`;await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const fixture=JSON.parse(await readFile(selectedBiome==='desierto'?'docs/qa/global-visual-lab/desert-populated-closure-20261022/native-fixture.json':`${sourceDir}/native-fixture.json`,'utf8'));
const pose=JSON.parse(await readFile(`docs/qa/global-visual-lab/${selectedBiome}-horizon-review-20261023/captures.json`,'utf8')).records.find(r=>r.variant==='native'&&r.phase==='day').frames[0];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const variant of (process.env.WG_VARIANT_SEQUENCE??'original,raised,original,raised').split(','))for(const biome of [selectedBiome]){
 const port=5190;
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('Observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});
 for(const file of ['tools/experiments/qa-campaign-frame-measure-endpoint-20261023.js','tests/browser/gpu-timer.js'])await page.route('**/'+file,async route=>route.fulfill({contentType:'text/javascript',body:await readFile(file,'utf8')}));
 if(variant==='raised')await page.route('**/src/rendering/mountain-arc-composition.js*',async route=>{const response=await route.fetch();const body=await response.text();if(body.split('baseY=-35').length!==2)throw Error('Mountain base anchor missing');await route.fulfill({response,body:body.replace('baseY=-35','baseY=-10')});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);

 await page.addInitScript(text=>localStorage.setItem('wild-guardians:slot:opening',text),fixture.timing.navigationContext.state);
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();const a="world.render(0);loadingOverlay?.dispose();",b="Game.pause(state,'menu');world.render(0);loadingOverlay?.dispose();";if(body.split(a).length!==2)throw Error('Pre-game pause anchor missing');body=body.replace(a,b);await route.fulfill({response,body});});
 await page.goto(`http://127.0.0.1:${port}/?qa-seed=712&`+(globalClosureQuery(biome)));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000}).catch(e=>{throw Error(errors.join('\n')+'\n'+e.message)});
 await page.evaluate(expected=>{if(Math.abs(window.qaCampaignWorld.state.elapsed-expected)>1e-8)throw Error('Fixture advanced before pause');},JSON.parse(fixture.timing.navigationContext.state).elapsed);
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.simElapsed=w.state.elapsed;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(async pose=>{const w=qaCampaignWorld;w.controls.target.fromArray(pose.target);window.qaSandPath=[pose.camera];w.camera.position.fromArray(pose.camera);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();},pose);
  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   const result=await page.evaluate(async diagnostic=>{
    const w=window.qaCampaignWorld;w.qaContinuousGrass=typeof w.groundDetails?.audit==="function"?w.groundDetails:undefined;const {measureCampaign}=await import('/tools/experiments/qa-campaign-frame-measure-endpoint-20261023.js');
    await w.whenChunksReady();await w.horizon.whenReady();const {prepareInitialFarWorld}=await import('/src/app/far-world-loading.js');await prepareInitialFarWorld(w);if(w.toon?.globalVisualLighting&&(!w.farVegetation?.enabled||!w.scene.getObjectByName('biome-2d-backdrop')?.visible||(w.farVegetation?.adapters??[]).some(a=>!a.layer.current)))throw Error('Lab background missing');const residentMasks=[];for(const [key,group]of w.chunks){const texture=group.children.find(m=>m.userData.ground)?.material.userData.biomeGround?.uGroundMask.value;if(!texture)throw Error('Resident ground mask missing '+key);w.renderer.initTexture(texture);residentMasks.push(key);}residentMasks.sort();let stable=0,last='',started=performance.now();while(stable<90){await new Promise(requestAnimationFrame);w.render(0);const sig=JSON.stringify([w.renderer.info.render.calls,w.renderer.info.render.triangles,w.renderer.info.memory.geometries,w.renderer.info.memory.textures]);stable=!(w.farVegetation?.adapters??[]).some(a=>a.preparationPending())&&sig===last?stable+1:0;last=sig;if(performance.now()-started>120000)throw Error('Scene preparation did not stabilize');}const sceneAudit={fernShadowEnabled:w.groundDetails.meshes.map(e=>e.mesh.castShadow),shadowResolution:w.sun.shadow.mapSize.x,shadowCacheBefore:{...w.releaseNativeShadow.cache.stats},cardStudy:w.groundDetails.cardStudy??null,residentMasks,origin:[w.renderOrigin.x,w.renderOrigin.z],target:w.controls.target.toArray(),chunks:[...w.chunks.keys()].sort(),objects:w.objects.size,elapsed:w.state.elapsed,workers:w.state.workers.map(x=>({id:x.id,x:x.x,z:x.z,task:x.task,actionRemaining:x.actionRemaining})),memory:{...w.renderer.info.memory},far:w.farVegetation?.stats??null,farEnabled:w.farVegetation?.enabled??false,instanceCulling:w.assetGroups.instanceCulling,workload:JSON.parse(last)};const originalSync=w.syncChunks;const original=w.render;let index=0;const base=window.qaSandPath[0];
    const moving=function(...args){const t=index++/149*Math.PI*2;w.camera.position.set(base[0]+8*Math.sin(t),base[1],base[2]);return original.apply(this,args);};
    try{w.render=moving;const gpu=await measureCampaign(w,{gpuEnabled:true,samples:90,warmup:60,diagnostics:diagnostic});index=0;w.render=moving;const cadence=await measureCampaign(w,{samples:90,warmup:60,diagnostics:diagnostic});w.render=original;w.camera.position.fromArray(base);if(w.qaContinuousGrass)w.qaContinuousGrass.timeOverride=2;w.render(0);const capture={camera:w.camera.position.toArray(),target:w.controls.target.toArray(),data:w.renderer.domElement.toDataURL('image/png').split(',')[1]};return {gpu,cadence,sceneAudit,capture,shadowCacheAfter:{...w.releaseNativeShadow.cache.stats}};}finally{w.render=original;w.syncChunks=originalSync;}
   },process.env.WG_FRAME_DIAGNOSTICS==='1');
   await writeFile(`${out}/${quality}-${variant}-${phase}-${records.length}.png`,Buffer.from(result.capture.data,'base64'));delete result.capture.data;
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,phase,...result,errors:[...errors]});await writeFile(out+'/benchmarks.json',JSON.stringify({seed:712,note:"Original mountain base-35 versus raised-10, identical native art otherwise. Populated frozen save, shallow-angle camera moving8m, deterministic wind, day/night. ABAB separate GPU/cadence; additional visible mountain pixels intentional",records},null,2));console.log(quality,variant,phase,'measured');
  }
 await page.close();
 }}finally{await browser.close()}
