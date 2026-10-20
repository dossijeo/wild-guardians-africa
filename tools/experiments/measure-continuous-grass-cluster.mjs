import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/continuous-grass-cluster';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media,baja').split(','))for(const biome of ['sabana']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||(/GL_INVALID|CONTEXT_LOST|error X/.test(m.text())))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});


 const origin=[135,9.400129699707032,45];
 for(const view of (process.env.WG_COVER_VIEWS??'close,game,elevated').split(',')){
 await page.evaluate(async({view,origin})=>{const w=window.qaCampaignWorld;w.controls.target.fromArray(origin);const offset=view==='close'?[3,2,4]:view==='game'?[22,16,18]:[16,30,18];w.camera.position.copy(w.controls.target).add({x:offset[0],y:offset[1],z:offset[2]});w.syncChunks();await w.horizon.whenReady();await w.whenChunksReady();w.render(.016);},{view,origin});
 for(const v of ['C','cluster']){await page.evaluate(async v=>{const w=window.qaCampaignWorld;await (await import('/tools/experiments/qa-continuous-grass-cluster.js')).applyMaterialStudy(w,v);w.render(.016)},v);await page.waitForTimeout(200);}
 for(const phase of (process.env.WG_COVER_PHASES??'day,night').split(','))for(const variant of (process.env.WG_COVER_ORDER??'C,cluster,cluster,C').split(',')){
 const audit=await page.evaluate(async({variant,phase})=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;const {applyMaterialStudy}=await import('/tools/experiments/qa-continuous-grass-cluster.js');return await applyMaterialStudy(w,variant);},{variant,phase});
 await page.waitForTimeout(1200);

 const result=await page.evaluate(async()=>{
  const w=window.qaCampaignWorld,r=w.renderer,gl=r.getContext();
  const {GpuTimer}=await import('/tests/browser/gpu-timer.js'),gpu=new GpuTimer(gl);const original=w.render,cpu=[],poses=new Set();let frame=0;
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{w.render=original;gpu.dispose();reject(Error('Benchmark timeout'));},45000);
   w.render=function(...args){w.qaContinuousGrass.timeOverride=frame/30;const sample=frame>=30;if(sample)gpu.begin(frame-30);const start=performance.now();try{return original.apply(this,args);}finally{if(sample){cpu.push(performance.now()-start);gpu.end();poses.add(w.camera.position.toArray().join(','));}if(++frame===150){w.render=original;clearTimeout(timeout);resolve();}}};
  });
  for(let i=0;i<120&&gpu.pending.length;i++){await new Promise(resolve=>setTimeout(resolve,8));gpu.poll();}const timing=gpu.report();gpu.dispose();
  const auto=r.info.autoReset;r.info.autoReset=false;r.info.reset();w.render(.016);const calls=r.info.render.calls,triangles=r.info.render.triangles;r.info.autoReset=auto;
  const ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {coverage:w.qaContinuousGrass.audit(),glError:gl.getError(),cpu,gpu:timing,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,quality:w.quality,cameraStable:poses.size===1,calls,triangles,geometries:r.info.memory.geometries,textures:r.info.memory.textures,device:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),resolution:[r.domElement.width,r.domElement.height]};
 });
 records.push({view,phase,variant,quality,...result,audit,errors:[...errors]});await writeFile(out+'/benchmarks-'+quality+(process.env.WG_COVER_SUFFIX??'')+'.json',JSON.stringify({seed:712,note:'Actual campaign loop, global-lighting. C/cluster/cluster/C with wind 8x at frame/30; fixed camera. 30 warmup +120 samples per block; CPU submission and GPU all render passes. No screenshot/readback inside timing.',records:records.filter(r=>r.quality===quality)},null,2)+'\n');console.log(quality,view,phase,variant,'GPU',result.gpu.samples.length,'errors',errors.length);

 }
 }
 await page.close();
}}finally{await browser.close()}
