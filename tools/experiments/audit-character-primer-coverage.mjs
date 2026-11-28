// Diagnostic only: instrument the real opt-in loading primer, without changing
// simulation state. Occlusion queries show samples passing depth, not complete
// visual correctness or whether every resource was initialized.
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:process.env.QA_NATIVE_GPU==='1'?[]:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',error=>errors.push(String(error.stack??error)));
 await page.route('**/src/rendering/character-preload.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const one='for(const actor of actors){check();',two='lod.root.visible=true;';
  if(!body.includes(one)||!body.includes(two))throw Error('Character primer instrumentation anchor changed');
  body=body.replace(one,"for(const actor of actors){actor.model.userData.qaPrimerLabel=actor.id+':original';check();").replace(two,"lod.root.userData.qaPrimerLabel=actor.id+':lod';lod.root.visible=true;");
  await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/scene.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const start="camera.lookAt(target);camera.updateMatrixWorld();await phase('warm-character-pixels'",end="await phase('warm-final-fence',()=>waitForGpuPreload(this.renderer,{signal:this.loading.signal,cancelled:()=>this.disposed,getEpoch:()=>this.glResourceEpoch?.stats.epoch??0}));if(this.disposed)return;";
  if(!body.includes(start)||!body.includes(end))throw Error('Scene instrumentation anchor changed');
  body=body.replace(start,"camera.lookAt(target);camera.updateMatrixWorld();globalThis.__primerCoverageProbe=(await import('/tools/experiments/character-primer-coverage.js')).beginPrimerCoverage(this.renderer,characterStage,camera);await phase('warm-character-pixels'");
  const after="cancelled:()=>this.disposed}));}";
  if(!body.includes(after))throw Error('Character draw end anchor changed');
  body=body.replace(after,"cancelled:()=>this.disposed}));await waitForGpuPreload(this.renderer,{signal:this.loading.signal,cancelled:()=>this.disposed});globalThis.__primerCoverage=globalThis.__primerCoverageProbe.finish();globalThis.__primerDayNight=(await import('/tools/experiments/character-primer-day-night.js')).comparePrimerDayNight(this,characterStage,camera);}");
  await route.fulfill({response,body});
 });
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-worker-raid&qa-character-preload=1&qa-character-lod-warm&qa-guardian-program-warm&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 const gpu=await page.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;});
 if(process.env.QA_EXPECT_GPU&&!gpu?.includes(process.env.QA_EXPECT_GPU))throw Error('Unexpected GPU '+gpu);
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game',null,{timeout:180000});
 const {coverage,dayNight}=await page.evaluate(()=>({coverage:window.__primerCoverage??null,dayNight:window.__primerDayNight??null}));
 if(errors.length||!coverage||!dayNight)throw Error(JSON.stringify({errors,coverage,dayNight}));
 console.log(JSON.stringify({gpu,coverage,dayNight,limitations:['Samples passing the existing depth buffer are a conservative coverage witness; no samples can also mean occlusion or depth rejection.','Day/night comparison changes light intensities and toon uniform in the same staging draw; it does not cover gameplay effects, shadow-map rendering or first-appearance performance.']}));
}finally{await browser.close();}
