import {retainWarmedPrograms} from '/src/rendering/retain-warmed-programs.js';
import {compileLoadingProgramsBatched} from '/src/rendering/loading-programs.js';
export async function verifyGameQualityCycle(w){
 const lease=w.programLease;if(!lease?.stats.retained)throw Error('Expected default retention');
 const snapshot=()=>JSON.stringify({elapsed:w.state.elapsed,plants:w.state.plants,structures:w.state.structures,native:w.spatialSession.core.snapshot()});
 const before=snapshot(),rows=[],enabled=new URLSearchParams(location.search).get('streamingRecovery')!=='0';
 const active=new URLSearchParams(location.search).get('qualityActive')==='1';
 const initialElapsed=w.state.elapsed,initialCreated=w.chunkStream.stats.created,originalCameraUpdate=w.updateCamera;
 let travelFrame=0,travelHandle=null,game=null;
 if(active){
  const url=performance.getEntriesByType('resource').map(e=>e.name).find(n=>new URL(n).pathname==='/src/simulation/game.js');if(!url)throw Error('Missing canonical game module');game=await import(url);game.resume(w.state,'menu');
  const eye=w.camera.position.clone(),target=w.controls.target.clone();
  w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
  const move=()=>{travelFrame++;const offset=144*Math.min(travelFrame/240,1);w.camera.position.copy(eye);w.camera.position.x+=offset;w.controls.target.copy(target);w.controls.target.x+=offset;if(travelFrame<240)travelHandle=requestAnimationFrame(move);};travelHandle=requestAnimationFrame(move);
 }
 const deletedPrograms=new WeakMap();
 const attribution=[],restore=[],strictGl=new URLSearchParams(location.search).get('qualityStrictGl')==='1';
 if(new URLSearchParams(location.search).get('qualityAttribution')==='1'){
  const wrap=(object,name,kind)=>{if(typeof object?.[name]!=='function')return;const original=object[name];object[name]=function(...args){if(kind==='gl'&&name==='deleteProgram'&&args[0])deletedPrograms.set(args[0],new Error('program deletion').stack);else if(kind==='gl'&&args[0]&&deletedPrograms.has(args[0]))attribution.push({kind:'deleted-program-access',name,ms:0,deleted:deletedPrograms.get(args[0]),stack:new Error('deleted program access').stack});if(strictGl&&kind==='gl'&&name==='getProgramParameter'){const stack=new Error('program query').stack;if(!attribution.some(x=>x.kind==='program-query-stack'&&x.stack===stack))attribution.push({kind:'program-query-stack',name,ms:0,stack});}const t=performance.now();try{const result=original.apply(this,args);if(strictGl&&kind==='gl'){const code=w.renderer.getContext().getError();if(code){attribution.push({kind:'query-gl-error',name,ms:0,code,stack:new Error('program query GL error').stack});throw Error('Diagnostic program query GL error 0x'+code.toString(16));}}return result;}finally{const ms=performance.now()-t;if(ms>10){const p=kind==='gl'&&name==='getProgramInfoLog'?w.renderer.info.programs.find(p=>p.program===args[0]):null;attribution.push({kind,name,quality:w.quality,ms,at:performance.now(),stack:ms>100&&kind==='renderer'&&name==='render'?new Error('slow auxiliary draw').stack:null,program:p?{id:p.id,cacheKey:p.cacheKey}:null});}}};restore.push(()=>{object[name]=original;});};
  for(const name of ['render','drawRenderFrame','drawWorldFrame','syncChunks'])wrap(w,name,'scene');
  wrap(w.renderer,'render','renderer');wrap(w.renderer,'compile','renderer');wrap(w.mangroveMaterialCache,'update','groundCache');wrap(w.horizon,'update','horizon');
  const gl=w.renderer.getContext(),methods=new Set(['deleteProgram','useProgram','compileShader','linkProgram','getProgramParameter','getShaderParameter','getShaderInfoLog','getProgramInfoLog','getUniformLocation','getActiveUniform','getActiveAttrib','drawElements','drawElementsInstanced','drawArrays','drawArraysInstanced','texImage2D','texSubImage2D','bufferData','bufferSubData']);if(strictGl)for(let p=gl;p;p=Object.getPrototypeOf(p))for(const name of Object.getOwnPropertyNames(p))if(name!=='getError'&&name!=='constructor'&&typeof gl[name]==='function')methods.add(name);for(const name of methods)wrap(gl,name,'gl');
 }
 try{
 for(const quality of ['media','baja','media','baja']){
  const frameTimes=[];let previous=performance.now(),tracking=true;
  const sample=()=>{if(!tracking)return;const now=performance.now();frameTimes.push(now-previous);previous=now;if(tracking)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  const prewarm=new URLSearchParams(location.search).get('qualityPrewarm')==='1',draw=w.drawRenderFrame;
  const serializeRecovery=new URLSearchParams(location.search).get('qualitySerialRecovery')==='1',refresh=w.refreshStreamingPrograms;
  if(prewarm){w.drawRenderFrame=()=>{};if(serializeRecovery)w.refreshStreamingPrograms=()=>{};}
  const begin=performance.now();w.qualitySetting(quality);const settingMs=performance.now()-begin;
  let prewarmMs=0,prewarmInvalidations=0;const temporaryLeases=[],pinnedPrograms=new Set(),pinPrograms=new URLSearchParams(location.search).get('qualityPinPrograms')==='1';
  if(prewarm){const start=performance.now(),deadline=start+30000;try{
    // Drain far preparation; active QA additionally exercises concurrent scene changes.
    while(w.farVegetation?.adapters.some(a=>a.preparationPending())){if(performance.now()>deadline)throw Error('Far quality preparation timeout');await new Promise(requestAnimationFrame);}
    for(;;){
     if(performance.now()>deadline)throw Error('Quality prewarm scene did not stabilize');
     try{await compileLoadingProgramsBatched(w.renderer,w.scene,w.camera,w.scene,{screen:true,guardResourceDisposal:true,onSubmit:pinPrograms?span=>{if(span.label==='loading-compile-submit')temporaryLeases.push(retainWarmedPrograms(w.renderer,{limit:4096,select:p=>{if(pinnedPrograms.has(p))return false;pinnedPrograms.add(p);return true;}}));}:undefined,cancelled:()=>w.disposed,getEpoch:()=>w.glResourceEpoch?.stats.epoch??0,batchSize:8,frameBudget:6});break;}
     catch(error){if(error.code!=='BORROWED_RESOURCE_DISPOSED'||w.disposed)throw error;prewarmInvalidations++;await new Promise(requestAnimationFrame);}
    }
    if(serializeRecovery){w.refreshStreamingPrograms=refresh;await refresh.call(w);}
    await w.streamingProgramRefresh;
  }finally{for(const lease of temporaryLeases.reverse())lease.dispose();w.refreshStreamingPrograms=refresh;prewarmMs=performance.now()-start;w.drawRenderFrame=draw;}}
  for(let i=0;i<12;i++)await new Promise(requestAnimationFrame);
  w.render(0);await w.whenChunksReady();
  await w.streamingProgramRefresh;
  tracking=false;
  if(enabled&&!w.programLease?.stats.retained)throw Error('Quality change did not recover retention');
  if(!enabled&&w.programLease!==null)throw Error('Disabled recovery retained programs');
  const gl=w.renderer.getContext(),glError=gl.getError();if(glError!==gl.NO_ERROR)throw Error('GL error after quality change: 0x'+glError.toString(16));
  rows.push({quality,programs:w.renderer.info.programs.length,drawCalls:w.renderer.info.render.calls,recovery:w.streamingProgramRecovery,retention:w.programLease?.stats??null,settingMs,prewarmMs,prewarmInvalidations,temporaryProgramLeases:temporaryLeases.map(l=>l.stats),transitionMs:performance.now()-begin,frameTimes});
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
  if(w.state.elapsed<=initialElapsed||w.chunkStream.stats.created<=initialCreated)throw Error('Active case did not exercise simulation and streaming');
  if(w.chunkStream.summary().failed||w.state.pauses.includes('runtime-error'))throw Error('Active streaming failed');
 }else if(snapshot()!==before)throw Error('World changed during quality cycle');
 if(lease.stats.released!==lease.stats.retained)throw Error('Initial lease not fully released');
 return {attribution,attributionScope:'Nested synchronous call timings above 10 ms overlap; do not sum parent and child calls. No GPU execution timing is implied.',rows,lease:lease.stats,worldUnchanged:active?null:true,active:active?{initialElapsed,elapsed:w.state.elapsed,travelFrame,created:w.chunkStream.stats.created-initialCreated,stream:w.chunkStream.summary()}:null,limitation:'The refreshed snapshot remains bounded; it prioritizes newer variants and cannot guarantee every future unseen shader is warm.'};
 }catch(error){globalThis.qaQualityFailure={message:error.message,rows,attribution};throw error;}finally{if(active){cancelAnimationFrame(travelHandle);w.updateCamera=originalCameraUpdate;game.pause(w.state,'menu');}for(const undo of restore.reverse())undo();}
}
