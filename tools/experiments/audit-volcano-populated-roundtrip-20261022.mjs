import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const selectedBiome=process.env.WG_FIXTURE_BIOME??'volcanes';
const out=`docs/qa/global-visual-lab/${selectedBiome}-populated-roundtrip-20261022`;await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const fixture=JSON.parse(await readFile(`docs/qa/global-visual-lab/${selectedBiome}-populated-frozen-20261022/native-fixture.json`,'utf8'));
const snapshot=fixture.timing.navigationContext.state;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (selectedBiome).split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new');await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('world.render(0);loadingOverlay?.dispose();',"Game.pause(state,'menu');world.render(0);loadingOverlay?.dispose();");body=body.replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.route('**/src/rendering/shader-failure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('throw failure.current;', 'globalThis.qaShaderFailure=failure.current.details;throw failure.current;');await route.fulfill({response,body});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 await page.addInitScript(text=>localStorage.setItem('wild-guardians:slot:opening',text),snapshot);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+globalClosureQuery(biome));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin),biome);
 await page.waitForFunction(()=>globalThis.qaFarLoadError||(document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state),null,{timeout:180000}).catch(async e=>{await writeFile(out+'/load-failure.json',JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,far:globalThis.qaCampaignWorld?.farVegetation?.stats,adapters:globalThis.qaCampaignWorld?.farVegetation?.adapters?.map(a=>({stats:a.stats,pending:a.preparationStatus()}))})),null,2));throw Error(errors.join('\n')+'\n'+e.message)});
 const failure=await page.evaluate(()=>globalThis.qaFarLoadError&&(globalThis.qaFarLoadError+'\n'+JSON.stringify(globalThis.qaShaderFailure)));if(failure){await writeFile(out+'/load-failure.json',JSON.stringify({error:failure},null,2));throw Error(failure);}
 await page.evaluate(expected=>{if(Math.abs(window.qaCampaignWorld.state.elapsed-expected)>1e-8)throw Error('Fixture advanced before pause');},JSON.parse(snapshot).elapsed);
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.simElapsed=w.state.elapsed;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 const pose=JSON.parse(await readFile(`docs/qa/global-visual-lab/${biome}-populated-frozen-20261022/captures.json`,'utf8')).records.find(r=>r.variant==='native'&&r.phase==='day').frames[0];
 await page.evaluate(async pose=>{const w=qaCampaignWorld;w.controls.target.fromArray(pose.target);w.camera.position.fromArray(pose.camera);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();},pose);
 for(const phase of phases){
 const result=await page.evaluate(async phase=>{
  const w=qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;
  const state=()=>JSON.stringify({plants:w.state.plants,elapsed:w.state.elapsed,workers:w.state.workers});
  const before=state(),base=w.controls.target.clone(),eye=w.camera.position.clone(),records=[],images=[];
  for(const [step,offset]of [0,192,0,192,0].entries()){
   w.controls.target.copy(base);w.controls.target.x+=offset;w.camera.position.copy(eye);w.camera.position.x+=offset;
   w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();
   const {prepareInitialFarWorld}=await import('/src/app/far-world-loading.js');await prepareInitialFarWorld(w);
   let stable=0,last='',start=performance.now();
   while(stable<90){await new Promise(requestAnimationFrame);w.render(0);const sig=JSON.stringify([w.renderer.info.render.calls,w.renderer.info.render.triangles,w.renderer.info.memory]);stable=!w.farVegetation.adapters.some(a=>a.preparationPending())&&sig===last?stable+1:0;last=sig;if(performance.now()-start>120000)throw Error('Stream not stable');}
   if(!w.farVegetation.enabled||!w.scene.getObjectByName('biome-2d-backdrop')?.visible)throw Error('Background missing');
   const fades=[...w.assetGroups.colors.values()].flatMap(g=>(g.smoothFades??[]).map(f=>({visible:f.visible,indices:f.geometry.index?.count,vertices:f.geometry.attributes.position.count,registered:!!f.geometry._listeners?.dispose?.some(fn=>fn.name==='onGeometryDispose')})));
   w.render(0);images.push(w.renderer.domElement.toDataURL('image/png').split(',')[1]);
   records.push({step,offset,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),origin:[w.renderOrigin.x,w.renderOrigin.z],chunks:[...w.chunks.keys()].sort(),memory:{...w.renderer.info.memory},fades,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,glError:w.renderer.getContext().getError(),elapsed:w.state.elapsed,time:w.state.time});
  }
  return {records,images,stateUnchanged:before===state()};
 },phase);
 for(let i=0;i<result.images.length;i++)await writeFile(`${out}/${quality}-${phase}-${i}.png`,Buffer.from(result.images[i],'base64'));delete result.images;
 result.errors=[...errors];await writeFile(`${out}/${quality}-${phase}.json`,JSON.stringify(result,null,2));
 const first=result.records[0];for(const r of result.records.slice(1)){if(r.offset===0&&(JSON.stringify(r.chunks)!==JSON.stringify(first.chunks)||JSON.stringify(r.camera)!==JSON.stringify(first.camera)||JSON.stringify(r.target)!==JSON.stringify(first.target)))throw Error('Return differs');if(r.offset!==0&&first.chunks.every(k=>r.chunks.includes(k)))throw Error('No chunks unloaded');}
 if(errors.length||!result.stateUnchanged||result.records.some(r=>r.glError))throw Error('Stream audit failed');console.log(quality,phase,'roundtrips passed structural checks');
 }
 await page.close();
 }}finally{await browser.close()}
