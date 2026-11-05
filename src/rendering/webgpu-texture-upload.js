// A single resource upload, never awaited by the render loop. Three's
// initTexture submits work synchronously; completion is a queue-wide WebGPU
// signal and does not by itself prove a hitch-free first draw.
export function releaseAfterWebGpuUploads(renderer,release){
 const device=renderer?.backend?.device;if(!renderer?.backend?.isWebGPUBackend||typeof device?.queue?.onSubmittedWorkDone!=='function'||typeof release!=='function')throw TypeError('Invalid WebGPU upload release');
 let submitted;try{submitted=Promise.resolve(device.queue.onSubmittedWorkDone());}catch(error){submitted=Promise.reject(error);}
 // Rejection or device loss also ends ownership of the submitted work. The
 // release must happen once, even if both signals settle independently.
 const settled=submitted.then(()=>null,()=>null),lost=device.lost?.then(()=>null,()=>null);
 return Promise.race([settled,...(lost?[lost]:[])]).then(release);
}

// Owners stop creating work before calling this. Compilation and uploads may
// settle in either order; neither is allowed to free their shared resources.
export function releaseAfterWebGpuWork({renderer,admission=null,uploadsPending=false,release,onError=()=>{}}={}){
 if(typeof uploadsPending!=='boolean'||typeof release!=='function'||typeof onError!=='function')throw TypeError('Invalid WebGPU resource release');
 let compilationDone=typeof admission?.deferCompilations!=='function',uploadDone=!uploadsPending,released=false;
 const finish=()=>{if(compilationDone&&uploadDone&&!released){released=true;release();}};
 if(!compilationDone)admission.deferCompilations(()=>{compilationDone=true;finish();});
 if(uploadsPending)void releaseAfterWebGpuUploads(renderer,()=>{uploadDone=true;finish();}).catch(onError);
 finish();
}

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
