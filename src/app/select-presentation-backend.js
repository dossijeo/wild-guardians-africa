// Preflight before creating either world. An adapter does not guarantee that
// device creation or WebGPU in an OffscreenCanvas Worker will succeed later.
export async function selectPresentationBackend({requested='legacy',gpu=globalThis.navigator?.gpu,workerAvailable=typeof Worker!=='undefined',offscreenAvailable=typeof OffscreenCanvas!=='undefined'&&typeof HTMLCanvasElement!=='undefined'&&typeof HTMLCanvasElement.prototype.transferControlToOffscreen==='function',timeoutMs=4000}={}){
 if(!['legacy','webgpu-worker'].includes(requested)||typeof workerAvailable!=='boolean'||typeof offscreenAvailable!=='boolean'||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw TypeError('Invalid backend selection');
 if(requested==='legacy')return {backend:'legacy',reason:null};
 if(!workerAvailable||!offscreenAvailable)return {backend:'legacy',reason:'worker-canvas-unavailable'};
 if(typeof gpu?.requestAdapter!=='function')return {backend:'legacy',reason:'webgpu-unavailable'};
 let timer;try{const adapter=await Promise.race([Promise.resolve().then(()=>gpu.requestAdapter()),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),timeoutMs);})]);return adapter?{backend:'webgpu-worker',reason:null}:{backend:'legacy',reason:'adapter-unavailable'};}catch{return {backend:'legacy',reason:'adapter-unavailable'};}finally{clearTimeout(timer);}
}
