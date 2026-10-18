import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to a local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const base=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const output=process.argv[2];
const counts=(process.argv[3]??'100,500,1500').split(',').map(Number);
if(!counts.length||counts.some(count=>!Number.isSafeInteger(count)||count<1))
  throw Error('Expected positive comma-separated crop counts');
const spellCount=Number(process.env.WG_QA_SPELL_COUNT??1);
if(!Number.isSafeInteger(spellCount)||spellCount<1||counts.some(count=>spellCount>count))
  throw Error('WG_QA_SPELL_COUNT must be a positive integer no larger than each crop count');
const spellAge=Number(process.env.WG_QA_SPELL_AGE??1);
if(!Number.isFinite(spellAge)||spellAge<0||spellAge>=15)
  throw Error('WG_QA_SPELL_AGE must be between 0 and 15 seconds');
const realCast=process.env.WG_QA_REAL_CAST==='1';
const renderTime=process.env.WG_QA_RENDER_TIME===undefined?null:Number(process.env.WG_QA_RENDER_TIME);
if(renderTime!==null&&(!Number.isFinite(renderTime)||renderTime<0||renderTime>=600))
  throw Error('WG_QA_RENDER_TIME must be in [0, 600)');
const arms=(process.env.WG_QA_ARMS??'control,growth,multiply,control-after').split(',');
if(arms.length!==4||arms[0]!=='control'||arms[3]!=='control-after'||
  !['growth','multiply'].includes(arms[1])||!['growth','multiply'].includes(arms[2])||arms[1]===arms[2])
  throw Error('WG_QA_ARMS must be control,growth,multiply,control-after or control,multiply,growth,control-after');
