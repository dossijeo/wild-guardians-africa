import {globalReviewedQuery} from './global-reviewed-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out=process.env.WG_REVIEW_OUT??'docs/qa/global-visual-lab/canyon-balanced-bank-motion-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'gran-canon').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new');await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.route('**/src/rendering/shader-failure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('throw failure.current;', 'globalThis.qaShaderFailure=failure.current.details;throw failure.current;');await route.fulfill({response,body});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 await page.route('**/src/rendering/natural-water-edges.js*',async route=>{
 const response=await route.fetch();let body=await response.text();
 for(const [a,b] of [['float qaEdge=mix(.015,.19,qaLarge)+.035*qaFine;', 'float qaEdge=mix(.015,.07,qaLarge)+.02*qaFine;'],['float qaWidth=mix(.075,.23,qaLarge);','float qaWidth=mix(.24,.48,qaLarge);']]){if(!body.includes(a))throw Error('Boundary QA anchor missing: '+a);body=body.replace(a,b);}
 await route.fulfill({response,body});
 });
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+globalReviewedQuery(biome));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>globalThis.qaFarLoadError||(document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state),null,{timeout:180000}).catch(async e=>{await writeFile(out+'/load-failure.json',JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,far:globalThis.qaCampaignWorld?.farVegetation?.stats,adapters:globalThis.qaCampaignWorld?.farVegetation?.adapters?.map(a=>({stats:a.stats,pending:a.preparationStatus()}))})),null,2));throw Error(errors.join('\n')+'\n'+e.message)});
 const failure=await page.evaluate(()=>globalThis.qaFarLoadError&&(globalThis.qaFarLoadError+'\n'+JSON.stringify(globalThis.qaShaderFailure)));if(failure){await writeFile(out+'/load-failure.json',JSON.stringify({error:failure},null,2));throw Error(failure);}
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')w.controls.target.fromArray(canyonTarget);
 if(biome!=='gran-canon'&&biome!=='desierto'){const f=w.nav.field,o=w.controls.target.clone();let best=null;for(let z=-100;z<=100;z+=2)for(let x=-100;x<=100;x+=2){const px=o.x+x,pz=o.z+z,info=f.waterInfo(px,pz);if(info.inside&&(!best||x*x+z*z<best.d))best={x:px,z:pz,d:x*x+z*z};}if(best)w.controls.target.set(best.x,f.surface(best.x,best.z)+.9,best.z);}
 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

 for(const phase of phases){
  await page.evaluate(phase=>{const w=qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1},phase);
  for(const variant of ['balanced']){
   const result=await page.evaluate(async({variant})=>{
    const w=qaCampaignWorld,base=qaSandPath[0],original=w.render;
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
      const t=i/239,radius=28-18*Math.sin(t*Math.PI)**2,dx=base[0]-w.controls.target.x,dz=base[2]-w.controls.target.z,length=Math.hypot(dx,dz);
      w.camera.position.set(w.controls.target.x+dx/length*radius,base[1],w.controls.target.z+dz/length*radius);
      if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
      original.call(w,1/30);track.requestFrame();
      frames.push({i,coverage:w.groundDetails.audit?.()??null,camera:w.camera.position.toArray(),calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:{...w.renderer.info.memory},pending:w.farVegetation.adapters.some(a=>a.preparationPending()),glError:w.renderer.getContext().getError()});
      if([0,60,120,180,239].includes(i))shots.push({i,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]});
     }
    }finally{w.render=original;recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());}
    const blob=new Blob(chunks,{type:mimeType});const data=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob)});
    return {frames,shots,data,mimeType,wallMs:performance.now()-start,farEnabled:w.farVegetation.enabled,mountainsVisible:w.scene.getObjectByName('biome-2d-backdrop')?.visible};
   },{variant});
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});
   await writeFile(dir+'/motion.webm',Buffer.from(result.data,'base64'));delete result.data;
   for(const shot of result.shots)await writeFile(`${dir}/${String(shot.i).padStart(4,'0')}.png`,Buffer.from(shot.data,'base64'));delete result.shots;
   if(result.frames.some(f=>f.glError)||errors.length)throw Error(JSON.stringify({errors,gl:result.frames.filter(f=>f.glError)}));
   records.push({biome,quality,variant,phase,...result,errors:[...errors]});
   await writeFile(out+'/captures.json',JSON.stringify({seed:712,resolution:[1280,720],note:'Moving full-world visual validation. Frame-index camera path; live streaming enabled; paused simulation and fixed grass/material clock. Recorder uses wall-clock timestamps: not a benchmark.',records},null,2)+'\n');
   console.log(biome,quality,variant,phase,'recorded',result.wallMs);
  }
 }
 await page.close();
 }}finally{await browser.close()}
