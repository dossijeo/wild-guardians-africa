// A single resource upload, never awaited by the render loop. Three's
// initTexture submits work synchronously; completion is a queue-wide WebGPU
// signal and does not by itself prove a hitch-free first draw.
export async function prepareWebGpuTexture({renderer,texture,signal,release}={}){
 const device=renderer?.backend?.device,queue=device?.queue;if(!renderer?.backend?.isWebGPUBackend||typeof renderer.initTexture!=='function'||!texture?.isTexture||typeof queue?.onSubmittedWorkDone!=='function'||typeof release!=='function')throw TypeError('Invalid WebGPU texture preparation');
 if(signal?.aborted){release();throw new DOMException('Texture preparation cancelled','AbortError');}
 let submitted=null,abortListener,transferred=false,released=false;const free=()=>{if(!released){released=true;release();}};
 try{
  renderer.initTexture(texture);submitted=Promise.resolve(queue.onSubmittedWorkDone());const lost=device.lost?.then(info=>{throw Error('WebGPU device lost: '+(info?.message||info?.reason||'unknown'));}),aborted=signal?new Promise((_,reject)=>{abortListener=()=>reject(new DOMException('Texture preparation cancelled','AbortError'));signal.addEventListener('abort',abortListener,{once:true});if(signal.aborted)abortListener();}):null;
  await Promise.race([submitted,...(lost?[lost]:[]),...(aborted?[aborted]:[])]);if(signal?.aborted)throw new DOMException('Texture preparation cancelled','AbortError');transferred=true;
 }finally{
  if(abortListener)signal.removeEventListener('abort',abortListener);
  if(!transferred){if(submitted){const settled=submitted.then(()=>null,()=>null),loss=device.lost?.then(()=>null,()=>null);void Promise.race([settled,...(loss?[loss]:[])]).then(free);}else free();}
 }
}