const gpuEnabled=process.env.WG_QA_GPU!=='0';
const disableAgricultureLights=process.env.WG_QA_DISABLE_AGRICULTURE_LIGHTS==='1';
const forceAgricultureLights=process.env.WG_QA_FORCE_AGRICULTURE_LIGHTS==='1';
if(disableAgricultureLights&&forceAgricultureLights)throw Error('Choose only one agriculture light override');
const forceSoftDepth=process.env.WG_QA_FORCE_SOFT_DEPTH==='1';
const screenshotDir=process.env.WG_QA_SCREENSHOT_DIR;
const screenshotKind=process.env.WG_QA_SCREENSHOT_KIND;
const focusSpell=process.env.WG_QA_FOCUS_SPELL==='1';
if(screenshotDir)await mkdir(screenshotDir,{recursive:true});
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

  await page.evaluate(async({mode,disableAgricultureLights,forceAgricultureLights,forceSoftDepth,realCast})=>{
    const {state,world,gpu}=globalThis.wildGuardiansSpatialQa();
    if(!state||!world)throw Error('Spell frame QA hook unavailable');
    if(mode==='direct')globalThis.__wildSpellFrameManual=true;
    state.time=100;
    if(realCast&&!state.structures.some(structure=>structure.kind==='center'&&structure.status==='intact')){
      const {placeStructure}=await import('/src/simulation/game.js');
      state.pauses=[];
      if(placeStructure(state,'spell-frame-work-center',state.villages[0].center,world.nav)!==true)
        throw Error('Could not legally build the work center for real spell commands');
    }
    state.pauses=['qa-spell-frame'];
    state.spells=[];
    if(forceAgricultureLights)world.agricultureVfx.worldLights=true;
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
    if(forceSoftDepth){
      const update=world.agricultureVfx.update;
      world.agricultureVfx.update=function(...args){
        update.apply(this,args);
        for(const effect of this.effects.values()){
          effect.softParticleDepth=true;
          effect.uniforms.uSoftParticleDepth.value=true;
        }
      };
    }
    wrap(world.agricultureVfx,'prepare','vfxPrepareMs');
    wrap(world.destructionPass,'captureDepth','depthCaptureMs');
    if(disableAgricultureLights){
      const prepare=world.agricultureVfx.prepare;
      world.agricultureVfx.prepare=function(...args){
        const depth=prepare.apply(this,args);
        for(const effect of this.effects.values())for(const light of effect.localLights)light.visible=false;
        return depth;
      };
    }
  },{mode,disableAgricultureLights,forceAgricultureLights,forceSoftDepth,realCast});

  const report={kind:'synthetic-interactive-frame-qa',seed:712,biome:'sabana',
    counts,spellCount,spellAge,realCast,renderTime,arms,gpuEnabled,mode,browserName,disableAgricultureLights,forceAgricultureLights,forceSoftDepth,webglRenderer:ready.webglRenderer,
    note:'Synthetic plants in the real Wild Engine browser renderer. Each agricultural spell targets exactly one living plant. WG_QA_REAL_CAST=1 invokes Game.cast with a temporary QA-only unpause; otherwise it constructs equivalent spell state. RAF, crop synchronization and VFX run while simulation is paused. GPU timings require EXT_disjoint_timer_query_webgl2. Not a legal campaign or an uninstrumented frame-rate benchmark.',
    errors,complete:false,results:[]};
  for(const count of counts){
    await page.evaluate(async({count,mode,focusSpell})=>{
      const {createPlant}=await import('/src/simulation/crops.js');
      const {state,world}=globalThis.wildGuardiansSpatialQa();
      const center=state.villages[0].center;
      state.plants=Array.from({length:count},(_,index)=>createPlant(
        `spell-frame-${count}-${index}`,'mijo',center.x+5+(index%40)*1.5,
        center.z+5+Math.floor(index/40)*1.5,null));
      state.spells=[];
      if(focusSpell){
        const x=state.plants[0].x,z=state.plants[0].z,y=world.agricultureVfx.surface(x,z);
        world.cinematic=true;
        world.controls.target.set(x,y,z);
        world.camera.position.set(x+13,y+11,z+16);
        world.camera.lookAt(x,y,z);
      }
      if(mode==='direct')for(let i=0;i<5;i++)world.render(0);
      else for(let i=0;i<20;i++)await new Promise(resolve=>requestAnimationFrame(resolve));
      if(world.cropBatch.capacity<count)throw Error('Crop batch did not reach fixture capacity');
    },{count,mode,focusSpell});
    for(const kind of arms){
      const result=await page.evaluate(async({count,kind,mode,spellCount,spellAge,realCast,renderTime})=>{
        const {state,world,gpu}=globalThis.wildGuardiansSpatialQa();
        const {spellRadius,cast}=await import('/src/simulation/game.js');
        const columns=Math.min(40,Math.max(Math.ceil(spellCount/Math.ceil(count/40)),Math.ceil(Math.sqrt(spellCount))));
        const targets=Array.from({length:spellCount},(_,index)=>
          state.plants[(index%columns)+Math.floor(index/columns)*40]);
        state.spells=[];
        if(kind!=='control'&&kind!=='control-after'){
          if(realCast){
            const pauses=state.pauses;
            state.pauses=[];
            if(renderTime!==null)state.time=100;
            try{
              for(const [index,target] of targets.entries()){
                try{cast(state,`spell-frame-${count}-${kind}-${index}`,kind,
                  target.x,target.z,world.nav,target.id);}
                catch(error){throw Error(`${error.message}; cast fixture ${JSON.stringify({
                  day:state.day,time:state.time,raid:!!state.raid,result:state.result,
                  pauses:state.pauses,centers:state.structures.filter(s=>s.kind==='center')
                    .map(s=>({status:s.status,kind:s.kind}))})}`);}
              }
            }finally{state.pauses=pauses;}
            for(const spell of state.spells)spell.remaining-=spellAge;
          }else state.spells=targets.map((target,index)=>({
            id:`spell-frame-${count}-${kind}-${index}`,kind,x:target.x,z:target.z,
            targetPlantId:target.id,radius:spellRadius(kind),remaining:(kind==='growth'?30:15)-spellAge
          }));
          if(state.spells.length!==spellCount||state.spells.some((spell,index)=>
            spell.targetPlantId!==targets[index].id||spell.radius!==spellRadius(kind)))
            throw Error('Agricultural spell fixture does not match single-crop targeting');
        }
        const spellFixture={count:state.spells.length,
          first:state.spells[0]?{
            kind:state.spells[0].kind,radius:state.spells[0].radius,
            targetPlantId:state.spells[0].targetPlantId,remaining:state.spells[0].remaining}:null};
        if(renderTime!==null)state.time=renderTime;
        gpu?.reset();
        const capture={renderMs:[],syncMs:[],vfxUpdateMs:[],vfxPrepareMs:[],depthCaptureMs:[]};
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
        return {count,kind,spellFixture,frames:frameAts.length,truncated:frameAts.length<targetFrames,
          elapsedMs:performance.now()-started,
          interval:stats(intervals.slice(10)),firstIntervals:intervals.slice(0,8),
          render:stats(capture.renderMs.slice(10)),sync:stats(capture.syncMs.slice(10)),
          vfxUpdate:stats(capture.vfxUpdateMs.slice(10)),
          vfxPrepare:stats(capture.vfxPrepareMs.slice(10)),
          depthCaptures:capture.depthCaptureMs.length,
          depthCapture:stats(capture.depthCaptureMs),
          gpu:probe?{supported:probe.gpu.supported,reason:probe.gpu.reason,
            elapsed:stats(probe.gpu.samples.map(sample=>sample.ms).slice(10))}:null,
          activeEffects:world.agricultureVfx.effects.size,
          nativeVfxInstances:world.vfxLibrary.instances.size,
          rendererMemory:{...world.renderer.info.memory}};
      },{count,kind,mode,spellCount,spellAge,realCast,renderTime});
      report.results.push(result);
      if(screenshotDir&&(!screenshotKind||screenshotKind===kind))
        await page.screenshot({path:`${screenshotDir}/${count}-${kind}.png`});
      if(output)await writeFile(output,JSON.stringify(report,null,2)+'\n');
      console.error(`Measured ${count} crops / ${kind}: ${result.frames} frames, ${Math.round(result.elapsedMs)} ms`);
    }
  }
  report.complete=true;
  if(output)await writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{await browser.close();}
