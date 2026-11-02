import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
execFileSync(process.execPath,['tools/guardian/export_contact_banks_qa.mjs'],{stdio:'ignore'});
const banks=JSON.parse(await readFile('.cache/contact-bank-qa/walking.json','utf8')),dest=process.env.OUTPUT_DIR??'docs/guardian/gpu-animation/contact-bank-native-combat-abba';await mkdir(dest,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const [index,enabled] of [false,true,true,false].entries()){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];let intercepted=0;page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch(),source=await response.text(),needle='if(!audit?.disabled)supportAnimalOnTerrain(data,this.animalSupportSurface??=(x,z)=>this.nav.actorSurface(x,z));';if(!source.includes(needle))throw Error('Support hook changed');intercepted++;await route.fulfill({response,body:source.replace(needle,'if(!audit?.disabled)(globalThis.qaSupportCandidate??((d,e,s)=>supportAnimalOnTerrain(d,s)))(data,entity,this.animalSupportSurface??=(x,z)=>this.nav.actorSurface(x,z));')});});
   console.log(JSON.stringify({index,enabled,phase:'loading'}));
   await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?nativeRaid&biome=sabana&lightingReview&treeReview&recoveryDay&productionFarWarm&profileStages&frameTrace&wildEngineThreads=0');
   await page.waitForFunction(()=>{try{return window.treeReview&&JSON.parse(document.querySelector('#status').textContent).combatPhysics}catch{return false;}},null,{timeout:180000});
   const setup=await page.evaluate(async({banks,enabled})=>{const {createContactBankCandidate}=await import('/tests/browser/contact-bank-candidate.js'),{GpuTimer}=await import('/tests/browser/gpu-timer.js'),w=window.treeReview.world,gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),candidate=createContactBankCandidate(banks,enabled,w),timer=new GpuTimer(gl,64),original=w.drawWorldFrame;let frame=0;window.qaSupportStats=candidate.stats;window.qaSupportCandidate=candidate.apply;window.qaBenchMeasuring=true;window.qaBenchTimer=timer;w.drawWorldFrame=function(...args){const active=window.qaBenchMeasuring&&timer.begin(frame++);try{return original.apply(this,args);}finally{if(active)timer.end();}};return {authority:window.treeReview.authority,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};},{banks,enabled});
   if(setup.authority!=='spatial-wasm'||intercepted!==1)throw Error('Native authority or interception missing');
   await page.locator('#species').selectOption('lion');await page.locator('#direction').selectOption('side');await page.locator('#benchCollision').evaluate(e=>e.click());
   await page.waitForFunction(()=>{try{return window.treeReview?.errors?.length||JSON.parse(document.querySelector('#status').textContent).report?.completedSimulation;}catch{return window.treeReview?.errors?.length>0;}},null,{timeout:150000});
   const result=await page.evaluate(async()=>{window.qaBenchMeasuring=false;const timer=window.qaBenchTimer;for(let i=0;i<90&&timer.pending.length;i++){await new Promise(requestAnimationFrame);timer.poll();}const gpu=timer.report();timer.dispose();return {report:JSON.parse(document.querySelector('#status').textContent).report,stats:window.qaSupportStats,gpu,fixtureErrors:window.treeReview.errors};});
   const record={index,enabled,setup,intercepted,...result,pageErrors:errors};await writeFile(`${dest}/${index}.json`,JSON.stringify(record,null,2)+'\n');
   if(errors.length||result.fixtureErrors.length||result.report.errors?.length||result.report.hiddenFrames||result.report.rejectedPhysics||!result.report.completedSimulation||!result.stats.times.length||(enabled&&!result.stats.candidate))throw Error('Invalid or inactive benchmark block '+index);
   console.log(JSON.stringify({index,enabled,frames:result.report.frames,candidate:result.stats.candidate,fallback:result.stats.fallback,metrics:result.report.metrics,gpuSamples:result.gpu.samples.length}));
  }catch(error){await writeFile(`${dest}/${index}-failure.json`,JSON.stringify({index,enabled,error:String(error),errors},null,2)+'\n');throw error;}finally{await page.close();}
 }
}finally{await browser.close();}
