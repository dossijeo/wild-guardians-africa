import {compileLoadingProgramsBatched} from '/src/rendering/loading-programs.js';
export async function verifyGameQualityCycle(w){
 const lease=w.programLease;if(!lease?.stats.retained)throw Error('Expected default retention');
 const snapshot=()=>JSON.stringify({elapsed:w.state.elapsed,plants:w.state.plants,structures:w.state.structures,native:w.spatialSession.core.snapshot()});
 const before=snapshot(),rows=[],enabled=new URLSearchParams(location.search).get('streamingRecovery')!=='0';
 const attribution=[],restore=[];
 if(new URLSearchParams(location.search).get('qualityAttribution')==='1'){
  const wrap=(object,name,kind)=>{if(typeof object?.[name]!=='function')return;const original=object[name];object[name]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-t;if(ms>10){const p=kind==='gl'&&name==='getProgramInfoLog'?w.renderer.info.programs.find(p=>p.program===args[0]):null;attribution.push({kind,name,quality:w.quality,ms,at:performance.now(),program:p?{id:p.id,cacheKey:p.cacheKey}:null});}}};restore.push(()=>{object[name]=original;});};
  for(const name of ['render','drawRenderFrame','drawWorldFrame','syncChunks'])wrap(w,name,'scene');
  wrap(w.renderer,'render','renderer');wrap(w.renderer,'compile','renderer');wrap(w.mangroveMaterialCache,'update','groundCache');wrap(w.horizon,'update','horizon');
  const gl=w.renderer.getContext();for(const name of ['compileShader','linkProgram','getProgramParameter','getShaderParameter','getShaderInfoLog','getProgramInfoLog','getUniformLocation','getActiveUniform','getActiveAttrib','drawElements','drawElementsInstanced','drawArrays','drawArraysInstanced','texImage2D','texSubImage2D','bufferData','bufferSubData'])wrap(gl,name,'gl');
 }
 try{
 for(const quality of ['media','baja','media','baja']){
  const frameTimes=[];let previous=performance.now(),tracking=true;
  const sample=()=>{if(!tracking)return;const now=performance.now();frameTimes.push(now-previous);previous=now;if(tracking)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  const prewarm=new URLSearchParams(location.search).get('qualityPrewarm')==='1',draw=w.drawRenderFrame;
  if(prewarm)w.drawRenderFrame=()=>{};
  const begin=performance.now();w.qualitySetting(quality);const settingMs=performance.now()-begin;
  let prewarmMs=0;
  if(prewarm){const start=performance.now(),deadline=start+30000;try{
    // Fixed paused QA scene only: drain quality-triggered far preparation first.
    while(w.farVegetation?.adapters.some(a=>a.preparationPending())){if(performance.now()>deadline)throw Error('Far quality preparation timeout');await new Promise(requestAnimationFrame);}
    const owner=new AbortController(),materials=new Set();w.scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)materials.add(m);});
    const changed=()=>owner.abort();for(const m of materials)m.addEventListener('dispose',changed);
    try{await compileLoadingProgramsBatched(w.renderer,w.scene,w.camera,w.scene,{screen:true,signal:owner.signal,cancelled:()=>w.disposed,getEpoch:()=>w.glResourceEpoch?.stats.epoch??0,batchSize:8,frameBudget:6});await w.streamingProgramRefresh;}
    finally{for(const m of materials)m.removeEventListener('dispose',changed);}
  }finally{prewarmMs=performance.now()-start;w.drawRenderFrame=draw;}}
  for(let i=0;i<12;i++)await new Promise(requestAnimationFrame);
  w.render(0);await w.whenChunksReady();
  await w.streamingProgramRefresh;
  tracking=false;
  if(enabled&&!w.programLease?.stats.retained)throw Error('Quality change did not recover retention');
  if(!enabled&&w.programLease!==null)throw Error('Disabled recovery retained programs');
  const gl=w.renderer.getContext();if(gl.getError()!==gl.NO_ERROR)throw Error('GL error after quality change');
  rows.push({quality,programs:w.renderer.info.programs.length,drawCalls:w.renderer.info.render.calls,recovery:w.streamingProgramRecovery,retention:w.programLease?.stats??null,settingMs,prewarmMs,transitionMs:performance.now()-begin,frameTimes});
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
 if(snapshot()!==before)throw Error('World changed during quality cycle');
 if(lease.stats.released!==lease.stats.retained)throw Error('Initial lease not fully released');
 return {attribution,attributionScope:'Nested synchronous call timings above 10 ms overlap; do not sum parent and child calls. No GPU execution timing is implied.',rows,lease:lease.stats,worldUnchanged:true,limitation:'The refreshed snapshot remains bounded; it prioritizes newer variants and cannot guarantee every future unseen shader is warm.'};
 }finally{for(const undo of restore.reverse())undo();}
}
