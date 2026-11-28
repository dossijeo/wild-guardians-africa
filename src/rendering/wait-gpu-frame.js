import {waitGpuPreparation} from './wait-gpu-preparation.js';

// One actual frame, with cancellation/deadline checks independent of RAF.
// An injected frame source owns its own cancellation; the default RAF is ours.
export async function waitGpuFrame({check,nextFrame,signal,pollIntervalMs=100}={}) {
 let handle;
 check();
 try{
  const pending=nextFrame?nextFrame():new Promise(resolve=>{handle=requestAnimationFrame(()=>{handle=undefined;resolve();});});
  await waitGpuPreparation(pending,{check,nextFrame:()=>pending,signal,pollIntervalMs});
 }finally{if(handle!==undefined)cancelAnimationFrame(handle);}
}
