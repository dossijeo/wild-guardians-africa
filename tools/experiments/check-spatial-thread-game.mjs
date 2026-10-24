import {instrumentMainFrame} from './main-frame-attribution.js';
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
const threaded=process.env.WG_THREADS!=='0',benchmark=process.env.WG_THREAD_BENCH==='1',frozen=process.env.WG_THREAD_FROZEN==='1';
const biome=process.env.WG_THREAD_BIOME??'manglares';
const quality=process.env.WG_THREAD_QUALITY??'media';
if(!['baja','media','alta'].includes(quality))throw Error('Invalid QA quality');
const fixtures={sabana:'sabana-populated-frozen-20261022',desierto:'desert-populated-closure-20261022','gran-rio':'gran-rio-populated-frozen-20261022',volcanes:'volcanes-populated-frozen-20261022',manglares:'manglares-populated-frozen-20261022','gran-canon':'gran-canon-populated-native-camera-20261022'};
if(!fixtures[biome])throw Error('Unknown biome');
const fixture=JSON.parse(await readFile(process.env.WG_THREAD_FIXTURE_FILE??`docs/qa/global-visual-lab/${fixtures[biome]}/native-fixture.json`,'utf8'));
if(JSON.parse(fixture.timing.navigationContext.state).biome!==biome)throw Error('Fixture biome mismatch');
if(process.env.WG_THREAD_ACTIVE==='1'){const state=JSON.parse(fixture.timing.navigationContext.state);state.tutorial.basicSkipped=true;fixture.timing.navigationContext.state=JSON.stringify(state);}
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],qualityStatuses=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'){errors.push(m.text());console.log(m.text().slice(0,500));}});
try{
 if(process.env.WG_THREAD_NO_ISOLATION==='1')await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.fallback();
  const response=await route.fetch(),headers={...response.headers()};
  delete headers['cross-origin-opener-policy'];delete headers['cross-origin-embedder-policy'];
  await route.fulfill({response,headers});
 });
 if(process.env.WG_THREAD_FAR_TIMES==='1')await page.route('**/tools/experiments/attach-native-far-world.js*',async route=>{
  const response=await route.fetch();let source=await response.text();
  if(process.env.WG_THREAD_FAR_DRAW_TIMES==='1'){source="import {measureFarDraw} from '/tools/experiments/far-draw-attribution.js';\n"+source;const draw='measureDraw:world.onLoadingGpuDraw';if(source.split(draw).length!==4)throw Error('Far draw witness anchors changed');source=source.replaceAll(draw,'measureDraw:submit=>measureFarDraw(world.renderer,slot,submit)');}
  const anchor="const witness=world.onLoadingSpan?span=>world.onLoadingSpan({...span,label:span.label+':slot'+slot}):null;";
  if(source.split(anchor).length!==2)throw Error('Missing far phase witness anchor');
  const replacement="const witness=span=>{const row={...span,label:span.label+':slot'+slot};(globalThis.qaFarPreparationSpans??=[]).push(row);world.onLoadingSpan?.(row);};";
  await route.fulfill({response,body:source.replace(anchor,replacement)});
 });
 if(process.env.WG_THREAD_TEXTURE_TIMES==='1')await page.route('**/src/rendering/loading-textures.js*',async route=>{
  const response=await route.fetch(),source=await response.text(),anchor='renderer.initTexture(texture);';
  if(source.split(anchor).length!==2)throw Error('Texture upload witness anchor changed');
  const body=source.replace(anchor,`{const began=performance.now();renderer.initTexture(texture);const image=texture.image;(globalThis.qaLoadingTextureUploads??=[]).push({ms:performance.now()-began,name:texture.name,width:image?.width,height:image?.height,imageType:image?.constructor?.name,src:image?.currentSrc??image?.src??null,colorSpace:texture.colorSpace,mipmaps:texture.generateMipmaps,flipY:texture.flipY,premultiplyAlpha:texture.premultiplyAlpha});}`);
  await route.fulfill({response,body});
 });
 if(process.env.WG_THREAD_BOOT_FAILURE==='1')await page.route('**/wild-engine/spatial-threaded.mjs',route=>route.fulfill({status:503,contentType:'text/javascript',body:'// QA: unavailable pthread module'}));
 if(process.env.WG_THREAD_LOADING_LONG_FRAMES==='1')await page.addInitScript(()=>{
  globalThis.qaLoadingLongFrames=[];
  if(PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')){
   globalThis.qaLoadingLongFrameObserver=new PerformanceObserver(list=>{for(const entry of list.getEntries())if(globalThis.qaStreamingLoadStart&&entry.startTime>=qaStreamingLoadStart&&(!globalThis.qaStreamingReadyAt||entry.startTime<qaStreamingReadyAt))qaLoadingLongFrames.push(entry.toJSON());});
   qaLoadingLongFrameObserver.observe({type:'long-animation-frame'});
  }
 });
 await page.addInitScript(({text,quality})=>{localStorage.setItem('wild-guardians:slot:opening',text);localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true}));},{text:fixture.timing.navigationContext.state,quality});
 if(frozen||process.env.WG_THREAD_MAIN_PHASES==='1'||process.env.WG_THREAD_LOADING_FRAMES==='1'||process.env.WG_THREAD_QUALITY_EXECUTION==='1')await page.route('**/src/app/main.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  if(frozen){const anchor='world.render(0);world.retainStreamingPrograms();loadingOverlay?.dispose();';if(body.split(anchor).length!==2)throw Error('Missing readiness freeze anchor');body=body.replace(anchor,"globalThis.qaStreamingReadyAt=performance.now();Game.pause(state,'menu');"+anchor);}
  if(process.env.WG_THREAD_MAIN_PHASES==='1'||process.env.WG_THREAD_LOADING_FRAMES==='1'||process.env.WG_THREAD_QUALITY_EXECUTION==='1')body=instrumentMainFrame(body);
  if(process.env.WG_THREAD_EXIT==='1')body+='\nglobalThis.qaReturnToMenu=menu;';
  await route.fulfill({response,body});
 });
 if(process.env.WG_THREAD_TERRAIN_DEFERRED==='1')await page.route('**/src/rendering/prepare-terrain-chunk.js*',async route=>{
  const response=await route.fetch(),source=await response.text(),anchor='deadline:now()';
  if(source.split(anchor).length!==2)throw Error('Missing terrain deadline anchor');
  await route.fulfill({response,body:source.replace(anchor,'deadline:now()+250')});
 });
 if(process.env.WG_THREAD_EXIT==='1')await page.route('**/src/world/wild-engine/spatial-thread-runtime.js*',async route=>{const response=await route.fetch(),source=await response.text(),anchor='return {core,memory,runtime,dispose(){';if(!source.includes(anchor))throw Error('Missing runtime observation anchor');await route.fulfill({response,body:source.replace(anchor,'return globalThis.qaThreadHandle={core,memory,runtime,dispose(){')});});
 await page.route('**/@vite/client',async route=>{const response=await route.fetch();const source=await response.text(),anchor='transport.connect(createHMRHandler(handleMessage));';if(!source.includes(anchor))throw Error('Missing HMR anchor');await route.fulfill({response,body:source.replace(anchor,'// QA: freeze module versions during measurement.')});});
 await page.route('**/src/rendering/scene.js*',async route=>{const r=await route.fetch();let s=await r.text();if(process.env.WG_THREAD_RECOVERY_GLOBAL_ADMISSION==='1'){const anchor='const options={signal:owner.signal,cancelled,screen:true,';if(s.split(anchor).length!==2)throw Error('Recovery admission anchor changed');s=s.replace(anchor,'const options={scheduler:this.frameScheduler,signal:owner.signal,cancelled,screen:true,');}if(process.env.WG_THREAD_LOADING_DRAW_TIMES==='1'){const anchor='drawRenderFrame() {';if(s.split(anchor).length!==2)throw Error('Loading draw anchor changed');s="import {measureFarDraw} from '/tools/experiments/far-draw-attribution.js';\n"+s.replace(anchor,"drawRenderFrame() {return this.loadingProgress&&!this.loadingProgress.ready?measureFarDraw(this.renderer,'world-loading',()=>this.qaOriginalDrawRenderFrame()):this.qaOriginalDrawRenderFrame();} qaOriginalDrawRenderFrame() {");}if(process.env.WG_THREAD_DETAIL==='1')for(const name of ['prepareMangroveBank','prepareNaturalWater','prepareNaturalAssetWater','prepareOpaqueCore','nativeTerrainBuffer']){const pattern=new RegExp('(import\\s*\\{[^}]*?)\\b'+name+'\\b');if(!pattern.test(s))throw Error('Missing import '+name);s=s.replace(pattern,'$1'+name+' as qaOriginal_'+name);s+='\nfunction '+name+'(...args){const t=performance.now();try{return qaOriginal_'+name+'(...args);}finally{globalThis.qaThreadDetail?.('+JSON.stringify(name)+',performance.now()-t);}}\n';}if(process.env.WG_THREAD_LOADING_TIMES==='1'){const phase='const phase=(label,run)=>loadingAwaitWitness(this.onLoadingSpan,label,run);';if(s.split(phase).length!==3)throw Error('Loading phase anchors changed');s=s.replaceAll(phase,'const phase=async(label,run)=>{const t=performance.now();try{return await loadingAwaitWitness(this.onLoadingSpan,label,run);}finally{(globalThis.qaLoadingPhases??=[]).push({label,ms:performance.now()-t});}};');}if(process.env.WG_THREAD_RECOVERY_SUSPEND_FRAME==='1'){const wait='await waitGpuFrame({check,signal:owner.signal});';if(!s.includes(wait))throw Error('Missing recovery frame anchor');s=s.replace(wait,'await waitGpuFrame({check,signal:owner.signal,nextFrame:()=>new Promise(()=>{})});');}if(!s.includes('this.raycaster=new'))throw Error('Missing world observation anchor');await route.fulfill({response:r,body:s.replace('this.raycaster=new','globalThis.qaThreadWorld=this;this.raycaster=new')});});
 const gameUrl=new URL(`http://127.0.0.1:${process.env.WG_THREAD_PORT??5192}/?`+globalClosureQuery(biome)+'&mangroveFerns=holly&groundCache=fixed512&wildEngineThreads='+(threaded?'1':'0')+'&chunkInstall='+(process.env.WG_CHUNK_INSTALL??'sync')+'&horizonBedBudget='+(process.env.WG_HORIZON_BED_BUDGET??'2')+'&horizonBed='+(process.env.WG_HORIZON_BED??'sync')+'&chunkEviction='+(process.env.WG_CHUNK_EVICTION??'single')+'&ownedFarGpu='+(process.env.WG_THREAD_OWNED_FAR??'1')+'&streamingRecovery='+(process.env.WG_THREAD_RECOVERY??'auto')+'&waterShoreWorker='+(process.env.WG_THREAD_WATER_SHORE_WORKER??'0')+'&waterBedWorker='+(process.env.WG_THREAD_WATER_BED_WORKER??'auto')+'&waterBedDirect='+(process.env.WG_THREAD_WATER_BED_DIRECT??'0')+'&warmObstruction='+(process.env.WG_THREAD_WARM_OBSTRUCTION??'0')+'&retainPrograms='+(process.env.WG_THREAD_RETAIN_APP??'0'));
 if(['0','1'].includes(process.env.WG_THREAD_GROUND_CACHE_PREPARATION))gameUrl.searchParams.set('groundCachePreparation',process.env.WG_THREAD_GROUND_CACHE_PREPARATION);
 if(process.env.WG_THREAD_FAR_VALIDATED_BINDINGS==='1')gameUrl.searchParams.set('farValidatedBindings','1');
 if(process.env.WG_FRAME_SCHEDULER_DIAGNOSTICS==='1')gameUrl.searchParams.set('frameSchedulerDiagnostics','1');
 if(process.env.WG_THREAD_CROP_DEPTH_SHADOW_WARM==='1')gameUrl.searchParams.set('cropDepthShadowWarm','1');
 if(process.env.WG_THREAD_QUALITY_COMPILE_CONCURRENCY)gameUrl.searchParams.set('qualityCompileConcurrency',process.env.WG_THREAD_QUALITY_COMPILE_CONCURRENCY);
 if(process.env.WG_THREAD_ACTIVE==='1')gameUrl.searchParams.set('qualityRequireActive','1');
 if(['0','1'].includes(process.env.WG_THREAD_STABLE_SHADOW_PROGRAMS))gameUrl.searchParams.set('stableShadowPrograms',process.env.WG_THREAD_STABLE_SHADOW_PROGRAMS);
 if(process.env.WG_THREAD_QUALITY_MENU_PROTOCOL==='1')gameUrl.searchParams.set('qualityMenuProtocol','1');
 if(['0','1'].includes(process.env.WG_THREAD_CROP_DEPTH_PREPARATION))gameUrl.searchParams.set('cropDepthPreparation',process.env.WG_THREAD_CROP_DEPTH_PREPARATION);
 if(process.env.WG_THREAD_CROP_DEPTH_WARM==='1')gameUrl.searchParams.set('cropDepthWarm','1');
 if(process.env.WG_THREAD_ESTIMATE_OUTLIER==='1')gameUrl.searchParams.set('estimateOutlier','1');
 if(process.env.WG_THREAD_QUALITY_PHASES==='1')gameUrl.searchParams.set('qualityPhases','1');
 if(process.env.WG_THREAD_QUALITY_STAGED==='1')gameUrl.searchParams.set('qualityStaged','1');
 if(process.env.WG_THREAD_LIVE_PREPARATION==='1')gameUrl.searchParams.set('qualityLivePreparation','1');
 if(process.env.WG_FRAME_SCHEDULER==='1')gameUrl.searchParams.set('frameScheduler','1');
 if(process.env.WG_MUD_EDGE_WORKER==='1')gameUrl.searchParams.set('mudEdgeWorker','1');
 if(process.env.WG_TRANSACTIONAL_PROGRAMS==='1')gameUrl.searchParams.set('transactionalPrograms','1');
 if(process.env.WG_THREAD_DEFAULT_STREAMING==='1')for(const key of ['waterBedWorker','waterShoreWorker','chunkEviction','warmObstruction','retainPrograms'])gameUrl.searchParams.delete(key);
 if(process.env.WG_THREAD_EXIT_PREWARM)gameUrl.searchParams.set('exitPrewarm',process.env.WG_THREAD_EXIT_PREWARM);
 if(process.env.WG_THREAD_CONTEXT_PREWARM==='1')gameUrl.searchParams.set('contextPrewarm','1');
 if(process.env.WG_THREAD_QUALITY_PIN_PROGRAMS==='1')gameUrl.searchParams.set('qualityPinPrograms','1');
 if(process.env.WG_THREAD_QUALITY_SERIAL_RECOVERY==='1')gameUrl.searchParams.set('qualitySerialRecovery','1');
 if(process.env.WG_THREAD_QUALITY_STRICT_GL==='1')gameUrl.searchParams.set('qualityStrictGl','1');
 if(process.env.WG_THREAD_SEAM_OWNED==='1')gameUrl.searchParams.set('seamOwned','1');
 if(process.env.WG_THREAD_QUALITY_ACTIVE==='1')gameUrl.searchParams.set('qualityActive','1');
 if(process.env.WG_THREAD_QUALITY_ATTRIBUTION==='1')gameUrl.searchParams.set('qualityAttribution','1');
 if(process.env.WG_THREAD_QUALITY_PREWARM==='1')gameUrl.searchParams.set('qualityPrewarm','1');
 await page.goto(gameUrl.href);
 await page.waitForSelector('#native-menu',{timeout:60000});
 const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load',{timeout:60000});await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'),null,{timeout:60000});
 const loadingProfiler=process.env.WG_THREAD_LOADING_CPU_PROFILE==='1'?await page.context().newCDPSession(page):null;
 if(loadingProfiler){await loadingProfiler.send('Profiler.enable');await loadingProfiler.send('Profiler.start');}
 await page.evaluate(collect=>{globalThis.qaStreamingLoadStart=performance.now();if(collect){globalThis.qaLoadingFrames=[];globalThis.qaMainFrame=row=>{if(!globalThis.qaStreamingReadyAt&&qaLoadingFrames.length<10000)qaLoadingFrames.push(row);};}},process.env.WG_THREAD_LOADING_FRAMES==='1');
 await frame.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin));
 for(let attempt=0;attempt<18;attempt++){
  const diagnostic=await page.evaluate(()=>({text:document.body.innerText.slice(-1200),stage:document.querySelector('#stage')?.getAttribute('aria-busy'),runtime:globalThis.qaThreadWorld?.spatialSession?.runtime,chunks:globalThis.qaThreadWorld?.chunks?.size,stream:globalThis.qaThreadWorld?.chunkStream?.summary(),isolated:crossOriginIsolated}));
  console.log(JSON.stringify(diagnostic));
  await writeFile('docs/qa/wild-engine-pthreads/thread-game-loading.json',JSON.stringify({attempt,diagnostic,errors},null,2)+'\n');
  if(diagnostic.runtime&&diagnostic.chunks>=9&&diagnostic.stage==='false')break;
  if(attempt===17)throw Error('Game readiness deadline exceeded; see thread-game-loading.json');
  await page.waitForTimeout(10000);
 }
 const result=await page.evaluate(async()=>{const w=qaThreadWorld;await w.whenChunksReady();return {farDraws:globalThis.qaFarDraws??null,farPreparationSpans:globalThis.qaFarPreparationSpans??null,cropDepthPreparation:w.cropDepthPreparation??null,loading:{textureUploads:globalThis.qaLoadingTextureUploads??null,longFrames:globalThis.qaLoadingLongFrames??null,frames:globalThis.qaLoadingFrames??null,readyMs:globalThis.qaStreamingReadyAt-globalThis.qaStreamingLoadStart,phases:globalThis.qaLoadingPhases??[]},actorPreparation:w.loadingActorQueue?{...w.loadingActorQueue.stats,pending:w.loadingActorQueue.jobs.length,global:!!w.loadingActorQueue.scheduler}:null,streamingOptions:w.streamingOptions,isolated:crossOriginIsolated,runtime:w.spatialSession.runtime,programRetention:w.programLease?.stats??null,stream:w.chunkStream.summary(),native:w.spatialSession.core.metrics(),chunks:w.chunks.size,stage:document.querySelector('#stage')?.getAttribute('aria-busy'),elapsed:w.state.elapsed,renderer:w.renderer.getContext().getParameter(w.renderer.getContext().RENDERER)};});
 if(loadingProfiler){const {profile}=await loadingProfiler.send('Profiler.stop');await writeFile((process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json').replace(/\.json$/,'.cpuprofile'),JSON.stringify(profile));await loadingProfiler.detach();}
 if(process.env.WG_THREAD_LOADING_CAPTURE==='1')await page.screenshot({path:process.env.WG_THREAD_REPORT.replace(/\.json$/,'.png')});
 if(process.env.WG_THREAD_NO_ISOLATION==='1'&&(result.isolated||result.runtime.fallbackReason!=='SharedArrayBuffer isolation unavailable'))throw Error('Missing real non-isolated fallback');
 if(process.env.WG_THREAD_BOOT_FAILURE==='1'&&(!result.isolated||!result.runtime.fallbackReason))throw Error('Missing isolated boot-failure fallback');
 if(result.runtime.backend!==((threaded&&process.env.WG_THREAD_NO_ISOLATION!=='1'&&process.env.WG_THREAD_BOOT_FAILURE!=='1')?'pthreads':'standalone'))throw Error(JSON.stringify(result));
 if(frozen&&result.elapsed!==JSON.parse(fixture.timing.navigationContext.state).elapsed)throw Error('Fixture advanced before pause');
 if(process.env.WG_THREAD_FAR_CHECK==='1'){
  const inspect=()=>page.evaluate(()=>{const w=qaThreadWorld,ground=[];w.scene.traverse(o=>{if(o.userData.farGround){const p=o.geometry.attributes.position,index=o.geometry.index?.array;let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.count;i++)for(let c=0;c<3;c++){const v=p.array[i*3+c];min[c]=Math.min(min[c],v);max[c]=Math.max(max[c],v);}const ancestors=[];for(let n=o;n;n=n.parent)ancestors.push({type:n.type,visible:n.visible,name:n.name});ground.push({vertices:p.count,indices:index?.length,drawRange:o.geometry.drawRange,min,max,ancestors,side:o.material.side,opacity:o.material.opacity,position:o.position.toArray(),scale:o.scale.toArray(),uniforms:Object.fromEntries(Object.entries(w.renderer.properties.get(o.material).uniforms??{}).filter(([k])=>['uFarNearBounds','uFarGroundOrigin','uWorldOrigin'].includes(k)).map(([k,u])=>[k,u.value.toArray?.()??u.value]))});}});return {origin:{x:w.renderOrigin.x,z:w.renderOrigin.z},stream:w.chunkStream.summary(),nearBounds:w.nearBounds,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),farEnabled:w.farVegetation?.enabled,adapters:w.farVegetation?.adapters.map(a=>({status:a.preparationStatus(),stats:a.stats,key:a.layer.current?.key,trees:a.layer.current?.trees.length})),ground};});
  const path=(process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json').replace(/\.json$/,'');
  result.farGround={initial:await inspect()};await page.screenshot({path:path+'-initial.png'});
  await page.evaluate(async()=>{for(let i=0;i<300;i++)await new Promise(requestAnimationFrame);});
  result.farGround.settled=await inspect();await page.screenshot({path:path+'-settled.png'});
  result.farGround.travel=await page.evaluate(async()=>{const w=qaThreadWorld,eye=w.camera.position.clone(),target=w.controls.target.clone(),update=w.updateCamera;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};try{for(const dx of [240,0]){w.camera.position.copy(eye);w.camera.position.x+=dx;w.controls.target.copy(target);w.controls.target.x+=dx;for(let i=0;i<300;i++)await new Promise(requestAnimationFrame);}return {origin:{x:w.renderOrigin.x,z:w.renderOrigin.z}};}finally{w.updateCamera=update;}});
  result.farGround.afterTravel=await inspect();await page.screenshot({path:path+'-travel.png'});

 }
 if(process.env.WG_THREAD_EDIT==='1')result.concurrentEdits=await page.evaluate(async()=>await (await import('/tools/experiments/spatial-thread-edit-case.js')).verifyConcurrentWallEdit(qaThreadWorld));
 if(fixture.concurrentEditExpectations)result.reloadedEdits=await page.evaluate(expected=>{
  const w=qaThreadWorld,s=w.state,crop=s.plants.find(p=>p.id===expected.crop.id);
  if(!crop||crop.alive===false||crop.x!==expected.crop.x||crop.z!==expected.crop.z)throw Error('Saved crop missing after full app load');
  const wall=s.structures.find(p=>p.id===expected.built.wallId);
  if(wall)throw Error('Removed wall restored after load');
  const barriers=w.spatialSession.core.snapshot().barriers.length;
  if(barriers!==expected.finalBarriers)throw Error('Saved native barriers mismatch');
  return {cropId:crop.id,barriers,wallAbsent:!wall,wallStatus:wall?.status??null,stage:document.querySelector('#stage')?.getAttribute('aria-busy')};
 },fixture.concurrentEditExpectations);
 if(process.env.WG_THREAD_SAVE_FIXTURE){
  const text=await page.evaluate(async()=>{const {serialize}=await import('/src/persistence/snapshots.js');return serialize(qaThreadWorld.state);});
  await writeFile(process.env.WG_THREAD_SAVE_FIXTURE,JSON.stringify({timing:{navigationContext:{state:text}},concurrentEditExpectations:result.concurrentEdits},null,2)+'\n');
  result.savedFixture=process.env.WG_THREAD_SAVE_FIXTURE;
 }
 if(process.env.WG_THREAD_QUALITY_CAPTURE==='1')await page.exposeFunction('qaCaptureQuality',async(index,quality)=>{await page.screenshot({path:(process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json').replace(/\.json$/,`-${index}-${quality}.png`)});});
 if(process.env.WG_THREAD_QUALITY_CYCLE==='1'){
  const qualityProfiler=process.env.WG_THREAD_QUALITY_CPU_PROFILE==='1'?await page.context().newCDPSession(page):null;if(qualityProfiler){await qualityProfiler.send('Profiler.enable');await qualityProfiler.send('Profiler.start');}
  let timer;const monitor=process.env.WG_THREAD_QUALITY_PHASES==='1'?setInterval(()=>{page.evaluate(()=>({phase:globalThis.qaQualityStatus,terrainPhases:globalThis.qaTerrainPhases,scheduler:qaThreadWorld.frameScheduler?.snapshot(),jobs:[...(qaThreadWorld.frameScheduler?.jobs.values()??[])].map(j=>({label:typeof j.label==='function'?j.label():j.label,age:performance.now()-j.created,cost:j.estimate?.()??j.cost,deadline:j.deadline})),pauses:qaThreadWorld.state.pauses,stream:qaThreadWorld.chunkStream.summary(),failure:globalThis.qaQualityFailure})).then(v=>{qualityStatuses.push(v);console.log('QUALITY_STATUS '+JSON.stringify(v));}).catch(()=>{});},10000):null;try{result.qualityCycle=await Promise.race([page.evaluate(async observe=>{const {verifyGameQualityCycle}=await import('/tools/experiments/spatial-thread-game-quality-case.js');return observe?(await import('/tools/experiments/quality-execution-attribution.js')).observeQualityExecution(qaThreadWorld,()=>verifyGameQualityCycle(qaThreadWorld)):verifyGameQualityCycle(qaThreadWorld);},process.env.WG_THREAD_QUALITY_EXECUTION==='1'),new Promise((resolve,reject)=>{timer=setTimeout(()=>{reject(Error('Quality cycle exceeded 120s host watchdog'));browser.close().catch(()=>{});},120000);})]);}finally{clearTimeout(timer);clearInterval(monitor);if(qualityProfiler){const {profile}=await qualityProfiler.send('Profiler.stop');await writeFile((process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json').replace(/\.json$/,'.cpuprofile'),JSON.stringify(profile));await qualityProfiler.detach();}}
 }
 if(process.env.WG_THREAD_EXIT==='1')result.exit=await page.evaluate(async()=>await (await import('/tools/experiments/spatial-thread-game-exit-case.js')).verifyGameExit(qaThreadWorld));
 if(process.env.WG_THREAD_CONTEXT==='1')await page.screenshot({path:(process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json').replace(/\.json$/, '-before.png')});
 if(process.env.WG_THREAD_CONTEXT==='1')result.contextRestore=await page.evaluate(async()=>await (await import('/tools/experiments/spatial-thread-game-context-case.js')).verifyGameContextRestore(qaThreadWorld));
 if(process.env.WG_THREAD_CONTEXT==='1')await page.screenshot({path:(process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json').replace(/\.json$/, '-after-context.png')});
 const profiler=process.env.WG_THREAD_CPU_PROFILE==='1'?await page.context().newCDPSession(page):null;
 if(profiler){await profiler.send('Profiler.enable');await profiler.send('Profiler.start');}
 if(process.env.WG_MUD_EDGE_WORKER_PROBE==='1')result.mudEdgeWorker=await page.evaluate(async()=>await (await import('/tools/experiments/mud-edge-worker-probe.js')).probeMudEdgeWorker(qaThreadWorld));
 if(benchmark)result.streaming=await page.evaluate(async(options)=>{
  const w=qaThreadWorld,core=w.spatialSession.core;
  const gameUrl=performance.getEntriesByType('resource').map(e=>e.name).find(n=>new URL(n).pathname==='/src/simulation/game.js');
  if(!gameUrl)throw Error('Missing canonical simulation module');
  const game=await import(gameUrl);game.pause(w.state,'menu');
  let depthWarmMs=null;if(options.depthWarm){const start=performance.now();await w.destructionPass.prepareDepth(w.camera,w.scene);const {initializeProgramBindingsAsync}=await import('/src/rendering/program-bindings.js');await initializeProgramBindingsAsync(w.renderer);depthWarmMs=performance.now()-start;}
  w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
  // QA-only authored path: the night raid camera otherwise owns this pose.
  if(options.lockRaidCamera&&w.raidCamera)w.raidCamera.update=()=>{};
  const readiness=[],slowDraws=[],slowGl=[],legs=[];let actorsReadyFrames=0,pausedFrames=0;
  const mainPhases=[],mainFrames=[];globalThis.qaMainPhase=row=>mainPhases.push(row);globalThis.qaMainFrame=row=>mainFrames.push(row);
  const detail={};globalThis.qaThreadDetail=(name,ms)=>(detail[name]??=[]).push(ms);
  const preparedShore={count:0,bytes:0};const preparedWater={count:0,bytes:0};
  const rows={slices:[],preparationCpu:[],preparationLatency:[],generate:[],remove:[],removeBatch:[],admit:[],cancel:[],publish:[],install:[],terrain:[],props:[],mud:[],attach:[],details:[],render:[],draw:[],cache:[],nativeCompute:[],frames:[]};
  const terrainPhases={};
  w.onTerrainPreparationSlice=row=>{
   rows.slices.push(row.ms);
   const phase=row.phase??'unscheduled-batch',stats=terrainPhases[phase]??={count:0,cpuMs:0,maxCpuMs:0,waitMs:0,maxWaitMs:0};
   stats.count++;stats.cpuMs+=row.ms;stats.maxCpuMs=Math.max(stats.maxCpuMs,row.ms);
   stats.waitMs+=row.waitMs??0;stats.maxWaitMs=Math.max(stats.maxWaitMs,row.waitMs??0);
  };
  w.onTerrainPreparationDone=row=>{rows.preparationCpu.push(row.cpuMs);rows.preparationLatency.push(row.elapsedMs);};
  const wrap=(object,name,key)=>{const original=object[name];object[name]=function(...args){if(key==='install'&&args[0]?.waterShore){preparedShore.count++;preparedShore.bytes+=args[0].waterShore.byteLength;}if(key==='install'&&args[0]?.waterBed){preparedWater.count++;preparedWater.bytes+=args[0].waterBed.bytes.byteLength;}const t=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-t;rows[key].push(ms);if(key==='draw'&&ms>100)slowDraws.push({ms,programs:w.renderer.info.programs.length,elapsed:w.state.elapsed,pauses:[...w.state.pauses]});}};return ()=>{object[name]=original;};};
  const longAnimationFrames=[],rendererStages=[];
  const loafSupported=PerformanceObserver.supportedEntryTypes.includes('long-animation-frame');
  const loafObserver=options.mainPhases&&loafSupported?new PerformanceObserver(list=>longAnimationFrames.push(...list.getEntries().map(entry=>entry.toJSON()))):null;
  loafObserver?.observe({type:'long-animation-frame'});
  const restore=[wrap(core,'addChunk','generate'),wrap(core,'removeChunk','remove'),wrap(core,'removeChunks','removeBatch'),wrap(w,'installChunk','install'),wrap(w,'terrain','terrain'),wrap(w,'buildPropSlot','props'),wrap(w,'render','render'),wrap(w,'drawRenderFrame','draw')];
  if(options.mainPhases){
   const original=w.renderFrameUpdates;
   w.renderFrameUpdates=function*(...args){const iterator=original.apply(this,args);let stage=0;
    try{for(;;){const start=performance.now();let next;try{next=iterator.next();}finally{rendererStages.push({stage:stage++,start,ms:performance.now()-start});}if(next.done)return next.value;yield next.value;}}finally{iterator.return?.();}
   };
   restore.push(()=>{w.renderFrameUpdates=original;});
  }
  if(w.mudPatches)restore.push(wrap(w.mudPatches,'chunk','mud'));
  if(w.biomeGround)restore.push(wrap(w.biomeGround,'attach','attach'));
  if(w.groundDetails)restore.push(wrap(w.groundDetails,'chunk','details'));
  if(w.mangroveMaterialCache)restore.push(wrap(w.mangroveMaterialCache,'update','cache'));
  if(core.preparation){restore.push(wrap(core.preparation,'start','admit'),wrap(core.preparation,'cancel','cancel'),wrap(core.preparation,'publish','publish'));const publish=core.preparation.publish;core.preparation.publish=(...a)=>{rows.nativeCompute.push(core.preparation.metric(1));return publish(...a);};}
  if(options.glDetail){for(const [object,name,key] of [[w.horizon,'update','horizon'],[w,'syncChunks','syncChunks'],[w,'beforeMicroeventDraw','microevents'],[w,'presentationDraw','presentation'],[w,'drawWorldFrame','worldDraw'],[w.renderer,'render','threeRender']])if(typeof object[name]==='function'){rows[key]=[];restore.push(wrap(object,name,key));}const gl=w.renderer.getContext();for(const name of ['compileShader','linkProgram','getProgramParameter','getShaderParameter','getShaderInfoLog','getProgramInfoLog','getUniformLocation','getActiveUniform','getActiveAttrib','drawElements','drawElementsInstanced','drawArrays','drawArraysInstanced','texImage2D','texSubImage2D','bufferData','bufferSubData']){const original=gl[name];gl[name]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-t;if(ms>20){const program=name==='getProgramInfoLog'?w.renderer.info.programs.find(p=>p.program===args[0]):null;slowGl.push({name,ms,elapsed:w.state.elapsed,program:program?{id:program.id,name:program.name,cacheKey:program.cacheKey}:null});}}};restore.push(()=>{gl[name]=original;});}}
  const farPending=()=>w.farVegetation?.adapters.some(adapter=>adapter.preparationPending())??false;
  const frame=()=>new Promise(r=>requestAnimationFrame(r));
  for(let i=0;i<60;i++)await frame();
  for(const values of [...Object.values(rows),...Object.values(detail)])values.length=0;
  mainPhases.length=0;mainFrames.length=0;rendererStages.length=0;longAnimationFrames.length=0;loafObserver?.takeRecords();
  const gpu=options.gpu?(await import('/tools/experiments/spatial-stream-gpu-timer.js')).installStreamGpuTimer(w):null;
  const programLease=options.pinPrograms?(await import('/src/rendering/retain-warmed-programs.js')).retainWarmedPrograms(w.renderer):null;
  const origin=w.controls.target.clone(),camera=w.camera.position.clone();
  const initialPrograms=options.glDetail?w.renderer.info.programs.map(p=>({id:p.id,cacheKey:p.cacheKey})):undefined;
  const baseline=core.metrics(),initialCreated=w.chunkStream.stats.created;
  const initialElapsed=w.state.elapsed,workersBefore=w.state.workers.map(worker=>({id:worker.id,x:worker.x,z:worker.z,status:worker.status}));
  if(options.active)game.resume(w.state,'menu');
  let last=await frame();
  try{
   for(let i=0;i<options.frames;i++){
    const displacement=options.completeLegs?((i%2===0)?options.distance:0):options.zigzag?(Math.floor(i/12)%2?options.distance:0):Math.min(options.distance,i*.8);
    w.controls.target.copy(origin);w.controls.target.x+=displacement;
    w.camera.position.copy(camera);w.camera.position.x+=displacement;
    const now=await frame();rows.frames.push(now-last);last=now;
    if(options.completeLegs){
     const deadline=performance.now()+60000;
     // Desert/canyon adopt the new near rectangle only after asynchronous
     // horizon preparation. An idle near queue alone can precede that adoption.
     for(let stable=0;stable<12;){
      if(performance.now()>deadline)throw Error('Leg/horizon completion timeout');
      const now=await frame();rows.frames.push(now-last);last=now;
      const stream=w.chunkStream.summary(),horizon=w.horizon?.generator;
      const complete=!stream.busy&&!stream.queued&&!horizon?.latest&&!horizon?.busy&&!w.horizon?.pendingPreparation&&!farPending()&&
       [...w.chunkStream.desired.keys()].every(key=>w.chunks.has(key));
      stable=complete?stable+1:0;
     }
     legs.push({leg:i,displacement,created:w.chunkStream.stats.created-initialCreated,resident:core.metrics().loadedChunks,keys:[...w.chunks.keys()].sort()});
    }
    if(w.actorsReady())actorsReadyFrames++;
    if(w.state.pauses.length)pausedFrames++;
    if(i%60===0)readiness.push({frame:i,elapsed:w.state.elapsed,ready:w.actorsReady(),pauses:[...w.state.pauses],stream:w.chunkStream.summary()});
   }
   const deadline=performance.now()+60000;
   while(w.chunkStream.summary().busy||w.chunkStream.summary().queued||w.horizon?.generator.latest||w.horizon?.generator.busy||w.horizon?.pendingPreparation||farPending()){if(performance.now()>deadline)throw Error('Stream completion deadline');const now=await frame();rows.frames.push(now-last);last=now;}
  }finally{if(loafObserver){longAnimationFrames.push(...loafObserver.takeRecords().map(entry=>entry.toJSON()));loafObserver.disconnect();}globalThis.qaMainPhase=null;globalThis.qaMainFrame=null;game.pause(w.state,'menu');gpu?.stop();for(const undo of restore)undo();
  programLease?.dispose();
  }
  const gpuResult=gpu?await gpu.finish():null;

  if(options.zigzag&&core.preparation&&rows.cancel.length===0)throw Error('Zigzag did not exercise native cancellation');
  if(w.chunkStream.summary().failed||w.chunkStream.summary().busy||w.chunkStream.summary().queued)throw Error('Stream did not settle cleanly');
  const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return {count:values.length,mean:values.reduce((a,b)=>a+b,0)/(values.length||1),p95:sorted[Math.floor((sorted.length-1)*.95)]??null,max:sorted.at(-1)??null};};
  const gl=w.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  if(options.active&&w.state.elapsed<=initialElapsed)throw Error('Active simulation did not advance');
  const workersAfter=w.state.workers.map(worker=>({id:worker.id,x:worker.x,z:worker.z,status:worker.status}));
  return {loafSupported,longAnimationFrames,rendererStages,mainPhases,mainFrames,terrainPhases,preparedShore,preparedWater,scope:options.active?'Active simulation streaming pilot from frozen initial state, per-frame camera travel; final state varies with wall-clock time. CPU/RAF only, not GPU or equivalence acceptance.':'Paused simulation streaming after 60 warm frames. CPU/RAF only.',options,farSettled:!farPending(),farStatus:w.farVegetation?.adapters.map(a=>({status:a.preparationStatus(),errors:a.stats.errors})),programRetention:programLease?.stats??null,legs,initialElapsed,workersBefore,workersAfter,actorsReadyFrames,pausedFrames,readiness,slowDraws,slowGl,fixtureTutorialSkipped:options.active,initialPrograms,depthWarmMs,gpu:gpuResult?{...gpuResult,summary:summary(gpuResult.samplesMs)}:null,hardware:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,cameraOrigin:camera.toArray(),targetOrigin:origin.toArray(),elapsed:w.state.elapsed,baseline,final:core.metrics(),created:w.chunkStream.stats.created-initialCreated,detail:Object.fromEntries(Object.entries(detail).map(([k,v])=>[k,summary(v)])),summary:Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,summary(v)])),rows};
 },{mainPhases:process.env.WG_THREAD_MAIN_PHASES==='1',lockRaidCamera:process.env.WG_THREAD_LOCK_RAID_CAMERA==='1',completeLegs:process.env.WG_THREAD_COMPLETE_LEGS==='1',pinPrograms:process.env.WG_THREAD_PIN_PROGRAMS==='1',zigzag:process.env.WG_THREAD_ZIGZAG==='1',active:process.env.WG_THREAD_ACTIVE==='1',gpu:process.env.WG_THREAD_GPU==='1',depthWarm:process.env.WG_THREAD_DEPTH_WARM==='1',glDetail:process.env.WG_THREAD_GL_DETAIL==='1',frames:Number(process.env.WG_THREAD_FRAMES??180),distance:Number(process.env.WG_THREAD_DISTANCE??96)});
 result.mudWorker=await page.evaluate(()=>qaThreadWorld.mudEdgeExecutor?{...qaThreadWorld.mudEdgeExecutor.stats,pending:qaThreadWorld.mudEdgeExecutor.jobs.size,closed:qaThreadWorld.mudEdgeExecutor.closed}:null);
 result.scheduler=await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(e=>e.name).find(n=>new URL(n).pathname==='/src/app/global-frame-scheduler.js');if(!url)throw Error('Missing canonical scheduler module');const {globalFrameScheduler}=await import(url);return {moduleUrl:url,...globalFrameScheduler.snapshot()};});
 if(profiler){const {profile}=await profiler.send('Profiler.stop');await writeFile((process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json').replace(/\.json$/,'.cpuprofile'),JSON.stringify(profile));await profiler.detach();}
 if(frozen&&(benchmark||process.env.WG_THREAD_EDIT==='1'||process.env.WG_THREAD_CONTEXT==='1'))await page.screenshot({path:(process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json').replace(/\.json$/,'.png')});
 await writeFile(process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json',JSON.stringify({scope:'Loaded populated game in Chrome; see streaming scope for limitations.',biome,quality,terrainDeadline:process.env.WG_THREAD_TERRAIN_DEFERRED==='1'?'deferred250':'required',url:gameUrl.href,result,errors},null,2)+'\n');
 console.log(JSON.stringify({result,errors}));
 const unexpected=errors.filter(e=>!e.includes('f_environment4')&&!(process.env.WG_THREAD_BOOT_FAILURE==='1'&&(e.includes('503')||e.includes('pthread runtime unavailable'))));
 if(unexpected.length)throw Error('Unexpected browser errors: '+unexpected.join(' | '));
}catch(error){let diagnosticTimer;const diagnostic=await Promise.race([page.evaluate(()=>globalThis.qaQualityFailure??null).catch(()=>null),new Promise(resolve=>{diagnosticTimer=setTimeout(()=>resolve({unavailable:'Browser diagnostic did not respond within 5s'}),5000);})]).finally(()=>clearTimeout(diagnosticTimer));await writeFile((process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json').replace(/\.json$/,'.failure.json'),JSON.stringify({message:error.message,diagnostic,qualityStatuses,errors},null,2)+'\n');throw error;}finally{await browser.close();}
