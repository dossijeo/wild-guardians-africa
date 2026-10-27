import {installStreamGpuTimer} from './spatial-stream-gpu-timer.js';
import {BufferGeometry} from 'three';
// QA only: existing RAF callbacks and asynchronous GPU queries, no new RAF.
export async function observeQualityExecution(world,run){
 const frames=[],phases=[],longFrames=[],previousFrame=globalThis.qaMainFrame,previousPhase=globalThis.qaMainPhase;
 const farOperations=[],restore=[];
 let depthRegions=null;if(new URLSearchParams(globalThis.location?.search??'').has('softDepthRegion')){const {installSoftDepthRegion}=await import('./soft-depth-region.js');const finish=installSoftDepthRegion(world,{cropCamera:new URLSearchParams(globalThis.location.search).get('softDepthRegion')==='2'});restore.push(()=>{depthRegions=finish();});}

 const renderStages=[],depthRequests=[];let renderStagesDropped=0;
 if(new URLSearchParams(globalThis.location?.search??'').get('qualityRenderStages')==='1'){
  const record=span=>{if(span.duration<1)return;if(renderStages.length<20000)renderStages.push(span);else renderStagesDropped++;};
  const previous=world.onLoadingSpan;
  const witness=span=>{previous?.(span);if(span.label.startsWith('world-frame-'))record(span);};
  world.onLoadingSpan=witness;restore.push(()=>{if(world.onLoadingSpan===witness)world.onLoadingSpan=previous;});
  for(const slot of ['workVfx','attackVfx','shieldVfx','agricultureVfx','materialVfx','locomotionVfx']){
   const owner=world[slot];if(!owner)continue;const originalPrepare=owner.prepare;
   const prepare=function(...args){const result=originalPrepare.apply(this,args);if(result&&depthRequests.length<20000)depthRequests.push({slot,at:performance.now(),effects:owner.effects?.size});return result;};
   owner.prepare=prepare;restore.push(()=>{if(owner.prepare===prepare)owner.prepare=originalPrepare;});
  }
  const original=world.renderer.render;
  const wrapped=function(scene,camera){const start=performance.now();try{return original.call(this,scene,camera);}finally{const end=performance.now();record({label:scene===world.scene?'three-world-render':'three-aux-render',target:this.getRenderTarget()?.texture?.uuid??null,override:scene.overrideMaterial?.type??null,start,end,duration:end-start});}};
  world.renderer.render=wrapped;restore.push(()=>{if(world.renderer.render===wrapped)world.renderer.render=original;});
 }

 const normalOwner=BufferGeometry.prototype,originalNormals=normalOwner.computeVertexNormals;
 const wrappedNormals=function(...args){const at=performance.now();try{return originalNormals.apply(this,args);}finally{const ms=performance.now()-at;if(ms>=1&&farOperations.length<10000)farOperations.push({label:'computeVertexNormals',vertices:this.attributes.position?.count,indices:this.index?.count,at,ms});}};
 normalOwner.computeVertexNormals=wrappedNormals;restore.push(()=>{if(normalOwner.computeVertexNormals===wrappedNormals)normalOwner.computeVertexNormals=originalNormals;});
 if(world.biomeGround){
  const owner=world.biomeGround,original=owner.uniforms;
  const wrapped=function(...args){const at=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-at;if(ms>=1&&farOperations.length<10000)farOperations.push({label:'groundUniforms',mapped:args[3]?.mapped!==false,cx:args[0],cz:args[1],at,ms});}};
  owner.uniforms=wrapped;restore.push(()=>{if(owner.uniforms===wrapped)owner.uniforms=original;});
 }
 for(const [slot,adapter] of (world.farVegetation?.adapters??[]).entries()){
  for(const [owner,key] of [[adapter.layer,'selectTrees'],[adapter.layer,'create'],[adapter.layer,'attachData'],[adapter.layer,'prepare'],[adapter.layer.transitions,'bind']]){
   const original=owner[key];if(typeof original!=='function')continue;
   const wrapped=function(...args){const at=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-at;if(ms>=1&&farOperations.length<10000){const ground=key==='attachData'?args[1]?.ground:null;farOperations.push({slot,label:key,at,ms,...(ground?{ground:{vertices:ground.positions.length/3,indices:ground.indices.length,waterProvided:!!ground.water,colorMap:!!ground.colorMap}}:{})});}}};
   owner[key]=wrapped;restore.push(()=>{if(owner[key]===wrapped)owner[key]=original;});
  }
 }
 const gpu=installStreamGpuTimer(world),supported=PerformanceObserver.supportedEntryTypes.includes('long-animation-frame');
 const observer=supported?new PerformanceObserver(list=>longFrames.push(...list.getEntries().map(e=>e.toJSON()))):null;
 globalThis.qaMainFrame=row=>{const info=world.renderer.info.render;frames.push({...row,quality:world.quality,simulationElapsed:world.state.elapsed,drawCalls:info.calls,triangles:info.triangles,points:info.points,lines:info.lines,createdChunks:world.chunkStream.stats.created});};globalThis.qaMainPhase=row=>phases.push(row);observer?.observe({type:'long-animation-frame'});
 let result;
 try{result=await run();}
 finally{for(const fn of restore.reverse())fn();gpu.stop();globalThis.qaMainFrame=previousFrame;globalThis.qaMainPhase=previousPhase;if(observer){longFrames.push(...observer.takeRecords().map(e=>e.toJSON()));observer.disconnect();}if(!result)await gpu.finish();}
 const gl=world.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
 return {...result,execution:{depthRegions,renderStages,renderStagesDropped,depthRequests,frames,phases,longFrames,farOperations,farOperationScope:'Synchronous invocation spans >=1ms; prepare measures only its synchronous prefix, not asynchronous completion. Nested spans must not be summed.',longFramesSupported:supported,gpu:await gpu.finish(),hardware:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,scope:'QA existing main callback CPU phases; GPU timer wraps WorldScene.render commands, includes pipeline bubbles. RAF/LoAF durations are not exclusive GPU work.'}};
}
