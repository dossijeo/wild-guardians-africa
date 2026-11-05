// Serializes renderer compilation setup while allowing the draw loop to run
// during asynchronous pipeline creation. The owner must keep objects hidden
// until the returned promise resolves.
export function createWebGpuPipelineAdmission({renderer,scene,camera,onFatal=()=>{},shadowLights=null}){
 if(!renderer?.backend?.isWebGPUBackend||typeof renderer.compileAsync!=='function'||!scene?.isScene||!camera?.isCamera||typeof onFatal!=='function'||shadowLights!==null&&!Array.isArray(shadowLights))throw TypeError('Invalid pipeline admission');
 const lights=new Map();
 function addLight(light){if(!light?.isLight||!light.shadow)throw TypeError('Invalid admission shadow light');lights.set(light,(lights.get(light)??0)+1);}
 if(shadowLights===null)scene.traverse(node=>{if(node.isLight&&node.shadow)addLight(node);});else for(const light of shadowLights)addLight(light);
 let closed=false,generation=0,active=false,cancel;const queue=[];
 const cancelled=new Promise(resolve=>{cancel=()=>resolve(Error('Pipeline admission cancelled'));});
 const lost=renderer.backend.device?.lost?.then(info=>Error('WebGPU device lost: '+(info?.message||info?.reason||'unknown')));
 function rejectWaiting(error){for(const item of queue.splice(0)){if(item.onAbort)item.signal.removeEventListener('abort',item.onAbort);item.reject(error);}}
 function retire(error){if(!closed){closed=true;generation++;cancel();lights.clear();rejectWaiting(Error('Pipeline admission closed'));try{onFatal(error);}catch{}}}
 function pump(){
  if(closed||active||!queue.length)return;
  const item=queue.shift();if(item.onAbort)item.signal.removeEventListener('abort',item.onAbort);active=true;
  execute(item.object,item.signal,item.version).then(item.resolve,item.reject).finally(()=>{active=false;pump();});
 }
 async function execute(object,signal,version){
  try{
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
    if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
    if(renderer._initialized===false||renderer._isDeviceLost===true)throw Error('WebGPU renderer unavailable for pipeline admission');
    // compileAsync builds its render list before its first await. Restore the
    // visibility immediately, before any subsequent frame can render it.
    const visible=object.visible,previousTarget=renderer.getRenderTarget?.(),face=renderer.getActiveCubeFace?.(),level=renderer.getActiveMipmapLevel?.(),culling=[],shadows=[];let pending;
    try{
     // Three's ordinary render may use an intermediate output target; compile
     // for that same target, and restore state before the draw loop resumes.
     const target=renderer._getFrameBufferTarget?.()??previousTarget??renderer.getOutputRenderTarget?.();
     if(target)renderer.setRenderTarget(target);
     // Three r180 updates shadow nodes during compileAsync. Prevent that
     // setup from issuing a real shadow draw while keeping shadow features in
     // the shader graph; restore all flags before the next visible frame.
     for(const light of lights.keys()){const shadow=light.shadow;shadows.push([shadow,shadow.autoUpdate,shadow.needsUpdate]);shadow.autoUpdate=false;shadow.needsUpdate=false;}
     object.traverse(node=>{if(node.isMesh||node.isLine||node.isPoints){culling.push([node,node.frustumCulled]);node.frustumCulled=false;}});
     object.visible=true;pending=renderer.compileAsync(object,camera,scene);
    }finally{
     object.visible=visible;
     for(const [node,value] of culling)node.frustumCulled=value;
     for(const [shadow,autoUpdate,needsUpdate] of shadows){shadow.autoUpdate=autoUpdate;shadow.needsUpdate=needsUpdate;}
     if(previousTarget!==undefined)renderer.setRenderTarget(previousTarget,face,level);
    }
    let onAbort;const aborted=signal?new Promise(resolve=>{onAbort=()=>resolve(new DOMException('Pipeline admission cancelled','AbortError'));signal.addEventListener('abort',onAbort,{once:true});if(signal.aborted)onAbort();}):null;
    const compilation=Promise.resolve(pending);compilation.catch(error=>{if(signal?.aborted)retire(error);});
    let error;try{error=await Promise.race([compilation.then(()=>null),cancelled,...(lost?[lost]:[]),...(aborted?[aborted]:[])]);}finally{if(onAbort)signal.removeEventListener('abort',onAbort);}
    if(error)throw error;
    if(renderer._isDeviceLost===true)throw Error('WebGPU device lost during pipeline admission');
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
  }catch(error){
   // Three r180 may retain an unsuccessful pipeline in its internal cache.
   if(!closed&&!signal?.aborted)retire(error);
   throw error;
  }
 }
 return {
  registerShadowLight(light){if(closed)throw Error('Pipeline admission closed');addLight(light);let released=false;return ()=>{if(released)return;released=true;const count=lights.get(light)??0;if(count<=1)lights.delete(light);else lights.set(light,count-1);};},
  prepare(object,{signal}={}){
   if(closed)return Promise.reject(Error('Pipeline admission closed'));
   if(!object?.isObject3D)return Promise.reject(TypeError('Invalid admission object'));
   if(signal!==undefined&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))return Promise.reject(TypeError('Invalid admission signal'));
   if(signal?.aborted)return Promise.reject(new DOMException('Pipeline admission cancelled','AbortError'));
   return new Promise((resolve,reject)=>{
    const item={object,signal,version:generation,resolve,reject,onAbort:null};
    if(signal){item.onAbort=()=>{const index=queue.indexOf(item);if(index<0)return;queue.splice(index,1);signal.removeEventListener('abort',item.onAbort);reject(new DOMException('Pipeline admission cancelled','AbortError'));};signal.addEventListener('abort',item.onAbort,{once:true});}
    queue.push(item);if(signal?.aborted)item.onAbort();else queueMicrotask(pump);
   });
  },
  dispose(){if(closed)return;closed=true;generation++;cancel();lights.clear();rejectWaiting(Error('Pipeline admission cancelled'));},
 };
}
