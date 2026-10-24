import {patchRiverWear} from './river-wear-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/river-grass-wear-performance';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media,baja').split(','))for(const biome of ['gran-rio']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||(/GL_INVALID|CONTEXT_LOST|error X/.test(m.text())))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.route('**/tools/experiments/qa-river-wear-generated.js*',async route=>{const response=await route.fetch({url:'http://127.0.0.1:5190/tools/experiments/qa-continuous-grass-river.js'});await route.fulfill({response,body:patchRiverWear(await response.text())});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});


 for(const region of (process.env.WG_RIVER_REGIONS??'vegetation').split(',')){
 const origin=await page.evaluate(region=>{if(region==='vegetation')return [87.83156862745099,7.077262442364413,15.827254901960785];const w=window.qaCampaignWorld,z=15.827254901960785,x=w.nav.field.riverX(z)+10;return [x,w.nav.field.surface(x,z)+.4,z];},region);
 for(const view of (process.env.WG_COVER_VIEWS??'game').split(',')){
 await page.evaluate(async({view,origin})=>{const w=window.qaCampaignWorld;w.controls.target.fromArray(origin);const offset=view==='close'?[3,2,4]:view==='game'?[22,16,18]:[16,30,18];w.camera.position.copy(w.controls.target).add({x:offset[0],y:offset[1],z:offset[2]});w.syncChunks();await w.horizon.whenReady();await w.whenChunksReady();w.render(.016);},{view,origin});
 for(const v of ['original','candidate']){await page.evaluate(async v=>{const w=window.qaCampaignWorld;await (await import('/tools/experiments/qa-river-wear-comparison.js')).applyComparison(w,v);w.render(.016)},v);await page.waitForTimeout(200);}
 for(const phase of (process.env.WG_COVER_PHASES??'day,night').split(','))for(const variant of (process.env.WG_COVER_ORDER??'original,candidate,candidate,original').split(',')){
 const audit=await page.evaluate(async({variant,phase})=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;const {applyComparison}=await import('/tools/experiments/qa-river-wear-comparison.js');return await applyComparison(w,variant);},{variant,phase});
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
 records.push({region,view,phase,variant,quality,...result,audit,errors:[...errors]});await writeFile(out+'/benchmarks-'+quality+(process.env.WG_COVER_SUFFIX??'')+'.json',JSON.stringify({seed:712,note:'Real paused campaign. Wear height only; rebuilt for each ABBA block, setup reported separately. 30 warmup +120 measured frames; no screenshots during timing. GPU wraps world.render; CPU includes render preparation. Fixed camera, wind frame/30. Geometry count equality must be audited; reduced projected blade area is not identical-image optimization.',records:records.filter(r=>r.quality===quality)},null,2)+'\n');console.log(quality,region,view,phase,variant,'GPU',result.gpu.samples.length,'errors',errors.length);

 }
 }
 }
 await page.close();
}}finally{await browser.close()}
