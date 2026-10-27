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
  for(const visible of [false,true,true,false]){
   const result=await page.evaluate(async visible=>{
    const w=window.qaCampaignWorld,d=w.groundDetails;d.mesh.castShadow=visible;w.releaseNativeShadow.cache.enabled=false;w.releaseNativeShadow.cache.invalidate();
    const {GpuTimer}=await import('/tests/browser/gpu-timer.js'),gpu=new GpuTimer(w.renderer.getContext());
    const original=w.render,cpu=[],poses=new Set();let frame=0;
    await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>{w.render=original;gpu.dispose();reject(Error('Campaign benchmark timeout'));},30000);
     w.render=function(...args){
      const sample=frame>=30;if(sample)gpu.begin(frame-30);const start=performance.now();
      try{return original.apply(this,args);}finally{if(sample){cpu.push(performance.now()-start);gpu.end();poses.add(w.camera.position.toArray().join(','));}frame++;if(frame===210){w.render=original;clearTimeout(timer);resolve();}}
     };
    });
    for(let i=0;i<120&&gpu.pending.length;i++){await new Promise(r=>setTimeout(r,8));gpu.poll();}
    const report=gpu.report();gpu.dispose();if(d.count>192)throw Error('Grass capacity exceeded');
    return {castShadow:visible,shadowCacheEnabled:w.releaseNativeShadow.cache.enabled,cpu,gpu:report,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,cameraStable:poses.size===1,count:d.count,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures};
   },visible);records.push({biome,phase,...result,errors:[...errors]});await writeFile(out+'/campaign-performance.json',JSON.stringify({note:'Actual campaign render loop; paused simulation; ABBA grass shadow casting, grass visible in both states; shadow cache disabled in both states to measure every depth pass; 30 warmup + 180 samples.',records},null,2)+'\n');console.log(biome,phase,visible);
  }
  await page.evaluate(()=>{const w=window.qaCampaignWorld;w.groundDetails.mesh.castShadow=true;w.releaseNativeShadow.cache.invalidate();});
  if(process.env.WG_GRASS_VIDEO!=='0'){
  const video=await page.evaluate(async()=>{
   const w=window.qaCampaignWorld,canvas=w.renderer.domElement,stream=canvas.captureStream(30),chunks=[],frames=[];
   const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:4000000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   const old=w.updateCamera,start=performance.now(),position=w.camera.position.clone(),target=w.controls.target.clone();
   w.updateCamera=()=>{const seconds=Math.min(6,(performance.now()-start)/1000);w.camera.position.copy(position);w.controls.target.copy(target);w.camera.position.x+=seconds*2;w.controls.target.x+=seconds*2;old();frames.push({t:seconds,count:w.groundDetails.count,transitioning:w.groundDetails.qaActive.filter(p=>p.scale>0&&p.scale<1).length});};
   const done=new Promise(resolve=>recorder.onstop=resolve);recorder.start();await new Promise(r=>setTimeout(r,6000));recorder.stop();await done;w.updateCamera=old;w.camera.position.copy(position);w.controls.target.copy(target);stream.getTracks().forEach(t=>t.stop());
   return {bytes:Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer())),frames};
  });
  await writeFile(`${out}/${biome}-${phase}-motion.webm`,Buffer.from(video.bytes));await writeFile(`${out}/${biome}-${phase}-motion.json`,JSON.stringify(video.frames)+'\n');
  }
 }
 await page.close();
}}finally{await browser.close()}
