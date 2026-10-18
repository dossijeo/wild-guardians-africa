import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to a local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const base=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const output=process.argv[2];
if(!output)throw Error('Usage: benchmark-other-vfx-depth-browser.mjs OUTPUT.json');
const screenshotDir=process.env.WG_QA_SCREENSHOT_DIR;
if(screenshotDir)await mkdir(screenshotDir,{recursive:true});
const ids=(process.env.WG_QA_VFX_IDS??'shield,rhino,water,dust,stone').split(',');
const browser=await chromium.launch({channel:process.env.WG_QA_BROWSER??'chrome',
  headless:process.env.WG_QA_HEADLESS!=='0'});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
const report={kind:'other-vfx-depth-comparison',ids,errors,complete:false,results:[]};
try{
  await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',
    JSON.stringify({quality:'media',farVegetation:false,sfx:0,music:0})));
  await page.goto(`${base}/?qa-spatial-seed=712&qa-crop-spell-frame&qa-loading-gpu-gameplay`);
  await page.waitForSelector('#native-menu',{timeout:30000});
  const menu=page.frames().find(frame=>frame.url().includes('/menu/'));
  if(!menu)throw Error('Native menu iframe was not ready');
  await menu.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',
    action:'start',biome:'sabana',culture:'mapungubwe'},location.origin));
  await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')||
    document.querySelector('.loading-failure'),null,{timeout:120000});
  const ready=await page.evaluate(()=>{
    const qa=globalThis.wildGuardiansSpatialQa?.(),gl=qa?.world?.renderer.getContext();
    const ext=gl?.getExtension('WEBGL_debug_renderer_info');
    return {loaded:!!qa?.world,authority:qa?.fieldShared??false,
      renderer:gl?(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):null,
      gpuTimer:!!gl?.getExtension('EXT_disjoint_timer_query_webgl2')};
  });
  report.ready=ready;
  if(!ready.loaded||!ready.authority||!ready.gpuTimer||errors.length)
    throw Error(`World/GPU fixture unavailable: ${JSON.stringify({ready,errors})}`);
  await page.evaluate(()=>{
    const {state,world}=globalThis.wildGuardiansSpatialQa();
    state.pauses=['qa-vfx-depth'];state.time=100;
    const center=state.villages[0].center,y=world.nav.field.surface(center.x,center.z);
    world.cinematic=true;
    world.controls.target.set(center.x,y+.7,center.z);
    world.camera.position.set(center.x+10,y+8,center.z+13);
    world.camera.lookAt(center.x,y+.7,center.z);
    world.attackVfx.update=()=>{};
    world.attackVfx.prepare=camera=>globalThis.__otherVfxEffect?.prepare(camera,world.scene)??false;
    const capture=world.destructionPass.captureDepth;
    world.destructionPass.captureDepth=function(...args){
      globalThis.__otherVfxDepthCaptures=(globalThis.__otherVfxDepthCaptures??0)+1;
      return capture.apply(this,args);
    };
  });
  const arms=['control','soft','hard','hard','soft','control'];
  for(const id of ids){
    const captured=new Set();
    for(const arm of arms){
      const result=await page.evaluate(async({id,arm})=>{
        const {state,world,gpu}=globalThis.wildGuardiansSpatialQa();
        globalThis.__otherVfxEffect?.dispose();globalThis.__otherVfxEffect=null;
        if(arm!=='control'){
          const options={worldSurface:(x,z)=>world.nav.field.surface(x,z),
            softParticleDepth:arm==='soft',
            ...(id==='shield'?{shieldMode:'barrier',shieldDuration:20}:{})};
          const effect=world.vfxLibrary.create(id,world.destructionPass,options);
          const center=state.villages[0].center;
          effect.position.set(center.x,world.nav.field.surface(center.x,center.z),center.z);
          effect.environment=(await import('/src/rendering/vfx-native.js')).vfxEnvironment(0);
          const ages={shield:2,rhino:1.5,water:1.6,dust:.5,stone:.55};
          effect.seek(ages[id]??Math.min(1,effect.native.definition.duration*.5));
          world.scene.add(effect);globalThis.__otherVfxEffect=effect;
        }
        for(let i=0;i<8;i++)await new Promise(resolve=>requestAnimationFrame(resolve));
        gpu.reset();globalThis.__otherVfxDepthCaptures=0;
        const stamps=[],started=performance.now();
        for(let i=0;i<60;i++){
          await new Promise(resolve=>requestAnimationFrame(at=>{stamps.push(at);resolve();}));
          if(performance.now()-started>45000)break;
        }
        gpu.close('arm-ended');
        const probe=JSON.parse(document.querySelector('#loading-gameplay-gpu-qa').textContent);
        const stats=values=>{
          const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
          return sorted.length?{count:sorted.length,median:sorted[Math.floor(sorted.length/2)],
            p95:sorted[Math.floor((sorted.length-1)*.95)]}:null;
        };
        const intervals=stamps.slice(1).map((at,index)=>at-stamps[index]);
        return {id,arm,frames:stamps.length,elapsedMs:performance.now()-started,
          interval:stats(intervals.slice(10)),gpu:stats(probe.gpu.samples.map(s=>s.ms).slice(10)),
          depthCaptures:globalThis.__otherVfxDepthCaptures,
          sprites:globalThis.__otherVfxEffect?.sprites.geometry.instanceCount??0,
          nativeVfxInstances:world.vfxLibrary.instances.size};
      },{id,arm});
      report.results.push(result);
      if(screenshotDir&&arm!=='control'&&!captured.has(arm)){
        const canvas=await page.evaluateHandle(()=>globalThis.wildGuardiansSpatialQa().world.renderer.domElement);
        const path=`${screenshotDir}/${id}-${arm}.png`;
        await canvas.asElement().screenshot({path});
        await canvas.dispose();
        result.screenshot=path;
        captured.add(arm);
      }
      await writeFile(output,JSON.stringify(report,null,2)+'\n');
      console.error(`${id} ${arm}: GPU ${result.gpu?.median??'unavailable'} ms, depth ${result.depthCaptures}`);
    }
  }
  report.complete=true;
  if(errors.length)throw Error(`Browser errors: ${errors.join('; ')}`);
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
