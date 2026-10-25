import {routeDayReflection} from './qa-canyon-day-reflection-20261023.mjs';
import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const selectedBiome='gran-canon';
const reviewQuery=biome=>{const q=new URLSearchParams(globalClosureQuery(biome));for(const [k,v] of new URLSearchParams(process.env.WG_REVIEW_QUERY??''))q.set(k,v);if(process.env.WG_REFLECTION==='native')q.set('canyonWater','calm');return q.toString();};
const out=process.env.WG_REVIEW_OUT??`docs/qa/global-visual-lab/canyon-day-reflection-motion-20261023/${process.env.WG_REFLECTION??"baseline"}`;await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const fixture=JSON.parse(await readFile('docs/qa/global-visual-lab/gran-canon-populated-native-camera-20261022/native-fixture.json','utf8'));
const snapshot=fixture.timing.navigationContext.state;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (selectedBiome).split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new');await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='world.render(0);world.retainStreamingPrograms();loadingOverlay?.dispose();';if(body.split(anchor).length!==2)throw Error('Motion freeze anchor changed');body=body.replace(anchor,"Game.pause(state,'menu');"+anchor);body=body.replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.route('**/src/rendering/shader-failure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('throw failure.current;', 'globalThis.qaShaderFailure=failure.current.details;throw failure.current;');await route.fulfill({response,body});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 await page.addInitScript(text=>localStorage.setItem('wild-guardians:slot:opening',text),snapshot);
 if(process.env.WG_REFLECTION==='day')await routeDayReflection(page);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+reviewQuery(biome));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin),biome);
 await page.waitForFunction(()=>globalThis.qaFarLoadError||(document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state),null,{timeout:180000}).catch(async e=>{await writeFile(out+'/load-failure.json',JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,far:globalThis.qaCampaignWorld?.farVegetation?.stats,adapters:globalThis.qaCampaignWorld?.farVegetation?.adapters?.map(a=>({stats:a.stats,pending:a.preparationStatus()}))})),null,2));throw Error(errors.join('\n')+'\n'+e.message)});
 const failure=await page.evaluate(()=>globalThis.qaFarLoadError&&(globalThis.qaFarLoadError+'\n'+JSON.stringify(globalThis.qaShaderFailure)));if(failure){await writeFile(out+'/load-failure.json',JSON.stringify({error:failure},null,2));throw Error(failure);}
 await page.evaluate(expected=>{if(Math.abs(window.qaCampaignWorld.state.elapsed-expected)>1e-8)throw Error('Fixture advanced before pause');},JSON.parse(snapshot).elapsed);
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.simElapsed=w.state.elapsed;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);globalThis.qaWaterTime=0;w.materialRegistry.update=()=>update(globalThis.qaWaterTime)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();const {nativeCameraPose}=await import('/src/rendering/terrain-camera.js');const poses=[[0,1.18,34],[0,.65,34],[Math.PI,1.18,34]].map(([theta,phi,d])=>nativeCameraPose(w.nav.field,o,theta,phi,d));w.controls.target.fromArray(poses[0].target);window.qaSandPath=poses.map(p=>p.eye);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
  await page.evaluate(phase=>{const w=qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1},phase);
  for(const variant of ['native']){
   const result=await page.evaluate(async({variant})=>{
    const w=qaCampaignWorld,base=qaSandPath[0],original=w.render,before=JSON.stringify({elapsed:w.state.elapsed,plants:w.state.plants,workers:w.state.workers});globalThis.qaWaterTime=0;
    w.camera.position.fromArray(base);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();
    const {prepareInitialFarWorld}=await import('/src/app/far-world-loading.js');await prepareInitialFarWorld(w);
    for(let i=0;i<60;i++){await new Promise(requestAnimationFrame);w.render(0)}
    const stream=w.renderer.domElement.captureStream(0),track=stream.getVideoTracks()[0];
    const mimeType=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(x=>MediaRecorder.isTypeSupported(x));
    if(!mimeType)throw Error('WebM recorder unavailable');
    const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:6000000}),chunks=[],frames=[],shots=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    const stopped=new Promise(resolve=>recorder.onstop=resolve);
    w.render=()=>{};const start=performance.now();recorder.start();
    try{
     for(let i=0;i<240;i++){
      await new Promise(requestAnimationFrame);
      const t=Math.max(0,(i-119)/120),dx=base[0]-w.controls.target.x,dz=base[2]-w.controls.target.z,length=Math.hypot(dx,dz),radius=length-5*Math.sin(t*Math.PI)**2;globalThis.qaWaterTime=i/30;
      w.camera.position.set(w.controls.target.x+dx/length*radius,base[1],w.controls.target.z+dz/length*radius);
      if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
      original.call(w,1/30);track.requestFrame();
      frames.push({i,waterTime:globalThis.qaWaterTime,coverage:w.groundDetails.audit?.()??null,camera:w.camera.position.toArray(),calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:{...w.renderer.info.memory},pending:w.farVegetation.adapters.some(a=>a.preparationPending()),glError:w.renderer.getContext().getError()});
      if([0,60,120,180,239].includes(i))shots.push({i,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]});
     }
    }finally{w.render=original;recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());}
    const blob=new Blob(chunks,{type:mimeType});const data=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob)});
    return {stateUnchanged:before===JSON.stringify({elapsed:w.state.elapsed,plants:w.state.plants,workers:w.state.workers}),frames,shots,data,mimeType,wallMs:performance.now()-start,farEnabled:w.farVegetation.enabled,mountainsVisible:w.scene.getObjectByName('biome-2d-backdrop')?.visible};
   },{variant});
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});
   await writeFile(dir+'/motion.webm',Buffer.from(result.data,'base64'));delete result.data;
   for(const shot of result.shots)await writeFile(`${dir}/${String(shot.i).padStart(4,'0')}.png`,Buffer.from(shot.data,'base64'));delete result.shots;
   if(!result.stateUnchanged)throw Error('Simulation changed');if(result.frames.some(f=>f.glError)||errors.length)throw Error(JSON.stringify({errors,gl:result.frames.filter(f=>f.glError)}));
   records.push({query:reviewQuery(biome),biome,quality,variant,phase,...result,errors:[...errors]});
   await writeFile(out+'/captures.json',JSON.stringify({seed:712,resolution:[1280,720],note:'Moving full-world visual validation. Frame-index camera path; live streaming enabled; paused simulation; shader water clock advances i/30 independently, first half fixed camera then 5m dolly. Recorder uses wall-clock timestamps: not a benchmark.',records},null,2)+'\n');
   console.log(biome,quality,variant,phase,'recorded',result.wallMs);
  }
 }
 await page.close();
 }}finally{await browser.close()}
