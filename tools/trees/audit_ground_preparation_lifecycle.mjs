import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const results=[];
 for(const mode of ['cancel','context-loss','shader-failure']){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.route('**/src/rendering/prepare-mangrove-cache-program.js*',async route=>{
    const response=await route.fetch();let source=await response.text();const target='target=makeTarget();',submit='try{renderer.setRenderTarget(target);pending=cache.prepareProgram',done='await pending;check();';
    if(!source.includes(target)||!source.includes(submit)||!source.includes(done))throw Error('Lifecycle hooks missing');
    source=source.replace(target,`${target}globalThis.__qaGroundLifecycle={targetDisposed:false,validated:0,finished:false,cache,renderer,gl};target.addEventListener('dispose',()=>globalThis.__qaGroundLifecycle.targetDisposed=true);`);
    source=source.replace(submit,`globalThis.__qaGroundHoldReady=${mode!=='shader-failure'};${submit}`);
    source=source.replace('check();prepareBindings(renderer,program);bindings++;','check();globalThis.__qaGroundLifecycle.validated++;prepareBindings(renderer,program);bindings++;');
    source=source.replace(done,`globalThis.__qaGroundLifecycle.submitted=true;try{await pending;check();}finally{globalThis.__qaGroundLifecycle.finished=true;globalThis.__qaGroundHoldReady=false;}`);
    await route.fulfill({response,body:source});
   });
   await page.route('**/tools/experiments/compile-gpu-preparation.js*',async route=>{const response=await route.fetch();let source=await response.text();const n='if(program.isReady()){';if(!source.includes(n))throw Error('Readiness hook missing');source=source.replace(n,'if(!globalThis.__qaGroundHoldReady&&program.isReady()){');await route.fulfill({response,body:source});});
   if(mode==='shader-failure')await page.route('**/src/rendering/mangrove-material-cache-shader.js*',async route=>{const response=await route.fetch();let source=await response.text(),n='void main(){';if(!source.includes(n))throw Error('Bake shader hook missing');source=source.replace(n,'void main(){ qa_intentional_shader_failure;');await route.fulfill({response,body:source});});
   await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',sfx:0,music:0})));
   await page.goto('http://127.0.0.1:5175/?qa-spatial-seed=712&qa-loading&qa-crop-spell-frame&qaGroundProgramWarm=1');await page.waitForSelector('#native-menu',{timeout:30000});const menu=page.frames().find(f=>f.url().includes('/menu/'));if(!menu)throw Error('Menu unavailable');
   await menu.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'manglares',culture:'mapungubwe'},location.origin));
   await page.waitForFunction(()=>window.__qaGroundLifecycle?.submitted,{timeout:240000});
   const before=await page.evaluate(()=>({validated:window.__qaGroundLifecycle.validated,targetDisposed:window.__qaGroundLifecycle.targetDisposed,contextLost:window.__qaGroundLifecycle.gl.isContextLost(),targetRestored:window.__qaGroundLifecycle.renderer.getRenderTarget()===null,overlay:!!document.querySelector('#loading-cancel')}));
   if(mode==='cancel')await page.locator('#loading-cancel').click();else if(mode==='context-loss')await page.evaluate(()=>{const gl=window.__qaGroundLifecycle.gl,ext=gl.getExtension('WEBGL_lose_context');if(!ext)throw Error('WEBGL_lose_context unavailable');ext.loseContext();});
   await page.waitForFunction(()=>window.__qaGroundLifecycle?.finished&&window.__qaGroundLifecycle?.targetDisposed&&document.querySelector('#native-menu'),null,{timeout:30000});
   const after=await page.evaluate(()=>({validated:window.__qaGroundLifecycle.validated,targetDisposed:window.__qaGroundLifecycle.targetDisposed,finished:window.__qaGroundLifecycle.finished,cacheDisposed:window.__qaGroundLifecycle.cache.disposed,contextLost:window.__qaGroundLifecycle.gl.isContextLost(),overlay:!!document.querySelector('#loading-cancel'),failure:document.querySelector('.loading-failure')?.textContent??null}));
   if(mode!=='shader-failure'&&(before.validated||before.targetDisposed||!before.targetRestored||!before.overlay||after.validated)||!after.cacheDisposed||after.overlay||mode!=='cancel'&&!after.failure||mode==='cancel'&&after.failure||errors.length)throw Error(JSON.stringify({mode,before,after,errors}));
   results.push({mode,before,after,errors});console.log(JSON.stringify(results.at(-1)));
  }finally{await page.close();}
 }
 await writeFile('docs/lighting/tree-near-retexture/performance/manglares-ground-preparation-lifecycle-browser.json',JSON.stringify({scope:'Actual new-game loading on WebGL. QA delays readiness after real submission to deterministically interrupt cancel and context-loss runs, and injects an invalid shader for failure. No recovery into gameplay or visual parity.',results},null,2)+'\n');
}finally{await browser.close();}
