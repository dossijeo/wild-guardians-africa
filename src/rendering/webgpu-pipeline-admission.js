// Serializes renderer compilation setup while allowing the draw loop to run
// during asynchronous pipeline creation. The owner must keep objects hidden
// until the returned promise resolves.
export function createWebGpuPipelineAdmission({renderer,scene,camera}){
 if(!renderer?.backend?.isWebGPUBackend||typeof renderer.compileAsync!=='function'||!scene?.isScene||!camera?.isCamera)throw TypeError('Invalid pipeline admission');
 let closed=false,generation=0,tail=Promise.resolve();
 return {
  prepare(object){
   if(closed)return Promise.reject(Error('Pipeline admission closed'));
   if(!object?.isObject3D)return Promise.reject(TypeError('Invalid admission object'));
   const version=generation;
   const task=tail.then(async()=>{
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
    // compileAsync builds its render list before its first await. Restore the
    // visibility immediately, before any subsequent frame can render it.
    const visible=object.visible;let pending;
    try{object.visible=true;pending=renderer.compileAsync(object,camera,scene);}finally{object.visible=visible;}
    await pending;
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
   });
   tail=task.catch(()=>{});
   return task;
  },
  dispose(){if(closed)return;closed=true;generation++;},
 };
}
