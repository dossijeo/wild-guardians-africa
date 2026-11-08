import {webGpuTextureBinding} from './webgpu-texture-binding.js';
import {compileWithAdmissionSceneLighting} from './webgpu-admission-scene.js';

// Three r180 includes public material properties and texture sampler layouts
// in its render-object key, even when material.version has not changed.
function materialInputs(material,values){
 if(!material)return;
 const keys=Object.keys(material);for(let proto=Object.getPrototypeOf(material);proto;proto=Object.getPrototypeOf(proto))for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(proto)))if(typeof descriptor.get==='function')keys.push(key);
 values.push(material.customProgramCacheKey?.());
 for(const key of keys){if(/^(is[A-Z]|_)|^(visible|version|uuid|name|opacity|userData)$/.test(key))continue;const value=material[key];values.push(key);if(value===null)values.push(null);else if(typeof value==='number')values.push(value!==0);else if(typeof value==='object'){values.push('object');if(value?.isTexture)values.push('texture',...webGpuTextureBinding(value),value.mapping,value.magFilter,value.minFilter,value.wrapS,value.wrapT,value.wrapR,value.colorSpace,value.channel,value.anisotropy);}else values.push(String(value));}
 // Fixed-function state can distinguish different nonzero numeric values.
 for(const key of ['side','shadowSide','blending','blendSrc','blendDst','blendEquation','blendSrcAlpha','blendDstAlpha','blendEquationAlpha','depthFunc','stencilFunc','stencilFail','stencilZFail','stencilZPass'])values.push(material[key]);
}
// Capture structural inputs. Attribute contents, transforms and ordinary
// uniforms can vary while the same pipeline is compiling.
function renderPassInputs(target,camera,renderer){
 return [camera,camera?.layers?.mask,renderer.toneMapping,renderer.outputColorSpace,renderer.samples,renderer.depth,renderer.stencil,renderer.shadowMap?.enabled,renderer.shadowMap?.type,renderer.localClippingEnabled,renderer.clippingPlanes?.length,target,target?.samples,target?.depthBuffer,target?.stencilBuffer,target?.texture?.format,target?.texture?.type,target?.texture?.colorSpace,target?.depthTexture,target?.depthTexture?.format,target?.depthTexture?.type];
}
function pipelineInputs(object,target,camera,renderer,include=[],attachedRootParent=undefined){
 const included=new Set(include);
 const values=renderPassInputs(target,camera,renderer);
 function attributeLayout(attribute){
  // BufferAttribute identity alone is insufficient: its array or instancing
  // layout can change while compileAsync is pending. Content changes remain
  // deliberately excluded so ordinary updates do not cause recompilation.
  values.push(attribute,attribute?.array?.constructor,attribute?.itemSize,attribute?.normalized,attribute?.gpuType,attribute?.offset,attribute?.data?.stride,attribute?.isInstancedBufferAttribute,attribute?.data?.isInstancedInterleavedBuffer,attribute?.meshPerAttribute,attribute?.data?.meshPerAttribute);
 }
 object.traverse(node=>{
  values.push(node,node===object&&attachedRootParent!==undefined?attachedRootParent:node.parent,included.has(node)?true:node.visible,node.layers.mask,node.castShadow,node.receiveShadow);
  if(!(node.isMesh||node.isLine||node.isPoints))return;
  const geometry=node.geometry,materials=Array.isArray(node.material)?node.material:[node.material];
  values.push(geometry,node.isInstancedMesh,node.isSkinnedMesh,node.skeleton?.bones?.length,materials.length);
  attributeLayout(geometry?.index);
  // Three builds separate render-list entries for visible materials selected
  // by geometry groups. These can change without bumping material.version.
  for(const material of materials){values.push(material,material?.version,material?.visible);if(renderer._wgMaterialKeys?.admissionInputs)values.push(renderer._wgMaterialKeys.admissionInputs(material,()=>{const inputs=[];materialInputs(material,inputs);return inputs;}));else materialInputs(material,values);}
  if(Array.isArray(node.material)){values.push(geometry?.groups?.length);for(const group of geometry?.groups??[])values.push(group.start,group.count,group.materialIndex);}
  for(const [name,attribute] of Object.entries(geometry?.attributes??{}).sort(([a],[b])=>a.localeCompare(b))){values.push(name);attributeLayout(attribute);}
  for(const [name,attributes] of Object.entries(geometry?.morphAttributes??{}).sort(([a],[b])=>a.localeCompare(b))){values.push(name,attributes.length);for(const attribute of attributes)attributeLayout(attribute);}
  values.push(geometry?.morphTargetsRelative);
 });
 return values;
}
function sameInputs(a,b){return a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));}

