// Capture the structural inputs owned by the requesting object. Attribute
// contents, transforms and uniforms are deliberately excluded: they can vary
// while the same pipeline is compiling. Material changes must use needsUpdate.
function pipelineInputs(object,target){
 const values=[target,target?.samples,target?.depthBuffer,target?.stencilBuffer,target?.texture?.format,target?.texture?.type,target?.texture?.colorSpace];
 function attributeLayout(attribute){
  // BufferAttribute identity alone is insufficient: its array or instancing
  // layout can change while compileAsync is pending. Content changes remain
  // deliberately excluded so ordinary updates do not cause recompilation.
  values.push(attribute,attribute?.array?.constructor,attribute?.itemSize,attribute?.normalized,attribute?.gpuType,attribute?.offset,attribute?.data?.stride,attribute?.isInstancedBufferAttribute,attribute?.data?.isInstancedInterleavedBuffer,attribute?.meshPerAttribute,attribute?.data?.meshPerAttribute);
 }
 object.traverse(node=>{
  values.push(node,node.parent,node.visible,node.castShadow,node.receiveShadow);
  if(!(node.isMesh||node.isLine||node.isPoints))return;
  const geometry=node.geometry,materials=Array.isArray(node.material)?node.material:[node.material];
  values.push(geometry,node.isInstancedMesh,node.isSkinnedMesh,node.skeleton?.bones?.length,materials.length);
  attributeLayout(geometry?.index);
  for(const material of materials)values.push(material,material?.version);
  for(const [name,attribute] of Object.entries(geometry?.attributes??{}).sort(([a],[b])=>a.localeCompare(b))){values.push(name);attributeLayout(attribute);}
  for(const [name,attributes] of Object.entries(geometry?.morphAttributes??{}).sort(([a],[b])=>a.localeCompare(b))){values.push(name,attributes.length);for(const attribute of attributes)attributeLayout(attribute);}
  values.push(geometry?.morphTargetsRelative);
 });
 return values;
}
function sameInputs(a,b){return a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));}

