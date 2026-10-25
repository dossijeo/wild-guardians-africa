import {installStreamGpuTimer} from './spatial-stream-gpu-timer.js';
// QA only: existing RAF callbacks and asynchronous GPU queries, no new RAF.
export async function observeQualityExecution(world,run){
 const frames=[],phases=[],longFrames=[],previousFrame=globalThis.qaMainFrame,previousPhase=globalThis.qaMainPhase;
 const gpu=installStreamGpuTimer(world),supported=PerformanceObserver.supportedEntryTypes.includes('long-animation-frame');
 const observer=supported?new PerformanceObserver(list=>longFrames.push(...list.getEntries().map(e=>e.toJSON()))):null;
 globalThis.qaMainFrame=row=>frames.push(row);globalThis.qaMainPhase=row=>phases.push(row);observer?.observe({type:'long-animation-frame'});
 let result;
 try{result=await run();}
 finally{gpu.stop();globalThis.qaMainFrame=previousFrame;globalThis.qaMainPhase=previousPhase;if(observer){longFrames.push(...observer.takeRecords().map(e=>e.toJSON()));observer.disconnect();}if(!result)await gpu.finish();}
 const gl=world.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
 return {...result,execution:{frames,phases,longFrames,longFramesSupported:supported,gpu:await gpu.finish(),hardware:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,scope:'QA existing main callback CPU phases; GPU timer wraps WorldScene.render commands, includes pipeline bubbles. RAF/LoAF durations are not exclusive GPU work.'}};
}
