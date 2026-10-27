import {regionalTailProbe} from './regional-tail-probe-source.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {Matrix4,Vector3} from 'three';
const species=process.argv[2]??'rhino',out=process.env.WG_BEAST_QA_OUT??'docs/qa/mangrove-magic-20261026/shield-repeat-render',base=process.env.WG_QA_URL??'http://127.0.0.1:5217';
const viewport={width:Number(process.env.WG_QA_WIDTH??1280),height:Number(process.env.WG_QA_HEIGHT??720)};
await mkdir(out,{recursive:true});
const fixtureId=process.env.WG_BEAST_FIXTURE_ID??species;
const fixture=JSON.parse(await readFile(process.env.WG_MAGIC_FIXTURE??'docs/qa/mangrove-magic-20261026/agriculture/fixture.json','utf8'));
if(process.env.WG_WATER_CANDIDATE==='1')assert.equal(JSON.parse(fixture.snapshot).biome,'manglares','Regional-water candidate requires a Manglares fixture');
const recordVideo=process.env.WG_MAGIC_VIDEO!=='0',cpuSampling=process.env.WG_MAGIC_CPU_SAMPLING!=='0';
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport,...(recordVideo?{recordVideo:{dir:out+'/raw',size:viewport}}:{})}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));let report={species,fixtureId,group:fixture.group??[species],viewport,scope:"Repeated legal shield commands in agricultural fixture; real cooldown and simulation, no UI targeting or raid"};
report.consoleErrors=[];report.failedRequests=[];
page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
context.on('requestfailed',r=>report.failedRequests.push({url:r.url(),failure:r.failure()}));
report.instrumentation={recordVideo,cpuSampling,gpuQueries:process.env.WG_MAGIC_GPU==='1'};
let profiler;
const inspect=async()=>page.evaluate(()=>{const q=wildGuardiansVisibilityQa();return {...q,state:q.snapshot?JSON.parse(q.snapshot):null,snapshot:undefined};});
try {
 if(process.env.WG_REGIONAL_TAIL_PROBE==='1'){
  await context.addInitScript(()=>{
   globalThis.qaTailRows=[];globalThis.qaTailDropped=0;
   globalThis.qaTailSpan=span=>{if(qaTailRows.length<20000)qaTailRows.push(span);else qaTailDropped++;};
   globalThis.qaTailMeasure=(label,run)=>{const start=performance.now();try{return run();}finally{const duration=performance.now()-start;if(duration>=1||label.startsWith('worker-'))qaTailSpan({label,start,duration,scope:'Synchronous call wall time; nested spans overlap.'});}};
  });
  await context.route(/\/(?:tools\/experiments\/(?:far-scene-loader|native-far-layer)|src\/app\/global-frame-scheduler)\.js(?:\?.*)?$/,async route=>{
   const response=await route.fetch(),path=new URL(route.request().url()).pathname.slice(1),name=path.split('/').at(-1);
   await route.fulfill({response,body:regionalTailProbe(await readFile(path,'utf8'),name)});
  });
 }
 if(process.env.WG_SMOOTH_SORT_SOURCE){
  report.smoothSortSource=process.env.WG_SMOOTH_SORT_SOURCE;
  await context.route(/\/src\/rendering\/smooth-far-transitions\.js(?:\?.*)?$/,async route=>{
   const response=await route.fetch(),transformed=await response.text();
   let body=await readFile(process.env.WG_SMOOTH_SORT_SOURCE,'utf8');
   const threeImport=transformed.match(/import \* as THREE from [^;]+;/)?.[0];assert(threeImport);
   body=body.replace(/import \* as THREE from [^;]+;/,threeImport).replace('../../src/rendering/clone-runtime-material.js','/src/rendering/clone-runtime-material.js');
   await route.fulfill({response,body});
  });
 }
 if(process.env.WG_FAR_TRANSITION_SOURCE){
  report.farTransitionOverride={file:process.env.WG_FAR_TRANSITION_SOURCE,loads:0};
  await context.route(/\/tools\/experiments\/far-tree-transitions\.js(?:\?.*)?$/,async route=>{
   const response=await route.fetch();report.farTransitionOverride.loads++;
   await route.fulfill({response,body:await readFile(process.env.WG_FAR_TRANSITION_SOURCE,'utf8')});
  });
 }
 if(process.env.WG_SHADOW_SOURCE_DIR)await context.route(/\/src\/rendering\/(shadow-cache|native-shadow)\.js(?:\?.*)?$/,async route=>{
  const response=await route.fetch(),name=new URL(route.request().url()).pathname.split('/').at(-1);
  const transformed=await response.text();let body=await readFile(process.env.WG_SHADOW_SOURCE_DIR+'/'+name,'utf8');
  const threeImport=transformed.match(/import \* as THREE from [^;]+;/)?.[0];
  assert(threeImport,'Missing Vite Three import');body=body.replace(/import \* as THREE from [^;]+;/,threeImport);
  await route.fulfill({response,body});
 });
 if(process.env.WG_SPATIAL_RUNTIME_DIR){
  report.runtimeOverride={directory:process.env.WG_SPATIAL_RUNTIME_DIR,loads:{}};
  await context.route(/\/wild-engine\/spatial-threaded\.(mjs|wasm)(?:\?.*)?$/,async route=>{
   const name=new URL(route.request().url()).pathname.split('/').at(-1);
   report.runtimeOverride.loads[name]=(report.runtimeOverride.loads[name]??0)+1;
   const response=await route.fetch();await route.fulfill({response,contentType:name.endsWith('.wasm')?'application/wasm':'application/javascript',body:await readFile(process.env.WG_SPATIAL_RUNTIME_DIR+'/'+name)});
  });
 }
 if(process.env.WG_WATER_CANDIDATE==='1')await page.route('**/src/rendering/far-vegetation-profile.js*',async route=>{const response=await route.fetch(),source=await response.text();if(!source.includes('groundColorStep:4'))throw Error('Missing water sample profile');await route.fulfill({response,body:source.replace('groundColorStep:4','groundColorStep:2')});});

 if(process.env.WG_MAGIC_FAR_PHASES==='1')await page.route('**/tools/experiments/attach-native-far-world.js*',async route=>{
  const response=await route.fetch();let source=await response.text();
  for(const [call,label] of [['schedulePreparation();','schedule-preparation'],['scheduleLogicalPreload(currentSignature);','schedule-logical-preload']]){
   assert.equal(source.split(call).length,2,'Expected unique diagnostic call '+call);
   source=source.replace(call,`(globalThis.qaFarCpuSpan?globalThis.qaFarCpuSpan('${label}',()=>${call.slice(0,-1)}):${call.slice(0,-1)});`);
  }
  await route.fulfill({response,body:source});
 });
 if(process.env.WG_MAGIC_PROFILE==='1')await page.route('**/src/rendering/scene.js*',async route=>{
  const response=await route.fetch();let source=(await response.text()).replace('this.raycaster=new','globalThis.qaMagicWorld=this;this.raycaster=new');
  if(process.env.WG_CHUNK_WATER_BED==='1'){
   const anchor='if(waterMaterial!==this.fluidMaterial)prepareNaturalWater(this,waterGeometry,cx,cz,waterMaterial,payload?.waterBed);';assert(source.includes(anchor));
   source="import {prepareChunkWaterBed} from '/tools/experiments/chunk-water-bed-candidate.js';\n"+source.replace(anchor,"if(waterMaterial!==this.fluidMaterial){let bed=payload?.waterBed;if(asynchronous&&!bed){yield 'water-bed';bed=yield* prepareChunkWaterBed(this,waterGeometry,cx,cz);yield 'water-edges';}prepareNaturalWater(this,waterGeometry,cx,cz,waterMaterial,bed);}");
  }
  await route.fulfill({response,body:source});
 });
 if(process.env.WG_MAGIC_PROFILE==='1')await page.addInitScript(()=>{
  const sources=new WeakMap(),attached=new WeakMap();globalThis.qaMagicPrograms=[];globalThis.qaMagicProgramHistory=[];
  const p=WebGL2RenderingContext.prototype,source=p.shaderSource,attach=p.attachShader,info=p.getProgramInfoLog;
  p.shaderSource=function(shader,text){sources.set(shader,text);return source.call(this,shader,text);};
  p.attachShader=function(program,shader){const list=attached.get(program)??[];list.push(shader);attached.set(program,list);return attach.call(this,program,shader);};
  p.getProgramInfoLog=function(program){const start=performance.now();try{return info.call(this,program);}finally{const sample={draw:globalThis.qaMagicDraw,start,ms:performance.now()-start,shaders:(attached.get(program)??[]).map(s=>sources.get(s))};qaMagicProgramHistory.push({...sample,interactive:!!globalThis.qaMagicRecording});if(globalThis.qaMagicRecording)qaMagicPrograms.push(sample);}};
 });
 await page.addInitScript(f=>{localStorage.setItem('wild-guardians:slot:'+f.slotId,f.snapshot);localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',music:0,sfx:0}));},fixture);
 await page.goto(base+'/?qa-visibility'+(process.env.WG_WATER_CANDIDATE==='1'?'&farWaterSurface=1&farAngularLod=1':'')+(['0','1'].includes(process.env.WG_STABLE_LIGHTS)?'&vfxStableLights='+process.env.WG_STABLE_LIGHTS:''),{timeout:90000});const menu=page.frameLocator('#native-menu');
 await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});await menu.getByRole('button',{name:'Continuar',exact:true}).click();await menu.locator('[data-production-save="'+fixture.slotId+'"]').click();
 await page.waitForFunction(()=>document.querySelector('#stage')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
 await page.waitForTimeout(2200);report.before=await inspect();report.biome=report.before.state?.biome;assert.equal(report.biome,JSON.parse(fixture.snapshot).biome);if(process.env.WG_EXPECT_BIOME)assert.equal(report.biome,process.env.WG_EXPECT_BIOME);if(process.env.WG_MAGIC_PROFILE==='1')report.runtimeProfile=await page.evaluate(()=>({visualSearch:qaMagicWorld.visualSearch,streamingOptions:qaMagicWorld.streamingOptions,regionalWater:qaMagicWorld.scene.getObjectsByProperty('isMesh',true).filter(m=>m.userData.regionalWaterSurface).length}));
 if(await page.locator('.tutorial-close:visible').count())await page.locator('.tutorial-close:visible').first().click();
 if(['0','1'].includes(process.env.WG_MAGIC_SHADOW_CACHE)){
  report.shadowCacheEnabled=process.env.WG_MAGIC_SHADOW_CACHE==='1';
  await page.evaluate(enabled=>{qaMagicWorld.releaseNativeShadow.cache.enabled=enabled;},report.shadowCacheEnabled);
 }
 if(process.env.WG_MAGIC_PROFILE==='1')report.shadowCacheBefore=await page.evaluate(()=>({...qaMagicWorld.releaseNativeShadow?.cache?.stats}));
 if(process.env.WG_MAGIC_PROFILE==='1'){
  profiler=await context.newCDPSession(page);if(cpuSampling){await profiler.send('Profiler.enable');await profiler.send('Profiler.start');}
  await page.evaluate(()=>{const renderer=qaMagicWorld.renderer,draw=renderer.renderBufferDirect;renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){globalThis.qaMagicDraw={object:object.name,parents:[object.parent?.name,object.parent?.parent?.name],type:object.type,material:material.type,source:object.material?.name,side:material.side};try{return draw.call(this,camera,scene,geometry,material,object,group);}finally{globalThis.qaMagicDraw=null;}};globalThis.qaMagicFrames=[];globalThis.qaMagicLongTasks=[];let last=null;globalThis.qaMagicRecording=true;const frame=t=>{if(!qaMagicRecording)return;if(last!==null)qaMagicFrames.push({t,ms:t-last});last=t;requestAnimationFrame(frame);};requestAnimationFrame(frame);new PerformanceObserver(list=>{for(const e of list.getEntries())qaMagicLongTasks.push({start:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:false});});
 }
 if(process.env.WG_MAGIC_GPU==='1')await page.evaluate(async ({capturePhases,allSpans})=>{
  const {LoadingGpuQa}=await import('/src/app/loading-gpu-qa.js');
  const w=qaMagicWorld,original=w.render,gpu=new LoadingGpuQa(w.renderer),cpu=[],phases=[],previousWitness=w.onLoadingSpan;
  let droppedPhases=0,renderActive=false;const restorers=[];
  const witness=span=>{previousWitness?.(span);if(!allSpans&&!span.label.startsWith('world-frame-'))return;if(phases.length<80000)phases.push({frame:gpu.index-1,label:span.label,at:span.start,ms:span.duration,failed:span.failed,scope:span.scope});else droppedPhases++;};
  if(capturePhases){
   w.onLoadingSpan=witness;
   for(const [owner,key,label] of [[w,'syncChunks','syncChunks'],[w,'removeInstalledChunk','removeChunk'],[w.horizon,'update','horizon'],[w.contacts,'update','contacts'],[w.chunkStream,'plan','streamPlan'],[w.chunkStream,'dispatch','streamDispatch'],[w.chunkStream,'releaseChunks','spatialRelease'],[w.nav,'setActiveBounds','navBounds'],[w.nav,'setRaidView','raidView']]){
    if(typeof owner?.[key]!=='function')continue;
    const prior=owner[key],timed=function(...args){if(!renderActive)return prior.apply(this,args);const at=performance.now();try{return prior.apply(this,args);}finally{const ms=performance.now()-at;if(ms>=1){if(phases.length<80000)phases.push({frame:gpu.index-1,label:'subsystem:'+label,at,ms});else droppedPhases++;}}};
    owner[key]=timed;restorers.push(()=>{if(owner[key]===timed)owner[key]=prior;});
   }
  }
  if(capturePhases&&w.spatialSession?.core){
   const core=w.spatialSession.core;
   for(const key of ['removeChunks','removeChunk']){
    const prior=core[key];if(typeof prior!=='function')continue;
    const timed=function(...args){const selected=core.currentChunk(),coordinates=key==='removeChunks'?args[0]:[args],selectedRequested=!!selected&&coordinates.some(([x,z])=>x===selected.cx&&z===selected.cz),at=performance.now();let removed;try{return removed=prior.apply(this,args);}finally{if(phases.length<80000)phases.push({frame:renderActive?gpu.index-1:null,label:'native:'+key,at,ms:performance.now()-at,selectedRequested,requested:coordinates.length,removed,selectedBefore:selected,selectedAfter:core.currentChunk()});else droppedPhases++;}};
    core[key]=timed;restorers.push(()=>{if(core[key]===timed)core[key]=prior;});
   }
  }
  const gl=w.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  globalThis.qaResidualHardware={renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),hardwareConcurrency:navigator.hardwareConcurrency,devicePixelRatio,canvas:[gl.drawingBufferWidth,gl.drawingBufferHeight],crossOriginIsolated};
  const wrapped=function(...args){const at=performance.now();renderActive=true;try{return gpu.measure('world-render',()=>original.apply(this,args));}finally{renderActive=false;cpu.push({frame:gpu.index-1,at,ms:performance.now()-at});}};
  w.render=wrapped;
  globalThis.qaResidualFinish=()=>{for(const restore of restorers)restore();if(w.render===wrapped)w.render=original;if(w.onLoadingSpan===witness)w.onLoadingSpan=previousWitness;return {gpu:gpu.close(),cpu,phases,droppedPhases,hardware:qaResidualHardware,cpuScope:'World.render synchronous wall time including timer polling and submission; excludes simulation/UI and asynchronous preparation outside this call.'};};
 },{capturePhases:process.env.WG_MAGIC_PHASES==='1',allSpans:process.env.WG_MAGIC_ALL_SPANS==='1'});
 if(process.env.WG_WHOLE_FRAME==='1')await page.evaluate(async()=>{const {installWholeFrameAttribution}=await import('/tools/experiments/qa-whole-frame-attribution.js');globalThis.qaWholeFrameFinish=await installWholeFrameAttribution();});
 if(process.env.WG_MAGIC_FAR_PHASES==='1')await page.evaluate(async()=>{const {installFarCpuProbe}=await import('/tools/experiments/qa-far-cpu-probe.js');globalThis.qaFarCpuFinish=await installFarCpuProbe(qaMagicWorld);});
 await page.evaluate(async()=>{globalThis.qaGame=await import('/src/simulation/game.js');});
 if(process.env.WG_DEPTH_MATRIX_REUSE==='1')await page.evaluate(async()=>{const {installDepthSceneMatrixReuse}=await import('/tools/experiments/reuse-depth-scene-matrices.js');globalThis.qaMatrixReuseFinish=installDepthSceneMatrixReuse(qaMagicWorld);});
 await page.evaluate(()=>{const w=qaMagicWorld,p=w.state.plants[1],y=w.nav.field.surface(p.x,p.z);w.cinematic=true;w.controls.target.set(p.x,y,p.z);w.camera.position.set(p.x+5,y+7,p.z+10);w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);});
 await page.waitForTimeout(1000);
 if(process.env.WG_MAGIC_WARMUP_ELAPSED){
  const target=Number(process.env.WG_MAGIC_WARMUP_ELAPSED);assert(Number.isFinite(target)&&target>0);
  report.warmup={target,before:await page.evaluate(()=>({elapsed:qaMagicWorld.state.elapsed,at:performance.now()}))};
  await page.waitForFunction(target=>qaMagicWorld.state.elapsed>=target,target,{timeout:120000});
  report.warmup.after=await page.evaluate(()=>({elapsed:qaMagicWorld.state.elapsed,at:performance.now()}));
 }
 if(process.env.WG_MAGIC_SETTLE==='1')report.readiness=await page.evaluate(async()=>{
  const w=qaMagicWorld,start=performance.now(),deadline=start+60000;let stable=0,last='',snapshot;
  while(stable<60){
   await new Promise(requestAnimationFrame);
   const stream=w.chunkStream.summary(),keys=[...w.chunks.keys()].sort(),signature=keys.join('|');
   const pending=stream.busy||stream.queued||stream.preparing||w.horizon?.generator.latest||w.horizon?.generator.busy||w.horizon?.pendingPreparation||w.farVegetation?.adapters.some(a=>a.preparationPending());
   snapshot={keys,stream,pending:!!pending,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),elapsed:w.state.elapsed,quality:w.quality};
   if(stream.failed)throw Error('Preflight streaming failed '+JSON.stringify(snapshot));
   stable=!pending&&signature===last?stable+1:0;last=signature;
   if(performance.now()>deadline)throw Error('Preflight scene did not settle '+JSON.stringify({stable,snapshot}));
  }
  return {start,end:performance.now(),stableFrames:stable,...snapshot,scope:'Stable residency/empty preparation queues, not identical dynamic simulation state. Preflight time excluded from measurement windows.'};
 });
 report.casts=[];
 for(let i=0;i<Number(process.env.WG_MAGIC_CASTS??3);i++){
  await page.waitForFunction(()=>qaMagicWorld.state.cooldowns.shield<=0&&!qaMagicWorld.state.spells.some(s=>s.kind==='shield'),null,{timeout:240000});
  // The no-cast control has no cooldown: preserve the same simulation interval.
  if(i>0&&process.env.WG_MAGIC_NO_CAST==='1')await page.waitForFunction(({elapsed,interval})=>qaMagicWorld.state.elapsed>=elapsed+interval,{elapsed:report.casts[i-1].simulationStart,interval:Number(process.env.WG_MAGIC_CONTROL_INTERVAL??90)},{timeout:240000});
  const simulationStart=await page.evaluate(()=>qaMagicWorld.state.elapsed);
  if(process.env.WG_MAGIC_STREAM==='1')await page.evaluate(({distance,duration})=>{
   const w=qaMagicWorld,origin=w.controls.target.clone(),offset=w.camera.position.clone().sub(origin),start=performance.now();globalThis.qaStreamSamples=[];
   globalThis.qaStreamTimer=setInterval(()=>{const elapsed=(performance.now()-start)/1000,travel=distance*Math.sin(Math.min(elapsed/duration,1)*Math.PI);w.controls.target.copy(origin);w.controls.target.x+=travel;w.camera.position.copy(w.controls.target).add(offset);w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);qaStreamSamples.push({elapsed,keys:[...w.chunks.keys()]});if(elapsed>=duration){clearInterval(qaStreamTimer);qaStreamTimer=null;}},100);
  },{distance:Number(process.env.WG_MAGIC_STREAM_DISTANCE??96),duration:Number(process.env.WG_MAGIC_STREAM_SECONDS??16)});
  const result=process.env.WG_MAGIC_NO_CAST==='1'?{kind:'control-no-cast',accepted:false,start:await page.evaluate(()=>performance.now()),commandMs:0}:await page.evaluate(i=>{const w=qaMagicWorld,p=w.state.plants[1],start=performance.now(),before={elapsed:w.state.elapsed,cooldown:w.state.cooldowns.shield,spells:w.state.spells.length};const accepted=qaGame.cast(w.state,'qa-repeat-shield-'+i,'shield',p.x,p.z,w.nav);return {kind:'shield',accepted,start,before,commandMs:performance.now()-start};},i);
  result.simulationStart=simulationStart;
  assert(result.accepted||process.env.WG_MAGIC_NO_CAST==='1');report.casts.push(result);await page.waitForTimeout(2200);
  result.after=await page.evaluate(()=>({elapsed:qaMagicWorld.state.elapsed,cooldown:qaMagicWorld.state.cooldowns.shield,spells:qaMagicWorld.state.spells.map(s=>({kind:s.kind,remaining:s.remaining}))}));
  assert(process.env.WG_MAGIC_NO_CAST==='1'||result.after.spells.some(s=>s.kind==='shield'&&s.remaining>0));
  if(process.env.WG_MAGIC_CAPTURE_AFTER_STREAM!=='1')await page.screenshot({path:out+'/shield-'+i+'.png'});
  if(process.env.WG_MAGIC_STREAM==='1'){await page.waitForFunction(()=>qaStreamTimer===null,null,{timeout:60000});result.streaming=await page.evaluate(()=>({samples:qaStreamSamples,spatial:globalThis.wildGuardiansSpatialQa?.()}));assert(new Set(result.streaming.samples.flatMap(s=>s.keys)).size>result.streaming.samples[0].keys.length,'Camera must introduce new chunks');}
  if(process.env.WG_MAGIC_CAPTURE_AFTER_STREAM==='1'){result.captureStart=await page.evaluate(()=>performance.now());await page.screenshot({path:out+'/shield-'+i+'.png'});result.captureEnd=await page.evaluate(()=>performance.now());}
  await writeFile(out+'/progress.json',JSON.stringify(report.casts,null,2));
 }
 report.after=await inspect();
 if(report.runtimeOverride)assert(report.runtimeOverride.loads['spatial-threaded.wasm']>0,'Candidate shared runtime WASM was not loaded');
 if(process.env.WG_CHUNK_WATER_BED==='1'){report.chunkWaterBed=await page.evaluate(()=>globalThis.qaChunkWaterBed??null);assert(report.chunkWaterBed?.calls>0,'Chunk water candidate not exercised');}
 report.ok=true;assert.deepEqual(errors,[]);

}catch(e){report.ok=false;report.failure=String(e);report.last=await inspect().catch(()=>null);await page.screenshot({path:out+'/raid-ui-failure.png'}).catch(()=>{});process.exitCode=1;}
finally{report.regionalTail=await page.evaluate(()=>({rows:globalThis.qaTailRows??[],dropped:globalThis.qaTailDropped??0})).catch(()=>null);report.wholeFrame=await page.evaluate(()=>globalThis.qaWholeFrameFinish?.()??null).catch(()=>null);report.smoothSort=await page.evaluate(()=>globalThis.qaSmoothSortStats??null).catch(()=>null);report.matrixReuse=await page.evaluate(()=>globalThis.qaMatrixReuseFinish?.()??null).catch(()=>null);await page.evaluate(()=>{if(globalThis.qaStreamTimer)clearInterval(qaStreamTimer);}).catch(()=>{});if(profiler){if(cpuSampling){const {profile}=await profiler.send('Profiler.stop');await writeFile(out+'/magic.cpuprofile',JSON.stringify(profile));}report.timing=await page.evaluate(()=>{qaMagicRecording=false;return {frames:qaMagicFrames,longTasks:qaMagicLongTasks};});await writeFile(out+'/program-waits.json',JSON.stringify(await page.evaluate(()=>qaMagicPrograms)));await writeFile(out+'/program-history.json',JSON.stringify(await page.evaluate(()=>qaMagicProgramHistory)));}if(process.env.WG_MAGIC_GPU==='1')report.residual=await page.evaluate(()=>globalThis.qaResidualFinish?.()??null);if(process.env.WG_MAGIC_FAR_PHASES==='1')report.farCpu=await page.evaluate(()=>globalThis.qaFarCpuFinish?.()??null);if(process.env.WG_MAGIC_PROFILE==='1')report.shadowCacheAfter=await page.evaluate(()=>({...globalThis.qaMagicWorld?.releaseNativeShadow?.cache?.stats})).catch(()=>null);report.errors=errors;await writeFile(out+'/raid-ui.json',JSON.stringify(report,null,2));await context.close();if(recordVideo)await page.video().saveAs(out+'/raid-ui.webm');await browser.close();console.log(JSON.stringify({species,ok:report.ok,failure:report.failure}));}
