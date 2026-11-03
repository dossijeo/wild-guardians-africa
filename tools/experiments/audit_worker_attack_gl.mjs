import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:process.env.QA_NATIVE_GPU==='1'?[]:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{let last;window.__attackIntervals=[];function frame(now){if(last!==undefined)window.__attackIntervals.push(now-last);last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);});
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-worker-raid&qa-worker-frame-spans&qa-worker-gl-calls&qa-visibility&wildEngineThreads=0${process.env.QA_LOD_WARM==='1'?'&qa-character-lod-warm':''}`,{waitUntil:'domcontentloaded'});
 const gpu=await page.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return gl?(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):null;});if(process.env.QA_EXPECT_GPU&&!gpu?.includes(process.env.QA_EXPECT_GPU))throw Error('Unexpected device: '+gpu);
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game',null,{timeout:180000});await page.evaluate(()=>{window.__attackIntervals=[];window.__stopPreludeSpans=window.wildGuardiansWorkerFrameSpansQa();});
 await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.animals>1&&q.elapsed>=12;},null,{timeout:180000});const prelude=await page.evaluate(()=>{const spans=window.__stopPreludeSpans(),values=window.__attackIntervals.slice().sort((a,b)=>a-b),at=q=>values.length?values[Math.min(values.length-1,Math.ceil(values.length*q)-1)]:null;return {count:values.length,mean:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),p95:at(.95),p99:at(.99),max:values.at(-1)??null,slow:spans.sort((a,b)=>b.duration-a.duration).slice(0,15)};});
 const ids=await page.evaluate(()=>window.wildGuardiansWorkerCombatQa().animals.filter(a=>!['gone','retreating'].includes(a.status)).slice(0,2).map(a=>a.id));if(ids.length!==2)throw Error('Missing targets');
 await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="attack"]').click();const runs=[];
 for(const [i,id] of ids.entries()){
  if(i)await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerCombatQa();return Number.isFinite(q.gestureAt)&&q.elapsed-q.gestureAt>=1.74;},null,{timeout:60000});
  const lodBefore=await page.evaluate(()=>window.wildGuardiansVisibilityQa().actors.map(a=>({id:a.id,ready:a.ready,lod:a.lod})));const handlerMs=await page.evaluate(id=>{window.__attackIntervals=[];window.__stopAttackSpans=window.wildGuardiansWorkerFrameSpansQa();const t=performance.now();window.wildGuardiansWorkerAttackQa(id);return performance.now()-t;},id);
  await page.waitForFunction(id=>window.wildGuardiansWorkerCombatQa().hits.includes(id)||window.wildGuardiansWorkerQa().status.fault,id,{timeout:60000});await page.waitForTimeout(600);
  const out=await page.evaluate(()=>({frames:window.__attackIntervals,spans:window.__stopAttackSpans(),status:window.wildGuardiansWorkerQa().status}));if(out.status.fault||errors.length)throw Error(JSON.stringify({out,errors}));
  const lodAfter=await page.evaluate(()=>window.wildGuardiansVisibilityQa().actors.map(a=>({id:a.id,ready:a.ready,lod:a.lod})));runs.push({id,handlerMs,lodBefore,lodAfter,frames:{count:out.frames.length,max:out.frames.length?Math.max(...out.frames):null},glCalls:out.spans.filter(s=>s.label.startsWith('gl-')).sort((a,b)=>b.duration-a.duration),spans:out.spans.sort((a,b)=>b.duration-a.duration).slice(0,15)});
 }
 console.log(JSON.stringify({gpu,prelude,runs,scope:'One real opt-in savanna game; two direct QA attacks, synchronous GL-call durations and resource counts only. Prelude starts at gameplay. Nested spans are not additive; no GPU timer, deterministic replay or visual comparison.'}));
}finally{await browser.close();}