// Serializes renderer compilation setup while allowing the draw loop to run
// during asynchronous pipeline creation. The owner must keep objects hidden
// until the returned promise resolves.
export function createWebGpuPipelineAdmission({renderer,scene,camera,onFatal=()=>{},shadowLights=null,includeShadowPass=false}){
 if(!renderer?.backend?.isWebGPUBackend||typeof renderer.compileAsync!=='function'||!scene?.isScene||!camera?.isCamera||typeof onFatal!=='function'||shadowLights!==null&&!Array.isArray(shadowLights)||typeof includeShadowPass!=='boolean'||includeShadowPass&&typeof renderer.compileShadowAsync!=='function')throw TypeError('Invalid pipeline admission');
 const lights=new Map();let lightsRevision=0;
 function addLight(light){if(!light?.isLight||!light.shadow)throw TypeError('Invalid admission shadow light');const count=lights.get(light)??0;lights.set(light,count+1);if(count===0)lightsRevision++;}
 if(shadowLights===null)scene.traverse(node=>{if(node.isLight&&node.shadow)addLight(node);});else for(const light of shadowLights)addLight(light);
 let closed=false,generation=0,active=false,inflightCompiles=0,cancel;const queue=[],targetWaiters=new Set(),compilingObjects=new Map();
 function frameTarget(){return renderer._getFrameBufferTarget?.()??renderer.getRenderTarget?.()??renderer.getOutputRenderTarget?.()??null;}
 const cancelled=new Promise(resolve=>{cancel=()=>resolve(Error('Pipeline admission cancelled'));});
 const lost=renderer.backend.device?.lost?.then(info=>Error('WebGPU device lost: '+(info?.message||info?.reason||'unknown')));
 function rejectWaiting(error){for(const item of queue.splice(0)){if(item.onAbort)item.signal.removeEventListener('abort',item.onAbort);item.reject(error);}}
 function retire(error){if(!closed){closed=true;generation++;cancel();lights.clear();rejectWaiting(Error('Pipeline admission closed'));try{onFatal(error);}catch{}}}
 function notifyShadowTargets(){for(const waiter of targetWaiters)if(waiter.ready())waiter.resolve();}
 function enqueue(item){
  if(closed||item.version!==generation){item.reject(Error('Pipeline admission cancelled'));return;}
  if(item.signal?.aborted){item.reject(new DOMException('Pipeline admission cancelled','AbortError'));return;}
  if(item.signal){item.onAbort=()=>{const index=queue.indexOf(item);if(index<0)return;queue.splice(index,1);item.signal.removeEventListener('abort',item.onAbort);item.reject(new DOMException('Pipeline admission cancelled','AbortError'));};item.signal.addEventListener('abort',item.onAbort,{once:true});}
  queue.push(item);if(item.signal?.aborted)item.onAbort();else queueMicrotask(pump);
 }
 function pump(){
  if(closed||active||inflightCompiles||!queue.length)return;
  const item=queue.shift();if(item.onAbort)item.signal.removeEventListener('abort',item.onAbort);active=true;
  execute(item.object,item.signal,item.version,item.include).then(result=>{
   if(!result?.shadowTarget){item.resolve();return;}
   // Waiting for the ordinary world frame must not hold the renderer queue:
   // a later receiver may itself be needed to create that shadow target.
   result.shadowTarget.then(()=>enqueue(item),error=>{if(!closed&&!item.signal?.aborted)retire(error);item.reject(error);});
  },item.reject).finally(()=>{active=false;pump();});
 }
 async function waitForCompilation(pending,signal,{serial=false,object=null}={}){
  let onAbort;const aborted=signal?new Promise(resolve=>{onAbort=()=>resolve(new DOMException('Pipeline admission cancelled','AbortError'));signal.addEventListener('abort',onAbort,{once:true});if(signal.aborted)onAbort();}):null;
  const compilation=Promise.resolve(pending);
  // Abort cancels publication, not Three's pending compilation. Keep the
  // renderer queue locked until that work settles; otherwise a cancelled
  // compile can overlap a new request or poison its cache afterwards.
  if(serial){inflightCompiles++;const deferred=[];compilingObjects.set(object,deferred);const finish=error=>{if(error&&signal?.aborted)retire(error);compilingObjects.delete(object);for(const release of deferred){try{release();}catch(error){retire(error);}}inflightCompiles--;pump();};compilation.then(()=>finish(null),finish);}
  else compilation.catch(error=>{if(signal?.aborted)retire(error);});
  let error;try{error=await Promise.race([compilation.then(()=>null),cancelled,...(lost?[lost]:[]),...(aborted?[aborted]:[])]);}finally{if(onAbort)signal.removeEventListener('abort',onAbort);}
  if(error)throw error;
 }
 async function waitForShadowTarget(light,signal,lightVersion){
  if(light.shadow.map||!light.castShadow||!light.visible||lightVersion!==lightsRevision)return;
  let resolve;const pending=new Promise(done=>{resolve=done;}),waiter={resolve,ready:()=>!!light.shadow.map||!light.castShadow||!light.visible||lightVersion!==lightsRevision};
  targetWaiters.add(waiter);notifyShadowTargets();
  try{await waitForCompilation(pending,signal);}finally{targetWaiters.delete(waiter);}
 }
 async function execute(object,signal,version,include){
  try{
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
    if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
    if(renderer._initialized===false||renderer._isDeviceLost===true)throw Error('WebGPU renderer unavailable for pipeline admission');
    // compileAsync builds its render list before its first await. Restore the
    // visibility immediately, before any subsequent frame can render it.
    const lightVersion=lightsRevision,lightState=[...lights.keys()].map(light=>[light,light.castShadow,light.visible]),lightsChanged=()=>lightVersion!==lightsRevision||lightState.some(([light,castShadow,visible])=>light.castShadow!==castShadow||light.visible!==visible),visible=object.visible,previousTarget=renderer.getRenderTarget?.(),face=renderer.getActiveCubeFace?.(),level=renderer.getActiveMipmapLevel?.(),culling=[],shadows=[],included=include.map(node=>[node,node.visible]);let pending,target,inputs;
    try{
     // Three's ordinary render may use an intermediate output target; compile
     // for that same target, and restore state before the draw loop resumes.
     target=frameTarget();
     inputs=pipelineInputs(object,target);
     if(target)renderer.setRenderTarget(target);
     // Three r180 updates shadow nodes during compileAsync. Prevent that
     // setup from issuing a real shadow draw while keeping shadow features in
     // the shader graph; restore all flags before the next visible frame.
     for(const light of lights.keys()){const shadow=light.shadow;shadows.push([shadow,shadow.autoUpdate,shadow.needsUpdate]);shadow.autoUpdate=false;shadow.needsUpdate=false;}
     object.traverse(node=>{if(node.isMesh||node.isLine||node.isPoints){culling.push([node,node.frustumCulled]);node.frustumCulled=false;}});
     for(const [node] of included)node.visible=true;object.visible=true;pending=renderer.compileAsync(object,camera,scene);
    }finally{
     object.visible=visible;
     for(const [node,value] of included)node.visible=value;
     for(const [node,value] of culling)node.frustumCulled=value;
     for(const [shadow,autoUpdate,needsUpdate] of shadows){shadow.autoUpdate=autoUpdate;shadow.needsUpdate=needsUpdate;}
     if(previousTarget!==undefined)renderer.setRenderTarget(previousTarget,face,level);
    }
    await waitForCompilation(pending,signal,{serial:true,object});
    if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
    if(renderer._isDeviceLost===true)throw Error('WebGPU device lost during pipeline admission');
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
    // A light may have been added or removed while the driver compiled. The
    // completed pipeline describes the old scene and cannot admit the object.
    if(lightsChanged()||!sameInputs(inputs,pipelineInputs(object,frameTarget())))return execute(object,signal,version,include);
    const preparedShadowTargets=[];
    if(includeShadowPass){
     let castsShadow=false;object.traverse(node=>{if((node.isMesh||node.isLine||node.isPoints)&&node.castShadow)castsShadow=true;});
     if(castsShadow){
      for(const light of lights.keys()){
       if(!light.castShadow||!light.visible)continue;
       if(!light.shadow.map)return {shadowTarget:waitForShadowTarget(light,signal,lightVersion)};
       if(closed||version!==generation)throw Error('Pipeline admission cancelled');
       if(lightsChanged())return execute(object,signal,version,include);
       if(!light.castShadow||!light.visible)continue;
       const target=light.shadow.map,visible=object.visible,culling=[],shadows=[];let shadowPending;
       try{
        for(const current of lights.keys()){const shadow=current.shadow;shadows.push([shadow,shadow.autoUpdate,shadow.needsUpdate]);shadow.autoUpdate=false;shadow.needsUpdate=false;}
        object.traverse(node=>{if(node.isMesh||node.isLine||node.isPoints){culling.push([node,node.frustumCulled]);node.frustumCulled=false;}});
        for(const [node] of included)node.visible=true;object.visible=true;shadowPending=renderer.compileShadowAsync(object,scene,camera,light);
       }finally{
        object.visible=visible;for(const [node,value] of included)node.visible=value;for(const [node,value] of culling)node.frustumCulled=value;
        for(const [shadow,autoUpdate,needsUpdate] of shadows){shadow.autoUpdate=autoUpdate;shadow.needsUpdate=needsUpdate;}
       }
       await waitForCompilation(shadowPending,signal,{serial:true,object});
       if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
       if(renderer._isDeviceLost===true)throw Error('WebGPU device lost during shadow admission');
       if(closed||version!==generation)throw Error('Pipeline admission cancelled');
       if(lightsChanged()||target!==light.shadow.map||!sameInputs(inputs,pipelineInputs(object,frameTarget())))return execute(object,signal,version,include);
       preparedShadowTargets.push([light,target]);
      }
     }
    }
    // Three's compileAsync updates the render object's geometry and bindings,
    // submitting initial uploads, but does not wait for GPU queue completion.
    // Fence only work already submitted; the render loop continues normally.
    // Keep resource ownership until the fence settles even if publication is
    // cancelled, exactly as for an in-flight pipeline compilation.
    const queue=renderer.backend.device?.queue;
    if(typeof queue?.onSubmittedWorkDone==='function'){
     const submitted=Promise.resolve(queue.onSubmittedWorkDone()),deviceLost=renderer.backend.device.lost;
     const fence=deviceLost?Promise.race([submitted,deviceLost.then(info=>{throw Error('WebGPU device lost: '+(info?.message||info?.reason||'unknown'));})]):submitted;
     await waitForCompilation(fence,signal,{serial:true,object});
     if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
     if(renderer._isDeviceLost===true)throw Error('WebGPU device lost during resource admission');
     if(closed||version!==generation)throw Error('Pipeline admission cancelled');
     if(lightsChanged()||preparedShadowTargets.some(([light,target])=>light.shadow.map!==target)||!sameInputs(inputs,pipelineInputs(object,frameTarget())))return execute(object,signal,version,include);
    }
  }catch(error){
   // Three r180 may retain an unsuccessful pipeline in its internal cache.
   if(!closed&&!signal?.aborted)retire(error);
   throw error;
  }
 }
 return {
  // Removal is immediate; release of the resources used by an active
  // compilation waits until Three's compilation promise actually settles.
  deferRelease(object,release){if(!object?.isObject3D||typeof release!=='function')throw TypeError('Invalid deferred release');const deferred=compilingObjects.get(object);if(deferred)deferred.push(release);else release();},
  // Used at shutdown for shared resources that may belong to any active
  // object. This captures current compilations; callers must first stop new
  // admissions and resource creation.
  deferCompilations(release){if(typeof release!=='function')throw TypeError('Invalid deferred release');const pending=[...compilingObjects.values()];if(!pending.length){release();return;}let remaining=pending.length;for(const list of pending)list.push(()=>{if(--remaining===0)release();});},
  registerShadowLight(light){if(closed)throw Error('Pipeline admission closed');addLight(light);notifyShadowTargets();let released=false;return ()=>{if(released)return;released=true;const count=lights.get(light)??0;if(count===1){lights.delete(light);lightsRevision++;notifyShadowTargets();}else if(count>1)lights.set(light,count-1);};},
  notifyShadowTargets,
  prepare(object,{signal,include=[]}={}){
   if(closed)return Promise.reject(Error('Pipeline admission closed'));
   if(!object?.isObject3D)return Promise.reject(TypeError('Invalid admission object'));
   if(!Array.isArray(include)||include.some(node=>{if(!node?.isObject3D||node===object)return true;for(let parent=node.parent;parent;parent=parent.parent)if(parent===object)return false;return true;}))return Promise.reject(TypeError('Invalid admission visibility'));
   if(signal!==undefined&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))return Promise.reject(TypeError('Invalid admission signal'));
   if(signal?.aborted)return Promise.reject(new DOMException('Pipeline admission cancelled','AbortError'));
   return new Promise((resolve,reject)=>enqueue({object,signal,include:[...new Set(include)],version:generation,resolve,reject,onAbort:null}));
  },
  dispose(){if(closed)return;closed=true;generation++;cancel();lights.clear();rejectWaiting(Error('Pipeline admission cancelled'));},
 };
}
