import {installStreamGpuTimer} from './spatial-stream-gpu-timer.js';
// QA only: existing RAF callbacks and asynchronous GPU queries, no new RAF.
export async function observeQualityExecution(world,run){
 const frames=[],phases=[],longFrames=[],previousFrame=globalThis.qaMainFrame,previousPhase=globalThis.qaMainPhase;
 const farOperations=[],restore=[];
 if(world.biomeGround){
  const owner=world.biomeGround,original=owner.uniforms;
  const wrapped=function(...args){const at=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-at;if(ms>=1&&farOperations.length<10000)farOperations.push({label:'groundUniforms',mapped:args[3]?.mapped!==false,cx:args[0],cz:args[1],at,ms});}};
  owner.uniforms=wrapped;restore.push(()=>{if(owner.uniforms===wrapped)owner.uniforms=original;});
 }
 for(const [slot,adapter] of (world.farVegetation?.adapters??[]).entries()){
  for(const [owner,key] of [[adapter.layer,'selectTrees'],[adapter.layer,'create'],[adapter.layer,'attachData'],[adapter.layer,'prepare'],[adapter.layer.transitions,'bind']]){
   const original=owner[key];if(typeof original!=='function')continue;
   const wrapped=function(...args){const at=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-at;if(ms>=1&&farOperations.length<10000)farOperations.push({slot,label:key,at,ms});}};
   owner[key]=wrapped;restore.push(()=>{if(owner[key]===wrapped)owner[key]=original;});
  }
 }
 const gpu=installStreamGpuTimer(world),supported=PerformanceObserver.supportedEntryTypes.includes('long-animation-frame');
 const observer=supported?new PerformanceObserver(list=>longFrames.push(...list.getEntries().map(e=>e.toJSON()))):null;
 globalThis.qaMainFrame=row=>frames.push(row);globalThis.qaMainPhase=row=>phases.push(row);observer?.observe({type:'long-animation-frame'});
 let result;
 try{result=await run();}
 finally{for(const fn of restore.reverse())fn();gpu.stop();globalThis.qaMainFrame=previousFrame;globalThis.qaMainPhase=previousPhase;if(observer){longFrames.push(...observer.takeRecords().map(e=>e.toJSON()));observer.disconnect();}if(!result)await gpu.finish();}
 const gl=world.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
 return {...result,execution:{frames,phases,longFrames,farOperations,farOperationScope:'Synchronous invocation spans >=1ms; prepare measures only its synchronous prefix, not asynchronous completion. Nested spans must not be summed.',longFramesSupported:supported,gpu:await gpu.finish(),hardware:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,scope:'QA existing main callback CPU phases; GPU timer wraps WorldScene.render commands, includes pipeline bubbles. RAF/LoAF durations are not exclusive GPU work.'}};
}