// Alternatives are applied only while Three builds its render list. The live
// object keeps its published materials across every asynchronous wait.
function withMaterialAlternatives(alternatives,fn){
 if(!alternatives.length)return fn();
 if(alternatives.some(item=>{if(item.mesh.material!==item.original)return true;for(let node=item.mesh;node;node=node.parent)if(node===item.root)return false;return true;}))throw Object.assign(Error('Admission material ownership changed'),{code:'admission-stale'});
 for(const item of alternatives)item.mesh.material=item.material;
 try{return fn();}finally{let stale=false;for(const item of alternatives){if(item.mesh.material===item.material)item.mesh.material=item.original;else stale=true;}if(stale)throw Object.assign(Error('Admission material ownership changed'),{code:'admission-stale'});}
}

// Serializes renderer compilation setup while allowing the draw loop to run
// during asynchronous pipeline creation. The owner must keep objects hidden
// until the returned promise resolves.
export function createWebGpuPipelineAdmission({renderer,scene,camera,onFatal=()=>{},shadowLights=null,includeShadowPass=false,sharedSceneLighting=false}){
 if(!renderer?.backend?.isWebGPUBackend||typeof renderer.compileAsync!=='function'||!scene?.isScene||!camera?.isCamera||typeof onFatal!=='function'||shadowLights!==null&&!Array.isArray(shadowLights)||typeof includeShadowPass!=='boolean'||typeof sharedSceneLighting!=='boolean'||includeShadowPass&&typeof renderer.compileShadowAsync!=='function')throw TypeError('Invalid pipeline admission');
 const lights=new Map();let lightsRevision=0,structuralRevision=0;
 function addLight(light){if(!light?.isLight||!light.shadow)throw TypeError('Invalid admission shadow light');const count=lights.get(light)??0;lights.set(light,count+1);if(count===0){lightsRevision++;structuralRevision++;}}
 if(shadowLights===null)scene.traverse(node=>{if(node.isLight&&node.shadow)addLight(node);});else for(const light of shadowLights)addLight(light);
 let closed=false,generation=0,active=false,inflightCompiles=0,cancel,auxiliaryRevision=0,priorityBurst=0;const queue=[],targetWaiters=new Set(),compilingObjects=new Map(),compilationMembers=new Map(),uploadingObjects=new Map(),uploadBatch=new Set(),lifecycleSentinel={},auxiliaryTargets=new Map();let uploadScheduled=false,uploadActive=false;
 function frameTarget(){return renderer._getFrameBufferTarget?.()??renderer.getRenderTarget?.()??renderer.getOutputRenderTarget?.()??null;}
 let compilesStarted=0,compilesSettled=0;const compileStarts=new Map();
 const cancelled=new Promise(resolve=>{cancel=()=>resolve(Error('Pipeline admission cancelled'));});
 let lostError=null;
 const lost=renderer.backend.device?.lost?.then(info=>{lostError=Error('WebGPU device lost: '+(info?.message||info?.reason||'unknown'));return lostError;});
 // Queue completion protects resource lifetime, not admission. Several
 // objects share a fence, and later compilations continue while it is pending.
 function scheduleUploads(){if(uploadScheduled||uploadActive||!uploadBatch.size)return;uploadScheduled=true;setTimeout(flushUploads,0);}
 // Snapshot both sides of an object's ownership path: callers may detach a
 // child or retire its parent after compilation has started.
 function relatedNodes(object){const members=new Set();if(object?.isObject3D){object.traverse(node=>members.add(node));for(let parent=object.parent;parent;parent=parent.parent)members.add(parent);}else members.add(object);return members;}
 function trackUploads(object,members=null){if(typeof renderer.backend.device?.queue?.onSubmittedWorkDone!=='function')return;let record=uploadingObjects.get(object);if(!record){record={count:0,releases:[],members:new Set()};uploadingObjects.set(object,record);}for(const member of members??relatedNodes(object))record.members.add(member);if(uploadBatch.has(object))return;record.count++;uploadBatch.add(object);scheduleUploads();}
 function flushUploads(){uploadScheduled=false;if(uploadActive||!uploadBatch.size)return;uploadActive=true;const batch=[...uploadBatch];uploadBatch.clear();let submitted;try{submitted=Promise.resolve(renderer.backend.device.queue.onSubmittedWorkDone());}catch(error){submitted=Promise.reject(error);}const loss=renderer.backend.device.lost?.then(()=>null,()=>null);Promise.race([submitted,...(loss?[loss]:[])]).catch(error=>{if(!closed)retire(error);}).finally(()=>{for(const object of batch){const record=uploadingObjects.get(object);if(!record||--record.count)continue;uploadingObjects.delete(object);for(const release of record.releases){try{release();}catch(error){retire(error);}}}uploadActive=false;scheduleUploads();});}
 function rejectWaiting(error){for(const item of queue.splice(0)){if(item.onAbort)item.signal.removeEventListener('abort',item.onAbort);item.reject(error);}}
 function retire(error){if(!closed){closed=true;generation++;cancel();lights.clear();auxiliaryTargets.clear();rejectWaiting(Error('Pipeline admission closed'));try{onFatal(error);}catch{}}}
 function notifyShadowTargets(){for(const waiter of targetWaiters)if(waiter.ready())waiter.resolve();}
 function enqueue(item){
  if(closed||item.version!==generation){item.reject(Error('Pipeline admission cancelled'));return;}
  if(item.signal?.aborted){item.reject(new DOMException('Pipeline admission cancelled','AbortError'));return;}
  if(item.signal){item.onAbort=()=>{const index=queue.indexOf(item);if(index<0)return;queue.splice(index,1);item.signal.removeEventListener('abort',item.onAbort);item.reject(new DOMException('Pipeline admission cancelled','AbortError'));};item.signal.addEventListener('abort',item.onAbort,{once:true});}
  queue.push(item);if(item.signal?.aborted)item.onAbort();else queueMicrotask(pump);
 }
 function pump(){
  if(closed||active||inflightCompiles||!queue.length)return;
  // Preserve FIFO within each class; after at most two visible requests a
  // waiting normal request gets a turn. The currently compiling item is never
  // interrupted. With only normal requests this is identical to FIFO.
  const visible=queue.findIndex(item=>item.priority==='visible'),normal=queue.findIndex(item=>item.priority!=='visible');
  const selected=visible>=0&&(priorityBurst<2||normal<0)?visible:normal;
  const [item]=queue.splice(selected,1);priorityBurst=item.priority==='visible'?Math.min(priorityBurst+1,2):0;if(item.onAbort)item.signal.removeEventListener('abort',item.onAbort);active=true;
  executePlan(item).then(result=>{
   if(!result?.shadowTarget){
    try{
     if(closed||item.version!==generation)throw Error('Pipeline admission cancelled');
     if(item.signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
     if(!result?.valid?.()){enqueue(item);return;}
     // The validity check and publication share one synchronous turn. No
     // frame or other task can change the compiled inputs between them.
     item.publish?.();item.resolve(item.returnTicket?{valid:result.valid,validAfterAttach:result.validAfterAttach}:undefined);
    }catch(error){item.reject(error);}
    return;
   }
   // Waiting for the ordinary world frame must not hold the renderer queue:
   // a later receiver may itself be needed to create that shadow target.
   result.shadowTarget.then(()=>enqueue(item),error=>{if(!closed&&!item.signal?.aborted)retire(error);item.reject(error);});
  },item.reject).finally(()=>{active=false;pump();});
 }
 async function executePlan(item){
  if(item.backgroundNode)return executeBackground(item);
  // Explicit passes (e.g. Hi-Z reduction) do not recursively prepare world
  // capture passes. World objects become publishable only after every active
  // auxiliary target has been compiled against the same structural inputs.
  const worldPass=item.target===undefined&&item.passCamera===camera&&item.targetScene===scene;
  for(;;){
   const revision=auxiliaryRevision;
   const result=await execute(item.object,item.signal,item.version,item.include,item.target,item.shadowPass,item.passCamera,item.targetScene,null,item.requireShadowTarget,item.materialAlternatives);
   if(result?.shadowTarget||!worldPass)return result;
   const passes=[result],targets=[...auxiliaryTargets.keys()];
   for(const target of targets){if(revision!==auxiliaryRevision)break;passes.push(await execute(item.object,item.signal,item.version,item.include,target,false,camera,scene,()=>revision===auxiliaryRevision,false,item.materialAlternatives));}
   if(revision===auxiliaryRevision&&passes.length===targets.length+1&&passes.every(pass=>pass?.valid?.()))return {valid:()=>revision===auxiliaryRevision&&passes.every(pass=>pass.valid()),validAfterAttach:()=>revision===auxiliaryRevision&&passes.every(pass=>pass.validAfterAttach?.())};
  }
 }
 function backgroundInputs(node){
  const values=renderPassInputs(frameTarget(),camera,renderer);values.push(node,node.getCacheKey(),scene.backgroundBlurriness);
  scene.traverseVisible(object=>{if(object.isLight)values.push(object,object.layers.mask,object.castShadow,object.shadow?.map??null);});
  return values;
 }
 async function executeBackground(item){
  const {signal,version,backgroundNode,expectedNode,expectedBackground}=item;
  const conflict=()=>Object.assign(Error('Background changed during preparation'),{code:'background-ownership-changed'});
  if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
  if(scene.backgroundNode!==expectedNode||scene.background!==expectedBackground)throw conflict();
  try{
   if(closed||version!==generation)throw Error('Pipeline admission cancelled');
   if(lostError)throw lostError;
   if(renderer._initialized===false||renderer._isDeviceLost===true)throw Error('WebGPU renderer unavailable for pipeline admission');
   const inputs=backgroundInputs(backgroundNode),target=frameTarget(),previousTarget=renderer.getRenderTarget?.(),face=renderer.getActiveCubeFace?.(),level=renderer.getActiveMipmapLevel?.(),masks=[],shadows=[];let pending;
   try{
    // The scene and its background mesh must be the ones actually rendered.
    // Layer masks exclude scene geometry while preserving the light list and
    // the hierarchy; the following frame observes the original masks.
    scene.traverse(object=>{if(object.isMesh||object.isLine||object.isPoints||object.isSprite){masks.push([object,object.layers.mask]);object.layers.mask=0;}});
    for(const light of lights.keys()){const shadow=light.shadow;shadows.push([shadow,shadow.autoUpdate,shadow.needsUpdate]);shadow.autoUpdate=false;shadow.needsUpdate=false;}
    scene.backgroundNode=backgroundNode;if(target)renderer.setRenderTarget(target);pending=renderer.compileAsync(scene,camera,scene);
   }finally{
    if(scene.backgroundNode===backgroundNode)scene.backgroundNode=expectedNode;for(const [object,mask] of masks)if(object.layers.mask===0)object.layers.mask=mask;
    for(const [shadow,autoUpdate,needsUpdate] of shadows){shadow.autoUpdate=autoUpdate;shadow.needsUpdate=needsUpdate;}
    if(previousTarget!==undefined)renderer.setRenderTarget(previousTarget,face,level);
   }
   // This sentinel tracks compilation lifetime without retaining unrelated
   // scene descendants as resources of the sky.
   await waitForCompilation(pending,signal,{serial:true,object:item});
   if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
   if(scene.backgroundNode!==expectedNode||scene.background!==expectedBackground)throw conflict();
   if(closed||version!==generation)throw Error('Pipeline admission cancelled');
   if(renderer._isDeviceLost===true||lostError)throw lostError??Error('WebGPU device lost during pipeline admission');
   if(!sameInputs(inputs,backgroundInputs(backgroundNode)))return executeBackground(item);
   return {valid:()=>!closed&&!lostError&&renderer._initialized!==false&&renderer._isDeviceLost!==true&&version===generation&&!signal?.aborted&&scene.backgroundNode===expectedNode&&scene.background===expectedBackground&&sameInputs(inputs,backgroundInputs(backgroundNode))};
  }catch(error){
   if(!closed&&!signal?.aborted&&error?.code!=='background-ownership-changed')retire(error);
   throw error;
  }
 }
 async function waitForCompilation(pending,signal,{serial=false,object=null}={}){
  let onAbort;const aborted=signal?new Promise(resolve=>{onAbort=()=>resolve(new DOMException('Pipeline admission cancelled','AbortError'));signal.addEventListener('abort',onAbort,{once:true});if(signal.aborted)onAbort();}):null;
  const compilation=Promise.resolve(pending);
  // Abort cancels publication, not Three's pending compilation. Keep the
  // renderer queue locked until that work settles; otherwise a cancelled
  // compile can overlap a new request or poison its cache afterwards.
  if(serial){inflightCompiles++;compilesStarted++;compileStarts.set(object,performance.now());const deferred=[],members=relatedNodes(object);compilingObjects.set(object,deferred);compilationMembers.set(object,members);const finish=error=>{if(error&&signal?.aborted)retire(error);if(deferred.length)trackUploads(object,members);compilingObjects.delete(object);compilationMembers.delete(object);for(const release of deferred){try{release();}catch(error){retire(error);}}inflightCompiles--;compilesSettled++;compileStarts.delete(object);pump();};compilation.then(()=>finish(null),finish);}
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
 async function execute(object,signal,version,include,requestedTarget,shadowPass,passCamera,targetScene,isCurrent=null,requireShadowTarget=false,alternatives=[]){
  // Included alternatives may be nested below hidden groups. The render
  // list needs the complete path, not just the requested leaf, to be visible
  // during synchronous compilation setup. Never touch a reparented object.
  if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
  const paths=new Set();for(const node of include){let parent=node;while(parent&&parent!==object){paths.add(parent);parent=parent.parent;}if(parent!==object)throw TypeError('Admission visibility changed ownership');}
  try{
    if(isCurrent&&!isCurrent())return;
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
    if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
    if(lostError)throw lostError;
    if(renderer._initialized===false||renderer._isDeviceLost===true)throw Error('WebGPU renderer unavailable for pipeline admission');
    // compileAsync builds its render list before its first await. Restore the
    // visibility immediately, before any subsequent frame can render it.
    const lightVersion=lightsRevision,lightState=[...lights.keys()].map(light=>[light,light.castShadow,light.visible,light.layers.mask]),lightsChanged=()=>lightVersion!==lightsRevision||lightState.some(([light,castShadow,visible,layers])=>light.castShadow!==castShadow||light.visible!==visible||light.layers.mask!==layers),visible=object.visible,previousTarget=renderer.getRenderTarget?.(),face=renderer.getActiveCubeFace?.(),level=renderer.getActiveMipmapLevel?.(),previousMrt=renderer.getMRT?.(),culling=[],shadows=[],included=[...paths].map(node=>[node,node.visible]),currentTarget=()=>requestedTarget===undefined?frameTarget():requestedTarget;let pending,target,inputs,baseInputs;
    try{
     // Three's ordinary render may use an intermediate output target; compile
     // for that same target, and restore state before the draw loop resumes.
     target=currentTarget();
     baseInputs=pipelineInputs(object,target,passCamera,renderer,include);
     withMaterialAlternatives(alternatives,()=>{inputs=pipelineInputs(object,target,passCamera,renderer,include);
     if(requestedTarget!==undefined)renderer.setMRT?.(null);
     if(target)renderer.setRenderTarget(target);
     // Three r180 updates shadow nodes during compileAsync. Prevent that
     // setup from issuing a real shadow draw while keeping shadow features in
     // the shader graph; restore all flags before the next visible frame.
     for(const light of lights.keys()){const shadow=light.shadow;shadows.push([shadow,shadow.autoUpdate,shadow.needsUpdate]);shadow.autoUpdate=false;shadow.needsUpdate=false;}
     object.traverse(node=>{if(node.isMesh||node.isLine||node.isPoints){culling.push([node,node.frustumCulled]);node.frustumCulled=false;}});
     for(const [node] of included)node.visible=true;object.visible=true;pending=sharedSceneLighting?compileWithAdmissionSceneLighting(renderer,object,passCamera,targetScene,()=>renderer.compileAsync(object,passCamera,targetScene)):renderer.compileAsync(object,passCamera,targetScene);});
    }finally{
     object.visible=visible;
     for(const [node,value] of included)node.visible=value;
     for(const [node,value] of culling)node.frustumCulled=value;
     for(const [shadow,autoUpdate,needsUpdate] of shadows){shadow.autoUpdate=autoUpdate;shadow.needsUpdate=needsUpdate;}
     if(previousTarget!==undefined)renderer.setRenderTarget(previousTarget,face,level);
     if(requestedTarget!==undefined&&previousMrt!==undefined)renderer.setMRT(previousMrt);
    }
    await waitForCompilation(pending,signal,{serial:true,object});
    if(isCurrent&&!isCurrent())return;
    if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
    if(renderer._isDeviceLost===true)throw Error('WebGPU device lost during pipeline admission');
    if(closed||version!==generation)throw Error('Pipeline admission cancelled');
    // A light may have been added or removed while the driver compiled. The
    // completed pipeline describes the old scene and cannot admit the object.
    if(lightsChanged()||(!sameInputs(baseInputs,pipelineInputs(object,currentTarget(),passCamera,renderer,include))||!withMaterialAlternatives(alternatives,()=>sameInputs(inputs,pipelineInputs(object,currentTarget(),passCamera,renderer,include)))))return execute(object,signal,version,include,requestedTarget,shadowPass,passCamera,targetScene,isCurrent,requireShadowTarget,alternatives);
    const shadowTargets=[];
    if(shadowPass){
     let castsShadow=false;object.traverse(node=>{if((node.isMesh||node.isLine||node.isPoints)&&node.castShadow)castsShadow=true;});
     if(castsShadow){
      for(const light of lights.keys()){
       if(!light.castShadow||!light.visible)continue;
       if(!light.shadow.map){if(requireShadowTarget)throw Object.assign(Error('Required shadow target is not available after preparation'),{code:'shadow-target-unavailable'});return {shadowTarget:waitForShadowTarget(light,signal,lightVersion)};}
       if(closed||version!==generation)throw Error('Pipeline admission cancelled');
       if(lightsChanged())return execute(object,signal,version,include,requestedTarget,shadowPass,passCamera,targetScene,isCurrent,requireShadowTarget,alternatives);
       if(!light.castShadow||!light.visible)continue;
       const target=light.shadow.map,visible=object.visible,culling=[],shadows=[];let shadowPending;
       shadowTargets.push([light,target]);
       try{
        for(const current of lights.keys()){const shadow=current.shadow;shadows.push([shadow,shadow.autoUpdate,shadow.needsUpdate]);shadow.autoUpdate=false;shadow.needsUpdate=false;}
        object.traverse(node=>{if(node.isMesh||node.isLine||node.isPoints){culling.push([node,node.frustumCulled]);node.frustumCulled=false;}});
        for(const [node] of included)node.visible=true;object.visible=true;shadowPending=withMaterialAlternatives(alternatives,()=>renderer.compileShadowAsync(object,targetScene,passCamera,light));
       }finally{
        object.visible=visible;for(const [node,value] of included)node.visible=value;for(const [node,value] of culling)node.frustumCulled=value;
        for(const [shadow,autoUpdate,needsUpdate] of shadows){shadow.autoUpdate=autoUpdate;shadow.needsUpdate=needsUpdate;}
       }
       await waitForCompilation(shadowPending,signal,{serial:true,object});
       if(signal?.aborted)throw new DOMException('Pipeline admission cancelled','AbortError');
       if(renderer._isDeviceLost===true)throw Error('WebGPU device lost during shadow admission');
       if(closed||version!==generation)throw Error('Pipeline admission cancelled');
       if(lightsChanged()||target!==light.shadow.map||!sameInputs(baseInputs,pipelineInputs(object,currentTarget(),passCamera,renderer,include))||!withMaterialAlternatives(alternatives,()=>sameInputs(inputs,pipelineInputs(object,currentTarget(),passCamera,renderer,include))))return execute(object,signal,version,include,requestedTarget,shadowPass,passCamera,targetScene,isCurrent,requireShadowTarget,alternatives);
      }
     }
    }
    // Only the expected scene attachment may change after preparation.
    // Descendant ownership, geometry, materials and pass state remain strict.
    const originalParent=baseInputs[renderPassInputs(target,passCamera,renderer).length+1];
    const valid=(attachedRootParent=undefined)=>!closed&&!lostError&&renderer._initialized!==false&&renderer._isDeviceLost!==true&&version===generation&&!signal?.aborted&&(!isCurrent||isCurrent())&&!lightsChanged()&&shadowTargets.every(([light,map])=>light.shadow.map===map)&&sameInputs(baseInputs,pipelineInputs(object,currentTarget(),passCamera,renderer,include,attachedRootParent))&&withMaterialAlternatives(alternatives,()=>sameInputs(inputs,pipelineInputs(object,currentTarget(),passCamera,renderer,include,attachedRootParent)));
    return {valid:()=>valid(),validAfterAttach:()=>originalParent===null&&object.parent===targetScene&&valid(null)};
  }catch(error){
   if(error?.name==='GPUPipelineError'){const layouts=[];object.traverse(node=>{if(node.geometry)layouts.push({name:node.name||node.type,attributes:Object.keys(node.geometry.attributes),material:node.material?.name||node.material?.type});});error=Object.assign(new Error(error.message+' '+JSON.stringify(layouts),{cause:error}),{name:error.name});}
   // Three r180 may retain an unsuccessful pipeline in its internal cache.
   if(!closed&&!signal?.aborted&&error?.code!=='shadow-target-unavailable'&&error?.code!=='admission-stale')retire(error);
   throw error;
  }
 }
 function deferObjectRelease(object,release){let pending=compilingObjects.get(object)??uploadingObjects.get(object)?.releases;if(!pending)for(const [root,members] of compilationMembers)if(members.has(object)){pending=compilingObjects.get(root);break;}if(!pending)for(const record of uploadingObjects.values())if(record.members.has(object)){pending=record.releases;break;}if(pending)pending.push(()=>deferObjectRelease(object,release));else release();}
 function deferAll(release){const pending=[...compilingObjects.values(),...[...uploadingObjects.values()].map(record=>record.releases)];if(!pending.length){release();return;}let remaining=pending.length;for(const list of pending)list.push(()=>{if(--remaining===0)deferAll(release);});}
 return {
  // Removal is immediate; release of the resources used by an active
  // compilation waits until Three's compilation promise actually settles.
  deferRelease(object,release){if(!object?.isObject3D||typeof release!=='function')throw TypeError('Invalid deferred release');trackUploads(object);deferObjectRelease(object,release);},
  // Used at shutdown for shared resources that may belong to any active
  // object. This captures current compilations; callers must first stop new
  // admissions and resource creation.
  deferCompilations(release){if(typeof release!=='function')throw TypeError('Invalid deferred release');trackUploads(lifecycleSentinel);deferAll(release);},
  registerShadowLight(light){if(closed)throw Error('Pipeline admission closed');addLight(light);notifyShadowTargets();let released=false;return ()=>{if(released)return;released=true;const count=lights.get(light)??0;if(count===1){lights.delete(light);lightsRevision++;structuralRevision++;notifyShadowTargets();}else if(count>1)lights.set(light,count-1);};},
  // Register before publishing objects for a new pass. Existing visible
  // objects must be admitted separately before the pass is first rendered.
  registerAuxiliaryTarget(target){if(closed)throw Error('Pipeline admission closed');if(!target?.isRenderTarget||typeof renderer.getRenderTarget!=='function'||typeof renderer.setRenderTarget!=='function')throw TypeError('Invalid auxiliary target');const count=auxiliaryTargets.get(target)??0;auxiliaryTargets.set(target,count+1);if(!count){auxiliaryRevision++;structuralRevision++;}let released=false;return ()=>{if(released)return;released=true;const current=auxiliaryTargets.get(target)??0;if(current<=1){if(current){auxiliaryTargets.delete(target);auxiliaryRevision++;structuralRevision++;}}else auxiliaryTargets.set(target,current-1);};},
  notifyShadowTargets,
  status(){const describe=object=>{const meshes=[];let count=0;object?.traverse?.(node=>{if(!(node.isMesh||node.isLine||node.isPoints))return;count++;if(meshes.length<6)meshes.push({name:node.name||node.type,ground:node.userData?.ground===true,slot:node.userData?.nativePropSlot??null,material:Array.isArray(node.material)?node.material.map(item=>item?.name||item?.type):node.material?.name||node.material?.type});});return {name:object?.name||object?.type||'background',meshCount:count,meshes};};return {closed,queued:queue.length,active,inflightCompiles,shadowWaiters:targetWaiters.size,uploads:uploadingObjects.size,structuralRevision,compilesStarted,compilesSettled,queueHead:queue.slice(0,8).map(item=>describe(item.object)),queueTail:queue.slice(-8).map(item=>describe(item.object)),compiling:[...compileStarts].map(([object,at])=>({...describe(object),ageMs:performance.now()-at,children:object.children?.map(child=>child.name||child.type)}))};},
  get structuralRevision(){return structuralRevision;},
  // A color/clear fallback can keep rendering while the real scene's
  // background pipeline compiles. Replacing an existing node is not yet
  // supported: Three mutates one cached background material per scene.
  prepareBackgroundAndPublish(backgroundNode,{signal}={},publish){
   if(closed)return Promise.reject(Error('Pipeline admission closed'));
   if(!backgroundNode?.isNode||typeof backgroundNode.getCacheKey!=='function'||typeof publish!=='function'||signal!==undefined&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))return Promise.reject(TypeError('Invalid background admission'));
   if(scene.backgroundNode!=null||scene.background!=null&&!scene.background.isColor)return Promise.reject(Error('Existing node or textured background requires a replacement transaction'));
   if(signal?.aborted)return Promise.reject(new DOMException('Pipeline admission cancelled','AbortError'));
   return new Promise((resolve,reject)=>enqueue({backgroundNode,expectedNode:scene.backgroundNode,expectedBackground:scene.background,signal,version:generation,publish,resolve,reject,onAbort:null}));
  },
  prepare(object,{signal,include=[],target=undefined,shadowPass=includeShadowPass,passCamera=camera,targetScene=scene,publish=null,returnTicket=false,requireShadowTarget=false,materialAlternatives=[],priority='normal'}={}){
   if(closed)return Promise.reject(Error('Pipeline admission closed'));
   if(!object?.isObject3D)return Promise.reject(TypeError('Invalid admission object'));
   if(!passCamera?.isCamera||!targetScene?.isObject3D)return Promise.reject(TypeError('Invalid admission pass context'));
   if(target!==undefined&&(!target?.isRenderTarget||typeof renderer.setRenderTarget!=='function'||typeof renderer.getRenderTarget!=='function')||typeof shadowPass!=='boolean'||shadowPass&&typeof renderer.compileShadowAsync!=='function')return Promise.reject(TypeError('Invalid admission target or shadow pass'));
   if(!Array.isArray(include)||include.some(node=>{if(!node?.isObject3D)return true;if(node===object)return false;for(let parent=node.parent;parent;parent=parent.parent)if(parent===object)return false;return true;}))return Promise.reject(TypeError('Invalid admission visibility'));
   if(!Array.isArray(materialAlternatives)||materialAlternatives.some(item=>{if(!item?.mesh?.isMesh||!item.material||!item.mesh.material||Array.isArray(item.material)!==Array.isArray(item.mesh.material)||(Array.isArray(item.material)?item.material.some(value=>!value?.isMaterial):!item.material.isMaterial)||Array.isArray(item.material)&&item.material.length!==item.mesh.material.length)return true;for(let parent=item.mesh;parent;parent=parent.parent)if(parent===object)return false;return true;})||new Set(materialAlternatives.map(item=>item.mesh)).size!==materialAlternatives.length)return Promise.reject(TypeError('Invalid admission material alternatives'));
   if(signal!==undefined&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))return Promise.reject(TypeError('Invalid admission signal'));
   if(publish!==null&&typeof publish!=='function'||typeof returnTicket!=='boolean'||typeof requireShadowTarget!=='boolean'||publish!==null&&returnTicket||!['normal','visible'].includes(priority))return Promise.reject(TypeError('Invalid admission publication'));
   if(signal?.aborted)return Promise.reject(new DOMException('Pipeline admission cancelled','AbortError'));
   // Admission is the structural mutation boundary, including newly added
   // fields that were not present when an earlier key recipe was captured.
   if(renderer._wgMaterialKeys){const materials=new Set();object.traverse(node=>{for(const material of Array.isArray(node.material)?node.material:[node.material])if(material)materials.add(material);});for(const item of materialAlternatives)for(const material of Array.isArray(item.material)?item.material:[item.material])materials.add(material);for(const material of materials)renderer._wgMaterialKeys.invalidate(material);}
   return new Promise((resolve,reject)=>enqueue({object,signal,include:[...new Set(include)],target,shadowPass,passCamera,targetScene,publish,returnTicket,requireShadowTarget,priority,materialAlternatives:materialAlternatives.map(item=>({mesh:item.mesh,material:item.material,original:item.mesh.material,root:object})),version:generation,resolve,reject,onAbort:null}));
  },
  prepareAndPublish(object,options,publish){return this.prepare(object,{...options,publish});},
  prepareTicket(object,options){return this.prepare(object,{...options,returnTicket:true});},
  async prepareManyAndPublish(requests,publish){
   if(!Array.isArray(requests)||typeof publish!=='function'||requests.some(request=>!request?.object?.isObject3D))throw TypeError('Invalid admission group');
   const tickets=Array(requests.length).fill(null);
   for(;;){
    for(let i=0;i<requests.length;i++)if(!tickets[i]?.valid())tickets[i]=await this.prepareTicket(requests[i].object,requests[i].options);
    if(closed)throw Error('Pipeline admission cancelled');
    if(lostError)throw lostError;
    if(renderer._initialized===false||renderer._isDeviceLost===true)throw Error('WebGPU renderer unavailable for pipeline admission');
    if(requests.some(request=>request.options?.signal?.aborted))throw new DOMException('Pipeline admission cancelled','AbortError');
    if(tickets.every(ticket=>ticket.valid())){publish();return;}
   }
  },
  dispose(){if(closed)return;closed=true;generation++;cancel();lights.clear();auxiliaryTargets.clear();rejectWaiting(Error('Pipeline admission cancelled'));},
 };
}
