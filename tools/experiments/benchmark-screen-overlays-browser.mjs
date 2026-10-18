import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to a local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const output=process.argv[2];
if(!output)throw Error('Usage: benchmark-screen-overlays-browser.mjs OUTPUT.json');
const base=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const ids=(process.env.WG_QA_OVERLAY_IDS??'raid,dawn,critical,growth,multiply,shield,nightfall,victory,defeat').split(',');
const quality=process.env.WG_QA_QUALITY??'media';
const width=Number(process.env.WG_QA_WIDTH??1280),height=Number(process.env.WG_QA_HEIGHT??800);
const browser=await chromium.launch({channel:process.env.WG_QA_BROWSER??'chrome',headless:process.env.WG_QA_HEADLESS!=='0'});
const page=await browser.newPage({viewport:{width,height}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
const report={kind:'screen-overlay-rendered-abba',ids,quality,viewport:[width,height],errors,complete:false,results:[]};
try{
  await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false,sfx:0,music:0})),quality);
  await page.goto(`${base}/?qa-spatial-seed=712&qa-crop-spell-frame&qa-loading-gpu-gameplay`);
  await page.waitForSelector('#native-menu',{timeout:30000});
  const menu=page.frames().find(frame=>frame.url().includes('/menu/'));
  if(!menu)throw Error('Native menu iframe was not ready');
  await menu.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'sabana',culture:'mapungubwe'},location.origin));
  await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')||document.querySelector('.loading-failure'),null,{timeout:120000});
  report.ready=await page.evaluate(async()=>{
    const qa=globalThis.wildGuardiansSpatialQa?.(),gl=qa?.world?.renderer.getContext(),ext=gl?.getExtension('WEBGL_debug_renderer_info');
    if(!qa?.world||!qa.fieldShared)throw Error('Wild Engine world was unavailable');
    qa.state.pauses=['qa-overlay-benchmark'];
    const {ScreenOverlays,preloadScreenOverlays}=await import('/src/ui/screen-overlays.js');
    const preloadStart=performance.now();await preloadScreenOverlays();
    const overlay=new ScreenOverlays(document.querySelector('#stage'),{quality:()=>qa.world.quality??'media',reduced:()=>false});
    globalThis.__overlayBenchmark=overlay;
    const originalDraw=overlay.painter.draw;
    overlay.painter.draw=(...args)=>{const start=performance.now();try{return originalDraw(...args);}finally{globalThis.__overlayPaintSamples.push(performance.now()-start);}};
    globalThis.__overlayPaintSamples=[];
    return {authority:qa.fieldShared,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),gpuTimer:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'),preloadMs:performance.now()-preloadStart,canvas:[overlay.canvas.width,overlay.canvas.height]};
  });
  if(!report.ready.gpuTimer||errors.length)throw Error(`Browser fixture unavailable: ${JSON.stringify({ready:report.ready,errors})}`);
  const arms=['control','effect','effect','control'];
  for(const id of ids)for(const arm of arms){
    const result=await page.evaluate(async({id,arm})=>{
      const {gpu}=globalThis.wildGuardiansSpatialQa(),overlay=globalThis.__overlayBenchmark;
      const stats=values=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);return sorted.length?{count:sorted.length,median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.floor((sorted.length-1)*.95)],max:sorted.at(-1)}:null;};
      const active=arm==='effect',duration={critical:250,growth:300,multiply:300,shield:300,victory:1500,defeat:1100}[id]??600;
      overlay.policy.pending=null;overlay.policy.active=null;overlay.update();
      for(let i=0;i<8;i++)await new Promise(resolve=>requestAnimationFrame(resolve));
      gpu.reset();globalThis.__overlayPaintSamples.length=0;
      const drawStart=overlay.drawCount,updates=[],stamps=[],heapStart=performance.memory?.usedJSHeapSize??null;
      for(let i=0;i<60;i++)await new Promise(resolve=>requestAnimationFrame(at=>{
        stamps.push(at);overlay.policy.active=active?{id,start:performance.now()-duration*.45,end:performance.now()+duration*.55}:null;
        const start=performance.now();overlay.update();updates.push(performance.now()-start);resolve();
      }));
      gpu.close('overlay-arm-ended');
      const probe=JSON.parse(document.querySelector('#loading-gameplay-gpu-qa').textContent);
      const intervals=stamps.slice(1).map((at,index)=>at-stamps[index]);
      const result={id,arm,frames:stamps.length,canvas:[overlay.canvas.width,overlay.canvas.height],draws:overlay.drawCount-drawStart,
        updateMs:stats(updates.slice(10)),paintMs:stats(globalThis.__overlayPaintSamples.slice(5)),frameIntervalMs:stats(intervals.slice(10)),
        webglGpuMs:stats(probe.gpu.samples.map(s=>s.ms).slice(10)),heapBefore:heapStart,heapAfter:performance.memory?.usedJSHeapSize??null};
      overlay.policy.active=null;overlay.update();return result;
    },{id,arm});
    report.results.push(result);await writeFile(output,JSON.stringify(report,null,2)+'\n');
    console.error(`${id} ${arm}: update ${result.updateMs?.median??'n/a'} ms, frame ${result.frameIntervalMs?.median??'n/a'} ms, draws ${result.draws}`);
  }
  report.complete=true;
  if(errors.length)throw Error(`Browser errors: ${errors.join('; ')}`);
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
}finally{
  try{await page.evaluate(()=>globalThis.__overlayBenchmark?.dispose());}catch{}
  await browser.close();
}
