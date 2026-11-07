import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const out='docs/lighting/tree-near-retexture/performance/animal-skin-cache-combat-abba';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const [lot,cached] of [false,true,true,false].entries()){
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const query='biome=manglares&culture=mapungubwe&lightingReview&characterLod=auto&recoveryClose&profileStages&recoveryDay&frameTrace&depthReview&productionFarWarm&treeReview&wildEngineThreads=0';
  await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?'+query);
  await page.waitForFunction(()=>{try{return window.treeReview&&JSON.parse(document.querySelector('#status').textContent).combatPhysics}catch{return false;}},null,{timeout:180000});
  const device=await page.evaluate(async enabled=>{
   const {GpuTimer}=await import('/tests/browser/gpu-timer.js'),w=window.treeReview.world,gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),originalUpdate=w.updateActor,originalDraw=w.drawWorldFrame,timer=new GpuTimer(gl,64);let sequence=0;
   w.updateActor=function(actor,dt,type){const data=this.mixers.get(actor.id);if(type==='animal'&&data)data.cachedSkinning=enabled;return originalUpdate.call(this,actor,dt,type);};
   w.drawWorldFrame=function(...args){const active=window.skinCacheMeasure&&timer.begin(sequence++);try{return originalDraw.apply(this,args);}finally{if(active)timer.end();}};
   window.skinCacheGpuTimer=timer;return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),authority:window.treeReview.authority,network:window.treeReview.state.mangroveNetwork??false};
  },cached);
  if(device.authority!=='spatial-wasm'||!device.network)throw Error('Mangrove run must use the Wild Engine island layout');
  await page.locator('#species').selectOption('lion');await page.locator('#direction').selectOption('side');await page.evaluate(()=>{window.skinCacheGpuTimer.clear();window.skinCacheMeasure=true;});await page.locator('#benchCollision').evaluate(e=>e.click());
  await page.waitForFunction(()=>{try{return JSON.parse(document.querySelector('#status').textContent).report?.completedSimulation}catch{return false;}},null,{timeout:150000});
  const data=await page.locator('#status').evaluate(e=>JSON.parse(e.textContent)),gpu=await page.evaluate(async()=>{window.skinCacheMeasure=false;const timer=window.skinCacheGpuTimer;for(let i=0;i<90&&timer.pending.length;i++){await new Promise(requestAnimationFrame);timer.poll();}const report=timer.report();timer.dispose();return report;});
  fs.writeFileSync(`${out}/${lot}.json`,JSON.stringify({...data,lot,cached,device,gpuTimer:gpu,pageErrors:errors},null,2));
  if(errors.length||data.errors.length||data.report.errors.length||data.report.hiddenFrames||data.report.rejectedPhysics)throw Error('Invalid run '+lot);
  console.log(JSON.stringify({lot,cached,device,dt:data.report.metrics.dt,render:data.report.metrics.renderMs,physics:data.report.metrics.physicsTotal,gpuSamples:gpu.samples.length,gpuReason:gpu.reason}));await page.close();
 }
}finally{await browser.close();}
