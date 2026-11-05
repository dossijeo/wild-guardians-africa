// Serializes renderer compilation setup while allowing the draw loop to run
// during asynchronous pipeline creation. The owner must keep objects hidden
// until the returned promise resolves.
export function createWebGpuPipelineAdmission({renderer,scene,camera}){
 if(!renderer?.backend?.isWebGPUBackend||typeof renderer.compileAsync!=='function'||!scene?.isScene||!camera?.isCamera)throw TypeError('Invalid pipeline admission');
 let closed=false,generation=0,tail=Promise.resolve(),cancel;
 const cancelled=new Promise(resolve=>{cancel=()=>resolve(Error('Pipeline admission cancelled'));});
 const lost=renderer.backend.device?.lost?.then(info=>Error('WebGPU device lost: '+(info?.message||info?.reason||'unknown')));
 return {
  prepare(object){
   if(closed)return Promise.reject(Error('Pipeline admission closed'));
   if(!object?.isObject3D)return Promise.reject(TypeError('Invalid admission object'));
   const version=generation;
   const task=tail.then(async()=>{
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
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
    const error=await Promise.race([Promise.resolve(pending).then(()=>null),cancelled,...(lost?[lost]:[])]);
    if(error)throw error;
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
   });
   tail=task.catch(()=>{});
   return task;
  },
  dispose(){if(closed)return;closed=true;generation++;cancel();},
 };
}
