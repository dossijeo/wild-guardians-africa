import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to a local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const base=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const output=process.argv[2];
const counts=(process.argv[3]??'100,500,1500').split(',').map(Number);
if(!counts.length||counts.some(count=>!Number.isSafeInteger(count)||count<1))
  throw Error('Expected positive comma-separated crop counts');
const arms=(process.env.WG_QA_ARMS??'control,growth,multiply,control-after').split(',');
if(arms.length!==4||arms[0]!=='control'||arms[3]!=='control-after'||
  !['growth','multiply'].includes(arms[1])||!['growth','multiply'].includes(arms[2])||arms[1]===arms[2])
  throw Error('WG_QA_ARMS must be control,growth,multiply,control-after or control,multiply,growth,control-after');
const gpuEnabled=process.env.WG_QA_GPU!=='0';
const mode=process.env.WG_QA_MODE??'direct';
if(!['direct','raf'].includes(mode))throw Error('WG_QA_MODE must be direct or raf');
const browserName=process.env.WG_QA_BROWSER??'bundled-chromium';
if(!['bundled-chromium','chrome'].includes(browserName))throw Error('WG_QA_BROWSER must be bundled-chromium or chrome');
const browser=await chromium.launch({
  ...(browserName==='chrome'?{channel:'chrome'}:{}),
  headless:process.env.WG_QA_HEADLESS==='0'?false:true,
});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
try{
  await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',
    JSON.stringify({quality:'media',farVegetation:false,sfx:0,music:0})));
  await page.goto(`${base}/?qa-spatial-seed=712&qa-crop-spell-frame${gpuEnabled?'&qa-loading-gpu-gameplay':''}`);
  await page.waitForSelector('#native-menu',{timeout:30000});
  const menu=page.frames().find(frame=>frame.url().includes('/menu/'));
  if(!menu)throw Error('Native menu iframe was not ready');
  await menu.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',
    action:'start',biome:'sabana',culture:'mapungubwe'},location.origin));
  await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')||
    document.querySelector('.loading-failure'),null,{timeout:120000});
  const ready=await page.evaluate(()=>{
    const world=globalThis.wildGuardiansSpatialQa?.().world;
    const gl=world?.renderer.getContext();
    const debug=gl?.getExtension('WEBGL_debug_renderer_info');
    return {world:!!document.querySelector('#stage[aria-busy="false"]'),
      failure:document.querySelector('.loading-failure')?.textContent??null,
      authority:globalThis.wildGuardiansSpatialQa?.().fieldShared??false,
      webglRenderer:gl?(debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):null};
  });
  if(!ready.world||!ready.authority||errors.length)throw Error(JSON.stringify({ready,errors}));

  await page.evaluate(mode=>{
    const {state,world,gpu}=globalThis.wildGuardiansSpatialQa();
    if(!state||!world)throw Error('Spell frame QA hook unavailable');
    if(mode==='direct')globalThis.__wildSpellFrameManual=true;
    state.pauses=['qa-spell-frame'];
    state.time=100;
    state.spells=[];
    const wrap=(owner,name,key)=>{
      const original=owner[name];
      owner[name]=function(...args){
        const start=performance.now();
        try{return original.apply(this,args);}
        finally{globalThis.__spellFrameCapture?.[key].push(performance.now()-start);}
      };
    };
    wrap(world,'render','renderMs');
    wrap(world,'sync','syncMs');
    wrap(world.agricultureVfx,'update','vfxUpdateMs');
    wrap(world.agricultureVfx,'prepare','vfxPrepareMs');
  },mode);

  const report={kind:'synthetic-interactive-frame-qa',seed:712,biome:'sabana',
    counts,arms,gpuEnabled,mode,browserName,webglRenderer:ready.webglRenderer,
    note:'Synthetic plants in the real Wild Engine browser renderer. Simulation is paused; RAF, crop synchronization and VFX run. GPU timings require EXT_disjoint_timer_query_webgl2. Not a legal campaign or an uninstrumented frame-rate benchmark.',
    errors,complete:false,results:[]};
  for(const count of counts){
    await page.evaluate(async({count,mode})=>{
      const {createPlant}=await import('/src/simulation/crops.js');
      const {state,world}=globalThis.wildGuardiansSpatialQa();
      const center=state.villages[0].center;
      state.plants=Array.from({length:count},(_,index)=>createPlant(
        `spell-frame-${count}-${index}`,'mijo',center.x+5+(index%40)*1.5,
        center.z+5+Math.floor(index/40)*1.5,null));
      state.spells=[];
      if(mode==='direct')for(let i=0;i<5;i++)world.render(0);
      else for(let i=0;i<20;i++)await new Promise(resolve=>requestAnimationFrame(resolve));
      if(world.cropBatch.capacity<count)throw Error('Crop batch did not reach fixture capacity');
    },{count,mode});
    for(const kind of arms){
      const result=await page.evaluate(async({count,kind,mode})=>{
        const {state,world,gpu}=globalThis.wildGuardiansSpatialQa();
        const center=state.villages[0].center;
        state.spells=kind==='control'||kind==='control-after'?[]:[{
          id:`spell-frame-${count}-${kind}`,kind,x:center.x+10,z:center.z+10,
          radius:12,remaining:kind==='growth'?29:14}];
        gpu?.reset();
        const capture={renderMs:[],syncMs:[],vfxUpdateMs:[],vfxPrepareMs:[]};
        globalThis.__spellFrameCapture=capture;
        const frameAts=[],started=performance.now();
        const targetFrames=mode==='direct'?40:60;
        for(let i=0;i<targetFrames;i++){
          if(mode==='direct'){world.render(0);frameAts.push(performance.now());}
          else await new Promise(resolve=>requestAnimationFrame(at=>{frameAts.push(at);resolve();}));
          if(performance.now()-started>45000)break;
        }
        globalThis.__spellFrameCapture=null;
        gpu?.close('arm-ended');
        const probe=gpu?JSON.parse(document.querySelector('#loading-gameplay-gpu-qa').textContent):null;
        const intervals=frameAts.slice(1).map((at,index)=>at-frameAts[index]);
        const stats=values=>{
          const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
          if(!sorted.length)return null;
          return {count:sorted.length,median:sorted[Math.floor(sorted.length/2)],
            p95:sorted[Math.floor((sorted.length-1)*.95)],max:sorted.at(-1)};
        };
        return {count,kind,frames:frameAts.length,truncated:frameAts.length<targetFrames,
          elapsedMs:performance.now()-started,
          interval:stats(intervals.slice(10)),firstIntervals:intervals.slice(0,8),
          render:stats(capture.renderMs.slice(10)),sync:stats(capture.syncMs.slice(10)),
          vfxUpdate:stats(capture.vfxUpdateMs.slice(10)),
          vfxPrepare:stats(capture.vfxPrepareMs.slice(10)),
          gpu:probe?{supported:probe.gpu.supported,reason:probe.gpu.reason,
            elapsed:stats(probe.gpu.samples.map(sample=>sample.ms).slice(10))}:null,
          activeEffects:world.agricultureVfx.effects.size,
          nativeVfxInstances:world.vfxLibrary.instances.size,
          rendererMemory:{...world.renderer.info.memory}};
      },{count,kind,mode});
      report.results.push(result);
      if(output)await writeFile(output,JSON.stringify(report,null,2)+'\n');
      console.error(`Measured ${count} crops / ${kind}: ${result.frames} frames, ${Math.round(result.elapsedMs)} ms`);
    }
  }
  report.complete=true;
  if(output)await writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{await browser.close();}
