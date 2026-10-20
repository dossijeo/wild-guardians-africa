import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';


const study=process.env.WG_GRASS_STUDY??'grass-biomes';const out=process.env.WG_GRASS_OUTPUT??'docs/qa/global-visual-lab/grass-traversal/motion';await mkdir(out,{recursive:true});const records=[],transitions=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const biome of (process.env.WG_GRASS_BIOMES??'sabana,gran-rio,gran-canon').split(','))for(const variant of ['candidate']){
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
 const origin=await page.evaluate(()=>{const w=window.qaCampaignWorld;return {x:w.controls.target.x+50,z:w.controls.target.z+30}});
 for(const phase of ['day','night']){
  await page.evaluate(async({phase,origin})=>{const w=window.qaCampaignWorld;w.state.day=1;w.state.time=phase==='day'?150:350;const y=w.nav.field.surface(origin.x,origin.z)+.9;w.controls.target.set(origin.x,y,origin.z);w.camera.position.set(origin.x+22,y+16,origin.z+18);w.render(.016);await w.whenChunksReady();await w.horizon.whenReady();},{phase,origin});await page.waitForTimeout(700);
  const video=await page.evaluate(async origin=>{
   const w=window.qaCampaignWorld,stream=w.renderer.domElement.captureStream(30),chunks=[],frames=[];
   const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:4000000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=reject});const started=new Promise(resolve=>recorder.onstart=resolve);recorder.start();await started;
   const old=w.updateCamera,start=performance.now();
   w.updateCamera=()=>{const t=Math.min(1,(performance.now()-start)/6000),x=origin.x+t*96,z=origin.z,y=w.nav.field.surface(x,z)+.9;w.controls.target.set(x,y,z);w.camera.position.set(x+22,y+16,z+18);old();frames.push({t,count:w.groundDetails.count,transitioning:w.groundDetails.qaActive.filter(p=>p.scale>0&&p.scale<1).length,origin:[w.renderOrigin.x,w.renderOrigin.z]});};
   try{await new Promise(r=>setTimeout(r,6100));}finally{w.updateCamera=old;recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());}
   return {bytes:Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer())),frames};
  },origin);
  await writeFile(`${out}/${biome}-${phase}.webm`,Buffer.from(video.bytes));records.push({biome,phase,frames:video.frames,errors:[...errors]});await writeFile(out+'/motion.json',JSON.stringify({note:'Video encoding separate from timing run; 96 m at 16 m/s, actual campaign streaming.',records},null,2)+'\n');console.log(biome,phase,video.frames.length);
 }
 await page.close();
}}finally{await browser.close()}
