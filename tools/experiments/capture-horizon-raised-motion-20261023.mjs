import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
import {globalCurrentReviewQuery} from './global-current-review-recipe.mjs';
const currentReview=process.env.WG_CURRENT_REVIEW==='1';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const selectedBiome=process.env.WG_FIXTURE_BIOME??'sabana';
const fixtureDirectories={sabana:'sabana-populated-frozen-20261022','gran-rio':'gran-rio-populated-frozen-20261022',manglares:'manglares-populated-frozen-20261022',volcanes:'volcanes-populated-frozen-20261022',desierto:'desert-populated-closure-20261022','gran-canon':'gran-canon-populated-native-camera-20261022'};
if(!fixtureDirectories[selectedBiome])throw Error('Unknown motion biome');
const sourceDir=`docs/qa/global-visual-lab/${fixtureDirectories[selectedBiome]}`;const out=process.env.WG_REVIEW_OUT??`docs/qa/global-visual-lab/${selectedBiome}-horizon-raised-motion-20261023`;await mkdir(out,{recursive:true});const records=[];const phases=(process.env.WG_MOTION_PHASES??'day,night').split(',');
const fixture=JSON.parse(await readFile(`${sourceDir}/native-fixture.json`,'utf8'));
const saved=JSON.parse(fixture.timing.navigationContext.state);
if(saved.biome!==selectedBiome)throw Error('Motion fixture biome mismatch');
saved.tutorial.basicSkipped=true; // QA-only: do not allow onboarding to pause the active-play observation.
const snapshot=JSON.stringify(saved);
const canyonPose=selectedBiome==='gran-canon'?JSON.parse(await readFile('docs/qa/global-visual-lab/gran-canon-populated-native-camera-20261022/captures.json','utf8')).records.find(r=>r.variant==='native'&&r.phase==='day').frames[0]:null;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (selectedBiome).split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 const groundStep=Number(process.env.WG_DIAGNOSTIC_GROUND_STEP??(currentReview&&['sabana','volcanes'].includes(biome)?16:32));if(![16,32].includes(groundStep))throw Error('Invalid motion ground step');
 if(process.env.WG_DIAGNOSTIC_GROUND_STEP&&groundStep!==32)await page.route('**/src/rendering/far-vegetation-profile.js*',async route=>{const response=await route.fetch();const body=await response.text();if(body.split('groundStep:32').length!==2)throw Error('Ground step anchor missing');await route.fulfill({response,body:body.replace('groundStep:32','groundStep:'+groundStep)});});
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new');await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();const freezeAnchor='world.render(0);world.retainStreamingPrograms();loadingOverlay?.dispose();';if(body.split(freezeAnchor).length!==2)throw Error('Missing motion capture readiness freeze anchor');body=body.replace(freezeAnchor,"Game.pause(state,'menu');"+freezeAnchor);body=body.replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.route('**/src/rendering/shader-failure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('throw failure.current;', 'globalThis.qaShaderFailure=failure.current.details;throw failure.current;');await route.fulfill({response,body});});
 await page.addInitScript(light=>globalThis.qaMotionLight=light,process.env.WG_MOTION_SPARSE_GL==='1');
 await page.addInitScript(enabled=>globalThis.qaCanyonMotion=enabled,!!canyonPose);
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 await page.addInitScript(text=>localStorage.setItem('wild-guardians:slot:opening',text),snapshot);
 if(!currentReview)await page.route('**/src/rendering/mountain-arc-composition.js*',async route=>{const response=await route.fetch();const body=await response.text();if(body.split('baseY=-35').length!==2)throw Error('Mountain base anchor missing');await route.fulfill({response,body:body.replace('baseY=-35','baseY=-10')});});
 const query=new URLSearchParams((currentReview?globalCurrentReviewQuery:globalClosureQuery)(biome));
 if(currentReview){query.set('mountainBase','raised');query.set('wildEngineThreads','1');query.set('frameScheduler','1');}
 if(process.env.WG_HORIZON_HANDOFF==='atomic')query.set('horizonHandoff','atomic');
 if(process.env.WG_HORIZON_HANDOFF==='off')query.delete('horizonHandoff');
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
 await page.evaluate(async pose=>{const w=window.qaCampaignWorld;if(pose){w.controls.target.fromArray(pose.target);window.qaSandPath=[pose.camera];w.camera.position.fromArray(pose.camera);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();return;}w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[-40,8,20],[22,7,42],[45,9,-18]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();},canyonPose);

 for(const phase of phases){
  const result=await page.evaluate(async phase=>{
   const w=qaCampaignWorld,{resume,pause}=await import('/src/simulation/game.js');
   w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(qaSandPath[0]);
   w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();
   const {prepareInitialFarWorld}=await import('/src/app/far-world-loading.js');await prepareInitialFarWorld(w);
   for(let i=0;i<60;i++){await new Promise(requestAnimationFrame);w.render(0);}
   const snapshot=()=>JSON.parse(JSON.stringify({elapsed:w.state.elapsed,time:w.state.time,day:w.state.day,workers:w.state.workers,plants:w.state.plants,pauses:w.state.pauses}));
   const before=snapshot(),base=w.camera.position.clone(),target=w.controls.target.clone(),original=w.render;
   const stream=w.renderer.domElement.captureStream(0),track=stream.getVideoTracks()[0];
   const mimeType=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(x=>MediaRecorder.isTypeSupported(x));if(!mimeType)throw Error('WebM unavailable');
   const chunks=[],frames=[],shots=[],recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:6000000});
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const stopped=new Promise(resolve=>recorder.onstop=resolve);
   let start=0,last=0,shotIndex=0;
   recorder.start();resume(w.state,'menu');
   try{
    if(w.state.pauses.length)throw Error('Unexpected active-play pause '+w.state.pauses.join(','));
    await new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>reject(Error('Active gameplay frame timeout')),90000);
     w.render=function(...args){
      const now=performance.now();if(!start)start=now;const elapsed=now-start,t=Math.min(1,elapsed/40000);
      const shift=144*Math.sin(t*Math.PI)**2;if(globalThis.qaCanyonMotion){w.camera.position.copy(base);w.camera.position.z+=shift;w.camera.position.y=Math.max(base.y,w.nav.field.surface(w.camera.position.x,w.camera.position.z)+3);w.controls.target.copy(target);w.controls.target.z+=shift;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;}else{w.controls.target.copy(target);w.controls.target.x+=shift;w.controls.target.z+=shift*.35;const dy=w.nav.field.surface(w.controls.target.x,w.controls.target.z)-w.nav.field.surface(target.x,target.z);w.controls.target.y+=dy;w.camera.position.copy(base);w.camera.position.x+=shift;w.camera.position.z+=shift*.35;w.camera.position.y+=dy;if(w.state.biome==='desierto')w.camera.position.y=Math.max(w.camera.position.y,w.nav.field.surface(w.camera.position.x,w.camera.position.z)+3);}
      const auto=w.renderer.info.autoReset;w.renderer.info.autoReset=false;w.renderer.info.reset();
      try{const value=original.apply(this,args);track.requestFrame();
       const adopted=w.horizon?.region;
       const horizonMissing=[];
       if(globalThis.qaCanyonMotion&&adopted)for(let z=adopted.cz-adopted.range;z<=adopted.cz+adopted.range;z++)for(let x=adopted.cx-adopted.range;x<=adopted.cx+adopted.range;x++){
        const key=x+','+z,group=w.chunks.get(key);if(!group||group.visible===false)horizonMissing.push(key);
       }
       frames.push({horizonRegion:adopted?{cx:adopted.cx,cz:adopted.cz,range:adopted.range}:null,horizonMissing,horizonWaiting:!!w.horizon?.pendingAdoption,wallMs:elapsed,intervalMs:last?now-last:null,elapsed:w.state.elapsed,pauses:[...w.state.pauses],calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,geometry:w.renderer.info.memory.geometries,textures:w.renderer.info.memory.textures,pending:w.farVegetation.adapters.some(a=>a.preparationPending()),glError:globalThis.qaMotionLight?null:w.renderer.getContext().getError(),camera:w.camera.position.toArray(),target:w.controls.target.toArray(),origin:[w.renderOrigin.x,w.renderOrigin.z],chunkKeys:[...w.chunks.keys()].sort(),coverageChunks:w.groundDetails.audit?.().chunks??null,cameraClearance:w.camera.position.y-w.nav.field.surface(w.camera.position.x,w.camera.position.z)});last=now;
       if(elapsed>=shotIndex*5000){shots.push({wallMs:elapsed,state:snapshot(),stream:w.chunkStream.summary(),desired:[...w.chunkStream.desired.keys()],scheduler:w.frameScheduler?.snapshot(),jobs:[...(w.frameScheduler?.jobs.values()??[])].map(j=>({label:typeof j.label==='function'?j.label():j.label,age:performance.now()-j.created,waiting:!!j.waiting,cost:j.estimate?.()??j.cost})),data:w.renderer.domElement.toDataURL('image/png').split(',')[1]});shotIndex++;}
       if(t===1){clearTimeout(timeout);resolve();}return value;
      }catch(error){clearTimeout(timeout);reject(error);throw error;}finally{w.renderer.info.autoReset=auto;}
     };
    });
   }finally{w.render=original;pause(w.state,'menu');recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());}
   const after=snapshot(),blob=new Blob(chunks,{type:mimeType});
   const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
   return {before,after,frames,shots,data,mimeType,sparseGl:!!globalThis.qaMotionLight,finalGlError:w.renderer.getContext().getError(),farEnabled:w.farVegetation.enabled,mountainsVisible:w.scene.getObjectByName('biome-2d-backdrop')?.visible,coverage:w.groundDetails.audit?.()??null};
  },phase);
  await writeFile(`${out}/${phase}.webm`,Buffer.from(result.data,'base64'));delete result.data;
  for(const [i,shot]of result.shots.entries()){await writeFile(`${out}/${phase}-${i}.png`,Buffer.from(shot.data,'base64'));delete shot.data;}
  result.errors=[...errors];records.push({biome,quality,phase,captureUrl,currentReview,groundStep,motionPath:canyonPose?'canyon-z':'diagonal-xz',...result});await writeFile(out+'/active-play.json',JSON.stringify({seed:712,note:'Real app Game.advanceReal loop, no direct QA ticks. Forty wall-clock seconds per phase. records.motionPath identifies either the 144m Z canyon excursion with eye-ground clearance or the 144m X/50.4m Z diagonal excursion following target altitude. Desert diagonal eye is clamped at least 3m above its own terrain sample. Material/wind clocks live, streaming enabled. Existing raid-camera manual mode held during QA excursion. Recorder and checkpoint overhead present: observations, not performance benchmark. Night continues the day state; initial visual time selected for each phase.',records},null,2));
  if(errors.length||result.finalGlError||result.frames.some(f=>f.glError)||result.after.elapsed-result.before.elapsed<10||result.frames.some(f=>f.pauses.length)||result.coverage?.stats.overflow)throw Error('Active play validation failed');console.log(biome,phase,'active elapsed',result.after.elapsed-result.before.elapsed);
 }
 await page.close();
 }}finally{await browser.close()}
