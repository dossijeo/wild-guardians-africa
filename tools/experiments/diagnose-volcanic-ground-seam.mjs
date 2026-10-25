import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
import {globalCurrentReviewQuery} from './global-current-review-recipe.mjs';
const currentReview=process.env.WG_CURRENT_REVIEW==='1';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const selectedBiome=process.env.WG_FIXTURE_BIOME??'sabana';
const sourceDir=`docs/qa/global-visual-lab/${selectedBiome}-populated-frozen-20261022`;const out=process.env.WG_REVIEW_OUT??`docs/qa/global-visual-lab/${selectedBiome}-horizon-raised-motion-20261023`;await mkdir(out,{recursive:true});const records=[];const phases=(process.env.WG_MOTION_PHASES??'day,night').split(',');
const fixture=JSON.parse(await readFile(`${sourceDir}/native-fixture.json`,'utf8'));
const saved=JSON.parse(fixture.timing.navigationContext.state);
saved.tutorial.basicSkipped=true; // QA-only: do not allow onboarding to pause the active-play observation.
const snapshot=JSON.stringify(saved);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (selectedBiome).split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 const groundStep=Number(process.env.WG_DIAGNOSTIC_GROUND_STEP??(currentReview&&['sabana','volcanes'].includes(biome)?16:32));if(![8,16,32].includes(groundStep))throw Error('Invalid diagnostic ground step');
 if(process.env.WG_DIAGNOSTIC_GROUND_STEP&&groundStep!==32)await page.route('**/src/rendering/far-vegetation-profile.js*',async route=>{const response=await route.fetch();const body=await response.text();if(body.split('groundStep:32').length!==2)throw Error('Ground step anchor missing');await route.fulfill({response,body:body.replace('groundStep:32','groundStep:'+groundStep)});});
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new');await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();const freezeAnchor='world.render(0);world.retainStreamingPrograms();loadingOverlay?.dispose();';if(body.split(freezeAnchor).length!==2)throw Error('Missing motion capture readiness freeze anchor');body=body.replace(freezeAnchor,"Game.pause(state,'menu');"+freezeAnchor);body=body.replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.route('**/src/rendering/shader-failure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('throw failure.current;', 'globalThis.qaShaderFailure=failure.current.details;throw failure.current;');await route.fulfill({response,body});});
 await page.addInitScript(light=>globalThis.qaMotionLight=light,process.env.WG_MOTION_SPARSE_GL==='1');
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 await page.addInitScript(text=>localStorage.setItem('wild-guardians:slot:opening',text),snapshot);
 if(!currentReview)await page.route('**/src/rendering/mountain-arc-composition.js*',async route=>{const response=await route.fetch();const body=await response.text();if(body.split('baseY=-35').length!==2)throw Error('Mountain base anchor missing');await route.fulfill({response,body:body.replace('baseY=-35','baseY=-10')});});
 const query=new URLSearchParams((currentReview?globalCurrentReviewQuery:globalClosureQuery)(biome));
 if(currentReview){query.set('mountainBase','raised');query.set('wildEngineThreads','1');query.set('frameScheduler','1');}
 if(process.env.WG_GROUND_RESIDENT_MASK==='1')query.set('groundResidentMask','1');
 if(process.env.WG_DIAGNOSTIC_GROUND_STEP){query.delete('volcanicGround');query.delete('savannaGround');}
 const captureUrl='http://127.0.0.1:5190/?qa-seed=712&'+query;
 await page.goto(captureUrl);
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin),biome);
 await page.waitForFunction(()=>globalThis.qaFarLoadError||(document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state),null,{timeout:180000}).catch(async e=>{await writeFile(out+'/load-failure.json',JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,far:globalThis.qaCampaignWorld?.farVegetation?.stats,adapters:globalThis.qaCampaignWorld?.farVegetation?.adapters?.map(a=>({stats:a.stats,pending:a.preparationStatus()}))})),null,2));throw Error(errors.join('\n')+'\n'+e.message)});
 const failure=await page.evaluate(()=>globalThis.qaFarLoadError&&(globalThis.qaFarLoadError+'\n'+JSON.stringify(globalThis.qaShaderFailure)));if(failure){await writeFile(out+'/load-failure.json',JSON.stringify({error:failure},null,2));throw Error(failure);}
 await page.evaluate(expected=>{if(Math.abs(window.qaCampaignWorld.state.elapsed-expected)>1e-8)throw Error('Fixture advanced before pause');},JSON.parse(snapshot).elapsed);
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.simElapsed=w.state.elapsed;w.raidCamera?.beginManual();w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});






 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 delete w.groundDetails.timeOverride;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[-40,8,20],[22,7,42],[45,9,-18]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});


 const referencePath=process.env.WG_DIAGNOSTIC_MOTION_FILE??'docs/qa/global-visual-lab/current-review-20261025/volcanes-resident-seam-low/active-play.json';
 const reference=JSON.parse(await readFile(referencePath,'utf8')).records[0];
 if(reference.biome!==biome)throw Error('Diagnostic motion reference biome mismatch');
 const frameAt=reference.frames.reduce((a,b)=>Math.abs(b.wallMs-20000)<Math.abs(a.wallMs-20000)?b:a);
 const report=await page.evaluate(async frame=>{
  const w=qaCampaignWorld;
  w.state.time=170;w.camera.position.fromArray(frame.camera);w.controls.target.fromArray(frame.target);
  w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();
  // This is an already loaded world. Drain streaming without rerunning the
  // initial depth warmup while old regional materials are being replaced.
  const deadline=performance.now()+90000;let stable=0;
  while(stable<3){
   if(performance.now()>deadline)throw Error('Diagnostic far streaming timeout');
   await new Promise(requestAnimationFrame);w.render(0);
   const adapters=w.farVegetation.adapters,failures=adapters.flatMap(a=>a.stats.errors);
   if(failures.length)throw Error('Far streaming failed: '+failures.join('; '));
   stable=adapters.length&&adapters.every(a=>a.layer.current&&!a.preparationPending())?stable+1:0;
  }
  for(let i=0;i<60;i++){await new Promise(requestAnimationFrame);w.render(0);}
  const seams=[];w.scene.traverse(m=>{if(m.userData.farGroundSeam)seams.push(m);});
  const geometry=seams.map(m=>{
   const p=m.geometry.attributes.position,columns=[];
   for(let i=0;i+1<p.count;i+=2)columns.push({x:p.getX(i),z:p.getZ(i),nativeY:p.getY(i),farY:p.getY(i+1),delta:p.getY(i)-p.getY(i+1)});
   columns.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
   return {visible:m.visible,columns:p.count/2,maxAbsDelta:Math.abs(columns[0]?.delta??0),worst:columns.slice(0,20)};
  });
  const capture=()=>{w.render(0);return w.renderer.domElement.toDataURL('image/png').split(',')[1];};
  const before=capture();const visibility=seams.map(m=>m.visible);
  seams.forEach(m=>m.visible=false);const withoutSeam=capture();seams.forEach((m,i)=>m.visible=visibility[i]);const restored=capture();
  const surfaces=[];w.scene.traverse(m=>{if(m.userData.farGround)surfaces.push({seam:!!m.userData.farGroundSeam,vertices:m.geometry.attributes.position.count,triangles:(m.geometry.index?.count??m.geometry.attributes.position.count)/3,bytes:Object.values(m.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(m.geometry.index?.array.byteLength??0)});});
  return {before,withoutSeam,restored,geometry,surfaces,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),bounds:w.nearBounds,origin:[w.renderOrigin.x,w.renderOrigin.z],chunks:[...w.chunks.keys()],stream:w.chunkStream.summary(),glError:w.renderer.getContext().getError()};
 },frameAt);
 for(const name of ['before','withoutSeam','restored']){await writeFile(`${out}/${name}.png`,Buffer.from(report[name],'base64'));delete report[name];}
 report.errors=errors;report.captureUrl=captureUrl;report.groundStep=groundStep;report.reference={path:referencePath,wallMs:frameAt.wallMs,biome,quality};await writeFile(out+'/diagnostic.json',JSON.stringify(report,null,2));
 if(errors.length||report.glError)throw Error('Diagnostic renderer errors');
 console.log(JSON.stringify({geometry:report.geometry.map(g=>({columns:g.columns,maxAbsDelta:g.maxAbsDelta})),stream:report.stream}));
 await page.close();
 }}finally{await browser.close()}
