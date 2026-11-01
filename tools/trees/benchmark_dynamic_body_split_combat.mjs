import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const audit=process.env.NATIVE_INTENT_AUDIT==='1',out='docs/lighting/tree-near-retexture/performance/dynamic-body-split-native-raid-'+(audit?'intent-audit':'abba')+(process.env.RUN_SUFFIX??'');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const [lot,candidate] of (audit?[true]:[false,true,true,false]).entries()){
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];let loads=0;page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/spatial-savanna.wasm*',route=>{const url=new URL(route.request().url());if(url.search)return route.continue();loads++;return route.fulfill({path:candidate?(process.env.DYNAMIC_BODY_CANDIDATE??'.cache/spatial-dynamic-test.wasm'):(process.env.DYNAMIC_BODY_BASE??'.cache/spatial-dynamic-index-before.wasm'),contentType:'application/wasm'});});
  const query='nativeRaid&treeReview&lightingReview&characterLod=auto&recoveryClose&profileStages&recoveryDay&frameTrace&wildEngineThreads=0&nativeAvoidanceReview&nativeAvoidanceOnly'+(audit?'&nativeIntentAudit':'');
  console.log(JSON.stringify({lot,candidate,phase:'loading'}));await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?'+query);
  try{await page.waitForFunction(()=>{try{return JSON.parse(document.querySelector('#status').textContent).combatPhysics}catch{return false}},null,{timeout:90000});}catch(error){const status=await page.locator('#status').textContent();fs.writeFileSync(`${out}/load-failure-${lot}.json`,JSON.stringify({candidate,loads,status,errors,failure:String(error)},null,2));throw error;}
  const info=await page.evaluate(()=>{const w=window.treeReview,gl=document.querySelector('#world').getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return {authority:w.authority,network:w.state.mangroveNetwork??false,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl?.getParameter(gl.RENDERER)}});
  if(info.authority!=='spatial-wasm'||loads<1)throw Error('Expected native world and candidate WASM: '+JSON.stringify({info,loads,errors}));
  await page.evaluate(async()=>{const {GpuTimer}=await import('/tests/browser/gpu-timer.js'),w=window.treeReview.world,timer=new GpuTimer(w.renderer.getContext(),64),draw=w.drawWorldFrame;let frame=0;window.dynamicSplitMeasuring=true;w.drawWorldFrame=function(...args){const active=window.dynamicSplitMeasuring&&timer.begin(frame++);try{return draw.apply(this,args)}finally{if(active)timer.end();}};window.dynamicSplitTimer=timer;});
  await page.locator('#species').selectOption('lion');await page.locator('#direction').selectOption('side');await page.locator('#benchPhysics').evaluate(e=>e.click());
  await page.waitForFunction(()=>{try{return JSON.parse(document.querySelector('#status').textContent).report?.completedSimulation}catch{return false}},null,{timeout:150000});
  const data=await page.locator('#status').evaluate(e=>JSON.parse(e.textContent)),terrainCache=await page.evaluate(()=>window.treeReview.nav.dynamicBodyReview?.terrainCacheStats()),gpuTimer=await page.evaluate(async()=>{window.dynamicSplitMeasuring=false;const timer=window.dynamicSplitTimer;for(let i=0;i<90&&timer.pending.length;i++){await new Promise(requestAnimationFrame);timer.poll();}const result=timer.report();timer.dispose();return result;});fs.writeFileSync(`${out}/${lot}.json`,JSON.stringify({lot,candidate,loads,info,errors,...data,gpuTimer,terrainCache},null,2));
  if(errors.length||data.errors.length||data.report.errors.length||data.report.hiddenFrames||data.report.rejectedPhysics||!data.report.nativeAvoidanceStats?.calls)throw Error('Invalid run or no native avoidance queries '+lot);
  console.log(JSON.stringify({lot,candidate,info,dt:data.report.metrics.dt,render:data.report.metrics.renderMs,physics:data.report.metrics.physicsTotal,avoidance:data.report.nativeAvoidanceStats,terrainCache}));await page.close();
 }
}finally{await browser.close();}
