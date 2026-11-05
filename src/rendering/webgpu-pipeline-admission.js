// Serializes renderer compilation setup while allowing the draw loop to run
// during asynchronous pipeline creation. The owner must keep objects hidden
// until the returned promise resolves.
export function createWebGpuPipelineAdmission({renderer,scene,camera,onFatal=()=>{}}){
 if(!renderer?.backend?.isWebGPUBackend||typeof renderer.compileAsync!=='function'||!scene?.isScene||!camera?.isCamera||typeof onFatal!=='function')throw TypeError('Invalid pipeline admission');
 let closed=false,generation=0,tail=Promise.resolve(),cancel;
 const cancelled=new Promise(resolve=>{cancel=()=>resolve(Error('Pipeline admission cancelled'));});
 const lost=renderer.backend.device?.lost?.then(info=>Error('WebGPU device lost: '+(info?.message||info?.reason||'unknown')));
 function retire(error){if(!closed){closed=true;generation++;cancel();try{onFatal(error);}catch{}}}
 return {
  prepare(object,{signal}={}){
   if(closed)return Promise.reject(Error('Pipeline admission closed'));
   if(!object?.isObject3D)return Promise.reject(TypeError('Invalid admission object'));
   if(signal!==undefined&&typeof signal?.addEventListener!=='function')return Promise.reject(TypeError('Invalid admission signal'));
   const version=generation;
   const task=tail.then(async()=>{
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
    if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
    // compileAsync builds its render list before its first await. Restore the
    // visibility immediately, before any subsequent frame can render it.
    const visible=object.visible,previousTarget=renderer.getRenderTarget?.(),face=renderer.getActiveCubeFace?.(),level=renderer.getActiveMipmapLevel?.(),culling=[];let pending;
    try{
     // Three's ordinary render may use an intermediate output target; compile
     // for that same target, and restore state before the draw loop resumes.
     const target=renderer._getFrameBufferTarget?.()??previousTarget??renderer.getOutputRenderTarget?.();
     if(target)renderer.setRenderTarget(target);
     object.traverse(node=>{if(node.isMesh||node.isLine||node.isPoints){culling.push([node,node.frustumCulled]);node.frustumCulled=false;}});
     object.visible=true;pending=renderer.compileAsync(object,camera,scene);
    }finally{
     object.visible=visible;
     for(const [node,value] of culling)node.frustumCulled=value;
     if(previousTarget!==undefined)renderer.setRenderTarget(previousTarget,face,level);
    }
    let onAbort;const aborted=signal?new Promise(resolve=>{onAbort=()=>resolve(new DOMException('Pipeline admission cancelled','AbortError'));signal.addEventListener('abort',onAbort,{once:true});if(signal.aborted)onAbort();}):null;
    const compilation=Promise.resolve(pending);compilation.catch(error=>{if(signal?.aborted)retire(error);});
    let error;try{error=await Promise.race([compilation.then(()=>null),cancelled,...(lost?[lost]:[]),...(aborted?[aborted]:[])]);}finally{if(onAbort)signal.removeEventListener('abort',onAbort);}
    if(error)throw error;
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
   }).catch(error=>{
    // Three r180 can retain an unsuccessful pipeline in its internal cache.
    // Never let this renderer publish or retry with that cache: its owner must
    // retire the presentation and rebuild it using a fresh renderer.
    if(!closed&&!signal?.aborted)retire(error);
    throw error;
   });
   tail=task.catch(()=>{});
   return task;
  },
  dispose(){if(closed)return;closed=true;generation++;cancel();},
 };
}
