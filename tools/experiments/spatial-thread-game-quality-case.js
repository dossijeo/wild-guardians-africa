import {initializeProgramBindingsAsync} from '/src/rendering/program-bindings.js';
import {createShadowRecipeRenderer} from '/src/rendering/shadow-recipe-renderer.js';
import {globalFrameScheduler,globalFrameSchedulerEnabled} from '/src/app/global-frame-scheduler.js';
import {prepareLiveScenePrograms} from '/src/rendering/live-program-preparation.js';
import {createProgramRetentionScope} from '/src/rendering/retain-warmed-programs.js';
import {compileLoadingPrograms,compileLoadingProgramsBatched} from '/src/rendering/loading-programs.js';
export async function verifyGameQualityCycle(w){
 const lease=w.programLease,retentionExpected=w.streamingOptions?.retainPrograms===true;
 if(retentionExpected&&!lease?.stats.retained)throw Error('Expected configured retention');
 if(!retentionExpected&&lease)throw Error('Unexpected retention outside configured policy');
 const snapshot=()=>JSON.stringify({elapsed:w.state.elapsed,plants:w.state.plants,structures:w.state.structures,native:w.spatialSession.core.snapshot()});
 const cacheState=()=>{const cache=w.mangroveMaterialCache;return cache?{chunks:cache.states.size,ready:[...cache.states.values()].filter(s=>s.texture.value).length,queue:{...cache.queue.stats}}:null;};
 const before=snapshot(),rows=[],enabled=retentionExpected&&new URLSearchParams(location.search).get('streamingRecovery')!=='0';
 const active=new URLSearchParams(location.search).get('qualityActive')==='1';
 let cropDepthWarm=null;
 if(new URLSearchParams(location.search).get('cropDepthWarm')==='1'){
  const objects=[];w.scene.traverse(o=>{if(o.customDepthMaterial?.customProgramCacheKey().includes('bioma-local-bridge-depth-v3'))objects.push(o);});
  const view={overrideMaterial:w.scene.overrideMaterial,onBeforeRender:w.scene.onBeforeRender,onAfterRender:w.scene.onAfterRender,traverse:fn=>objects.forEach(fn),traverseVisible:fn=>objects.forEach(fn)};
  const sources=new WeakMap(objects.map(o=>[o,{map:o.material.map,alphaMap:o.material.alphaMap}]));
  const start=performance.now(),scope=createProgramRetentionScope(w.renderer);let pinFailed=false;
  try{
   await w.destructionPass.prepareDepth(w.camera,view,{batchSize:8,cancelled:()=>w.disposed||pinFailed,compile:(scene,camera)=>compileLoadingPrograms(w.renderer,scene,camera,w.scene,{cancelled:()=>w.disposed||pinFailed,onSubmit:span=>{if(span.label==='loading-compile-submit'&&!scope.acquire())pinFailed=true;}})});
   let shadowVariant=false;
   if(new URLSearchParams(location.search).get('cropDepthShadowWarm')==='1'){
    shadowVariant=true;
    await w.destructionPass.prepareDepth(w.camera,view,{batchSize:8,cancelled:()=>w.disposed||pinFailed,compile:(scene,camera)=>{
     const saved=new Map(),shadowEnabled=w.renderer.shadowMap.enabled,fog=w.scene.fog;
     try{
      w.renderer.shadowMap.enabled=true;w.scene.fog=null;
      scene.traverse(o=>{const source=sources.get(o),m=o.material;if(!source||m!==o.customDepthMaterial)return;if(!saved.has(m))saved.set(m,{map:m.map,alphaMap:m.alphaMap});m.map=source.map;m.alphaMap=source.alphaMap;});
      return compileLoadingPrograms(w.renderer,scene,camera,w.scene,{cancelled:()=>w.disposed||pinFailed,onSubmit:span=>{if(span.label==='loading-compile-submit'&&!scope.acquire())pinFailed=true;}});
     }finally{w.renderer.shadowMap.enabled=shadowEnabled;w.scene.fog=fog;for(const [m,values] of saved){Object.assign(m,values);m.needsUpdate=true;}}
    }});
   }
   const bindings=await initializeProgramBindingsAsync(w.renderer,{cancelled:()=>w.disposed||pinFailed});
   cropDepthWarm={objects:objects.length,shadowVariant,programKeys:w.renderer.info.programs.filter(p=>p.cacheKey.includes('bioma-local-bridge-depth-v3')).map(p=>p.cacheKey),ms:performance.now()-start,bindings,stats:w.destructionPass.depthWarmStats,scope:'QA pre-activation preparation of dormant crop bridge depth recipes; included as extra preparation cost, not a free performance gain.'};
  }finally{scope.dispose();}
 }
 const initialElapsed=w.state.elapsed,initialCreated=w.chunkStream.stats.created,originalCameraUpdate=w.updateCamera;
 let travelStartedAt=null,travelCompletedAt=null,settledAt=null;
 let travelFrame=0,travelHandle=null,game=null,advancingFrames=0,pausedFrames=0,lastSimulationElapsed=w.state.elapsed;const pauseReasons={};
 if(active){
  const url=performance.getEntriesByType('resource').map(e=>e.name).find(n=>new URL(n).pathname==='/src/simulation/game.js');if(!url)throw Error('Missing canonical game module');game=await import(url);game.resume(w.state,'menu');
  const eye=w.camera.position.clone(),target=w.controls.target.clone();
  // Preserve the production terrain-camera protection during scripted X/Z travel.
  // Fixed eye height can otherwise put the QA camera below canyon plateaus.
  travelStartedAt=performance.now();const move=()=>{travelFrame++;if(w.state.elapsed>lastSimulationElapsed)advancingFrames++;lastSimulationElapsed=w.state.elapsed;if(w.state.pauses.length){pausedFrames++;for(const reason of w.state.pauses)pauseReasons[reason]=(pauseReasons[reason]??0)+1;}const offset=144*Math.min(travelFrame/240,1);w.camera.position.copy(eye);w.camera.position.x+=offset;w.controls.target.copy(target);w.controls.target.x+=offset;if(travelFrame<240)travelHandle=requestAnimationFrame(move);else travelCompletedAt=performance.now();};travelHandle=requestAnimationFrame(move);
 }
 const estimateFault=new URLSearchParams(location.search).get('estimateOutlier')==='1',scheduler=w.frameScheduler,originalSubmit=scheduler?.submit;let forcedJobs=0;
 if(estimateFault){if(!scheduler)throw Error('Estimate injection requires scheduler');scheduler.submit=function(iterator,options={}){
  if(forcedJobs>=2||!options.label)return originalSubmit.call(this,iterator,options);forcedJobs++;let pending=true;
  const wrapped={next(){pending=false;return iterator.next();},return(){return iterator.return?.();}};
  return originalSubmit.call(this,wrapped,{...options,estimate:()=>pending?14:(options.estimate?.()??options.estimateMs??.25)});
 };}
 const deletedPrograms=new WeakMap();
 const phaseAttribution=new URLSearchParams(location.search).get('qualityPhases')==='1',previousSpan=w.onLoadingSpan;let phaseSamples=new Map();
 if(phaseAttribution)w.onLoadingSpan=span=>{previousSpan?.(span);if(span.label.startsWith('world-frame-')){let samples=phaseSamples.get(span.label);if(!samples){samples=[];phaseSamples.set(span.label,samples);}samples.push(span.duration);}};
 const previousTerrain=w.onTerrainPreparationSlice,terrainPhases={};
 if(phaseAttribution){globalThis.qaTerrainPhases=terrainPhases;w.onTerrainPreparationSlice=span=>{previousTerrain?.(span);const v=terrainPhases[span.phase]??={count:0,totalMs:0,maxMs:0};v.count++;v.totalMs+=span.ms;v.maxMs=Math.max(v.maxMs,span.ms);};}
 const phaseSummary=()=>Object.fromEntries([...phaseSamples].map(([name,values])=>{const sorted=[...values].sort((a,b)=>a-b);return [name,{count:values.length,totalMs:values.reduce((a,b)=>a+b,0),p95Ms:sorted[Math.floor((sorted.length-1)*.95)],maxMs:sorted.at(-1)}];}));
 const attribution=[],restore=[],strictGl=new URLSearchParams(location.search).get('qualityStrictGl')==='1';
 if(new URLSearchParams(location.search).get('qualityAttribution')==='1'){
  const wrap=(object,name,kind)=>{if(typeof object?.[name]!=='function')return;const original=object[name];object[name]=function(...args){if(kind==='gl'&&name==='deleteProgram'&&args[0])deletedPrograms.set(args[0],new Error('program deletion').stack);else if(kind==='gl'&&args[0]&&deletedPrograms.has(args[0]))attribution.push({kind:'deleted-program-access',name,ms:0,deleted:deletedPrograms.get(args[0]),stack:new Error('deleted program access').stack});if(strictGl&&kind==='gl'&&name==='getProgramParameter'){const stack=new Error('program query').stack;if(!attribution.some(x=>x.kind==='program-query-stack'&&x.stack===stack))attribution.push({kind:'program-query-stack',name,ms:0,stack});}const t=performance.now();try{const result=original.apply(this,args);if(strictGl&&kind==='gl'){const code=w.renderer.getContext().getError();if(code){attribution.push({kind:'query-gl-error',name,ms:0,code,stack:new Error('program query GL error').stack});throw Error('Diagnostic program query GL error 0x'+code.toString(16));}}return result;}finally{const ms=performance.now()-t;if(ms>10){const p=kind==='gl'&&name==='getProgramInfoLog'?w.renderer.info.programs.find(p=>p.program===args[0]):null;attribution.push({kind,name,quality:w.quality,ms,at:performance.now(),stack:ms>100&&kind==='renderer'&&name==='render'?new Error('slow auxiliary draw').stack:null,program:p?{id:p.id,cacheKey:p.cacheKey}:null});}}};restore.push(()=>{object[name]=original;});};
  for(const name of ['render','drawRenderFrame','drawWorldFrame','syncChunks'])wrap(w,name,'scene');
  wrap(w.renderer,'render','renderer');wrap(w.renderer,'compile','renderer');wrap(w.mangroveMaterialCache,'update','groundCache');wrap(w.horizon,'update','horizon');
  const gl=w.renderer.getContext(),methods=new Set(['deleteProgram','useProgram','compileShader','linkProgram','getProgramParameter','getShaderParameter','getShaderInfoLog','getProgramInfoLog','getUniformLocation','getActiveUniform','getActiveAttrib','drawElements','drawElementsInstanced','drawArrays','drawArraysInstanced','texImage2D','texSubImage2D','bufferData','bufferSubData']);if(strictGl)for(let p=gl;p;p=Object.getPrototypeOf(p))for(const name of Object.getOwnPropertyNames(p))if(name!=='getError'&&name!=='constructor'&&typeof gl[name]==='function')methods.add(name);for(const name of methods)wrap(gl,name,'gl');
 }
 try{
 for(const quality of ['media','baja','media','baja']){
  // Match settings UI: a request for the active quality performs no work.
  if(new URLSearchParams(location.search).get('qualityMenuProtocol')==='1'&&quality===w.quality)continue;
  phaseSamples=new Map();
  if(phaseAttribution)globalThis.qaQualityStatus={quality,step:'begin'};
  const frameTimes=[];let previous=performance.now(),tracking=true;
  const sample=()=>{if(!tracking)return;const now=performance.now();frameTimes.push(now-previous);previous=now;if(tracking)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  const prewarm=new URLSearchParams(location.search).get('qualityPrewarm')==='1',draw=w.drawRenderFrame;
  const serializeRecovery=new URLSearchParams(location.search).get('qualitySerialRecovery')==='1',refresh=w.refreshStreamingPrograms;
  if(prewarm){w.drawRenderFrame=()=>{};if(serializeRecovery)w.refreshStreamingPrograms=()=>{};}
  const cacheBefore=cacheState();const begin=performance.now();
  let stagedPreparation=null,settingMs=0;
  if(new URLSearchParams(location.search).get('qualityStaged')==='1'){
   if(prewarm)throw Error('Staged preparation must keep presentation running');
   const oldQuality=w.quality,revision=w.streamingProgramRevision,oldShadow=w.renderer.shadowMap.enabled,scope=createProgramRetentionScope(w.renderer),start=performance.now();let draws=0,pinFailed=false;const compileSpans=[];
   const originalDraw=w.drawRenderFrame;w.drawRenderFrame=function(...args){if(w.quality!==oldQuality||w.renderer.shadowMap.enabled!==oldShadow)throw Error('Staged quality leaked into presentation');draws++;return originalDraw.apply(this,args);};
   try{
    if(phaseAttribution)globalThis.qaQualityStatus={quality,step:'prepare'};
    const stats=await prepareLiveScenePrograms(createShadowRecipeRenderer(w.renderer,quality==='media'||quality==='alta'),w.scene,w.camera,{screen:true,scheduler:globalFrameSchedulerEnabled()?globalFrameScheduler:null,onSubmit:span=>{compileSpans.push({...span,admission:span.label==='loading-compile-admission-wait'?globalFrameScheduler.snapshot():undefined});if(span.label==='loading-compile-submit'&&!scope.acquire())pinFailed=true;},cancelled:()=>w.disposed||pinFailed||w.quality!==oldQuality||w.streamingProgramRevision!==revision,getEpoch:()=>w.glResourceEpoch?.stats.epoch??0,batchSize:8,concurrency:Number(new URLSearchParams(location.search).get('qualityCompileConcurrency')??1),frameBudget:6});
    stagedPreparation={ms:performance.now()-start,draws,stats,compileSpans};
    w.drawRenderFrame=originalDraw;
    if(phaseAttribution)globalThis.qaQualityStatus={quality,step:'activate'};
    const activate=performance.now();w.qualitySetting(quality);settingMs=performance.now()-activate;await w.streamingProgramRefresh;stagedPreparation.activationMs=performance.now()-activate;
   }finally{w.drawRenderFrame=originalDraw;scope.dispose();if(stagedPreparation)stagedPreparation.retention={...scope.stats};}
  }else {w.qualitySetting(quality);settingMs=performance.now()-begin;}
  let livePreparation=null;let prewarmMs=0,prewarmInvalidations=0;const pinPrograms=new URLSearchParams(location.search).get('qualityPinPrograms')==='1',temporaryScope=pinPrograms?createProgramRetentionScope(w.renderer):null;let pinFailed=false;
  if(prewarm){const start=performance.now(),deadline=start+30000;try{
    // Drain far preparation; active QA additionally exercises concurrent scene changes.
    while(w.farVegetation?.adapters.some(a=>a.preparationPending())){if(performance.now()>deadline)throw Error('Far quality preparation timeout');await new Promise(requestAnimationFrame);}
    for(;;){
     if(performance.now()>deadline)throw Error('Quality prewarm scene did not stabilize');
     try{const live=new URLSearchParams(location.search).get('qualityLivePreparation')==='1';const compile=live?((r,s,c,t,o)=>prepareLiveScenePrograms(r,s,c,o)):compileLoadingProgramsBatched;livePreparation=await compile(w.renderer,w.scene,w.camera,w.scene,{screen:true,guardResourceDisposal:true,scheduler:globalFrameSchedulerEnabled()?globalFrameScheduler:null,onSubmit:pinPrograms?span=>{if(span.label==='loading-compile-submit'&&!temporaryScope.acquire())pinFailed=true;}:undefined,cancelled:()=>w.disposed||pinFailed,getEpoch:()=>w.glResourceEpoch?.stats.epoch??0,batchSize:8,frameBudget:6});break;}
     catch(error){if(error.code!=='BORROWED_RESOURCE_DISPOSED'||w.disposed)throw error;prewarmInvalidations++;await new Promise(requestAnimationFrame);}
    }
    if(serializeRecovery){w.refreshStreamingPrograms=refresh;await refresh.call(w);}
    await w.streamingProgramRefresh;
  }finally{temporaryScope?.dispose();w.refreshStreamingPrograms=refresh;prewarmMs=performance.now()-start;w.drawRenderFrame=draw;}}
  const waitStart=performance.now();
  for(let i=0;i<12;i++)await new Promise(requestAnimationFrame);
  const framesReady=performance.now();w.render(0);const renderReady=performance.now();
  await w.whenChunksReady();const chunksReady=performance.now();
  await w.streamingProgramRefresh;const programsReady=performance.now();
  const completionPhases={settleFramesMs:framesReady-waitStart,explicitRenderCpuMs:renderReady-framesReady,chunkWaitMs:chunksReady-renderReady,programWaitMs:programsReady-chunksReady,scope:'Sequential elapsed waits overlap live presentation and native work; only explicitRenderCpuMs measures a synchronous invocation.'};
  tracking=false;
  if(enabled&&!w.programLease?.stats.retained)throw Error('Quality change did not recover retention');
  if(!enabled&&w.programLease!==null)throw Error('Disabled recovery retained programs');
  const beforeDiagnosticMs=performance.now()-begin,diagnosticStart=performance.now();
  const gl=w.renderer.getContext(),glError=gl.getError();const diagnosticMs=performance.now()-diagnosticStart;if(glError!==gl.NO_ERROR)throw Error('GL error after quality change: 0x'+glError.toString(16));
  rows.push({quality,completionPhases,terrainPhases:phaseAttribution?structuredClone(terrainPhases):null,phases:phaseAttribution?phaseSummary():null,stagedPreparation,cacheBefore,cacheAfter:cacheState(),programs:w.renderer.info.programs.length,drawCalls:w.renderer.info.render.calls,recovery:w.streamingProgramRecovery,retention:w.programLease?.stats??null,settingMs,prewarmMs,prewarmInvalidations,livePreparation:livePreparation?.rounds?livePreparation:null,temporaryProgramScope:temporaryScope?.stats??null,transitionMs:performance.now()-begin,beforeDiagnosticMs,diagnosticMs,frameTimes});
  if(globalThis.qaCaptureQuality){
   // Screenshot settling is deliberately outside measured transition timings.
   const deadline=performance.now()+30000;let stable=0;
   while(stable<120){if(performance.now()>deadline)throw Error('Quality capture settling timeout');await new Promise(requestAnimationFrame);const stream=w.chunkStream.summary();const pending=stream.busy||stream.queued||w.horizon?.generator.latest||w.horizon?.generator.busy||w.horizon?.pendingPreparation||w.farVegetation?.adapters.some(a=>a.preparationPending());stable=pending?0:stable+1;}
   rows.at(-1).capture={stableFrames:stable,drawCalls:w.renderer.info.render.calls,far:w.farVegetation?.adapters.map(a=>({status:a.preparationStatus(),errors:a.stats.errors}))};
   await globalThis.qaCaptureQuality(rows.length,quality);
  }
  if(!rows.at(-1).drawCalls)throw Error('Missing draw after quality change');
 }
 if(enabled){const previous=w.programLease;w.qualitySetting('media');await new Promise(requestAnimationFrame);w.qualitySetting('baja');await w.streamingProgramRefresh;if(!w.programLease?.stats.retained||w.quality!=='baja')throw Error('Superseded quality recovery failed');if(previous.stats.released!==previous.stats.retained)throw Error('Rapid-change lease leaked');}
 if(active){
  const deadline=performance.now()+30000;while(travelFrame<240||w.chunkStream.summary().busy||w.chunkStream.summary().queued||w.farVegetation?.adapters.some(a=>a.preparationPending())){if(performance.now()>deadline)throw Error('Active quality streaming did not settle');await new Promise(requestAnimationFrame);}
  settledAt=performance.now();
  if(w.state.elapsed<=initialElapsed||w.chunkStream.stats.created<=initialCreated)throw Error('Active case did not exercise simulation and streaming: '+JSON.stringify({advance:w.state.elapsed-initialElapsed,created:w.chunkStream.stats.created-initialCreated,travelFrame,advancingFrames,pausedFrames,pauseReasons}));
  if(new URLSearchParams(location.search).get('qualityRequireActive')==='1'&&(advancingFrames<travelFrame*.9||pausedFrames>travelFrame*.05))throw Error('Simulation was not sustained during camera travel: '+JSON.stringify({travelFrame,advancingFrames,pausedFrames,pauseReasons}));
  if(w.chunkStream.summary().failed||w.state.pauses.includes('runtime-error'))throw Error('Active streaming failed');
 }else if(snapshot()!==before)throw Error('World changed during quality cycle');
 if(lease&&lease.stats.released!==lease.stats.retained)throw Error('Initial lease not fully released');
 if(estimateFault&&(forcedJobs!==2||scheduler.snapshot().oversizeRecoveries<2))throw Error('Oversized estimate recovery was not exercised');
 return {cropDepthWarm,faultInjection:estimateFault?{forcedJobs,scope:'Correctness-only: two terrain units deliberately estimated at 14 ms until first execution; not a performance benchmark.'}:null,attribution,attributionScope:'Nested synchronous call timings above 10 ms overlap; do not sum parent and child calls. No GPU execution timing is implied.',rows,retentionExpected,lease:lease?.stats??null,worldUnchanged:active?null:true,active:active?{travelWallMs:travelCompletedAt-travelStartedAt,settledWallMs:settledAt-travelStartedAt,postTravelWaitMs:settledAt-travelCompletedAt,timingScope:'Wall time includes existing quality correctness diagnostics; no GPU/CPU attribution. Same 240-frame travel protocol.',initialElapsed,elapsed:w.state.elapsed,travelFrame,advancingFrames,pausedFrames,pauseReasons,created:w.chunkStream.stats.created-initialCreated,stream:w.chunkStream.summary()}:null,limitation:'The refreshed snapshot remains bounded; it prioritizes newer variants and cannot guarantee every future unseen shader is warm.'};
 }catch(error){globalThis.qaQualityFailure={message:error.message,livePreparation:error.preparation??null,rows,attribution};throw error;}finally{if(estimateFault)scheduler.submit=originalSubmit;if(phaseAttribution){w.onLoadingSpan=previousSpan;w.onTerrainPreparationSlice=previousTerrain;}if(active){cancelAnimationFrame(travelHandle);w.updateCamera=originalCameraUpdate;game.pause(w.state,'menu');}for(const undo of restore.reverse())undo();}
}
