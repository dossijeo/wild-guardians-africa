import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {uniform} from 'three/tsl';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import {closeWebGpuRenderer} from '../src/rendering/webgpu-world-surface.js';

test('real scene background preparation isolates geometry only during synchronous setup',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),child=new THREE.Mesh(),sun=new THREE.DirectionalLight(),background=uniform(1),fallback=new THREE.Color('red'),screen={},frame={};scene.background=fallback;scene.add(mesh,sun);mesh.add(child);mesh.layers.mask=5;child.layers.mask=9;sun.layers.mask=3;sun.shadow.autoUpdate=true;sun.shadow.needsUpdate=true;let current=screen,finish,published=0;
 const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,_getFrameBufferTarget:()=>frame,setRenderTarget:value=>{current=value;},compileAsync(actualScene,actualCamera,targetScene){assert.equal(actualScene,scene);assert.equal(actualCamera,camera);assert.equal(targetScene,scene);assert.equal(scene.backgroundNode,background);assert.equal(current,frame);assert.equal(mesh.layers.mask,0);assert.equal(child.layers.mask,0);assert.equal(sun.layers.mask,3);assert.equal(sun.shadow.autoUpdate,false);assert.equal(sun.shadow.needsUpdate,false);return new Promise(resolve=>{finish=resolve;});}},admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun]});
 try{const task=admission.prepareBackgroundAndPublish(background,{},()=>{assert.equal(scene.background,fallback);assert.equal(scene.backgroundNode??null,null);scene.backgroundNode=background;published++;});await Promise.resolve();assert.equal(scene.backgroundNode??null,null);assert.equal(scene.background,fallback);assert.equal(current,screen);assert.equal(mesh.layers.mask,5);assert.equal(child.layers.mask,9);assert.equal(sun.layers.mask,3);assert.equal(sun.shadow.autoUpdate,true);assert.equal(sun.shadow.needsUpdate,true);assert.equal(published,0);finish();await task;assert.equal(published,1);assert.equal(scene.backgroundNode,background);}finally{admission.dispose();for(const item of [mesh,child]){item.geometry.dispose();item.material.dispose();}}
});
test('a cancelled background compile leaves the fallback and defers resources',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),node=uniform(1),controller=new AbortController();scene.background=new THREE.Color('red');scene.add(mesh);let finish,released=0;const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),pending=admission.prepareBackgroundAndPublish(node,{signal:controller.signal},()=>{throw Error('must not publish');});
 try{await Promise.resolve();controller.abort();await assert.rejects(pending,{name:'AbortError'});admission.deferCompilations(()=>released++);assert.equal(scene.backgroundNode??null,null);assert.equal(mesh.layers.mask,1);assert.equal(released,0);finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(released,1);}finally{admission.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});
test('background conflicts preserve the new owner and genuine compilation failures retire the renderer',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),first=uniform(1),other=uniform(2),failures=[];scene.background=new THREE.Color('red');let finish;const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:error=>failures.push(error.message)});
 try{const pending=admission.prepareBackgroundAndPublish(first,{},()=>{throw Error('must not publish');});await Promise.resolve();scene.backgroundNode=other;finish();await assert.rejects(pending,/Background changed/);assert.equal(scene.backgroundNode,other);assert.deepEqual(failures,[]);await assert.rejects(admission.prepareBackgroundAndPublish(first,{},()=>{}),/replacement transaction/);}finally{admission.dispose();}
 const failingScene=new THREE.Scene(),failureRenderer={backend:{isWebGPUBackend:true},compileAsync:()=>Promise.reject(Error('background compiler failed'))},failureAdmission=createWebGpuPipelineAdmission({renderer:failureRenderer,scene:failingScene,camera,onFatal:error=>failures.push(error.message)});
 try{await assert.rejects(failureAdmission.prepareBackgroundAndPublish(first,{},()=>{}),/background compiler failed/);assert.deepEqual(failures,['background compiler failed']);await assert.rejects(failureAdmission.prepare(new THREE.Group()),/closed/);}finally{failureAdmission.dispose();}
});
test('a reentrant background replacement is not overwritten by synchronous restoration',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),candidate=uniform(1),other=uniform(2),failures=[];scene.background=new THREE.Color('red');let finish;const renderer={backend:{isWebGPUBackend:true},compileAsync(){scene.backgroundNode=other;return new Promise(resolve=>{finish=resolve;});}},admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:error=>failures.push(error.message)}),pending=admission.prepareBackgroundAndPublish(candidate,{},()=>{throw Error('must not publish');});
 try{await Promise.resolve();assert.equal(scene.backgroundNode,other);finish();await assert.rejects(pending,/Background changed/);assert.equal(scene.backgroundNode,other);assert.deepEqual(failures,[]);}finally{admission.dispose();}
});
test('a background compilation failure retires the renderer even if ownership changes',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),candidate=uniform(1),other=uniform(2),failures=[];scene.background=new THREE.Color('red');const renderer={backend:{isWebGPUBackend:true},compileAsync(){scene.backgroundNode=other;return Promise.reject(Error('driver compilation failed'));}},admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:error=>failures.push(error.message)});
 try{await assert.rejects(admission.prepareBackgroundAndPublish(candidate,{},()=>{}),/driver compilation failed/);assert.equal(scene.backgroundNode,other);assert.deepEqual(failures,['driver compilation failed']);await assert.rejects(admission.prepare(new THREE.Group()),/closed/);}finally{admission.dispose();}
});
test('background retries when the framebuffer or visible light list changes during preparation',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),candidate=uniform(1),sun=new THREE.DirectionalLight(),jobs=[],screen={},frameA={},frameB={};scene.background=new THREE.Color('red');let current=screen,frame=frameA,published=0;
 const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,_getFrameBufferTarget:()=>frame,setRenderTarget:value=>{current=value;},compileAsync(){jobs.push({target:current,resolve:null});return new Promise(resolve=>{jobs.at(-1).resolve=resolve;});}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),pending=admission.prepareBackgroundAndPublish(candidate,{},()=>{scene.backgroundNode=candidate;published++;}),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{await turn();assert.equal(jobs.length,1);assert.equal(jobs[0].target,frameA);frame=frameB;scene.add(sun);jobs[0].resolve();await turn();assert.equal(published,0);assert.equal(jobs.length,2);assert.equal(jobs[1].target,frameB);jobs[1].resolve();await pending;assert.equal(published,1);assert.equal(current,screen);}finally{admission.dispose();}
});

test('renderer shutdown does not destroy the device while a cancelled compilation remains active',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();let finish,disposed=0;const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;}),dispose(){disposed++;}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),pending=admission.prepare(new THREE.Group());await Promise.resolve();const rejected=assert.rejects(pending,/cancelled/);admission.dispose();const shutdown=closeWebGpuRenderer(renderer,admission);await rejected;assert.equal(disposed,0);finish();await shutdown;assert.equal(disposed,1);
});

test('preparation remains hidden while compilation is pending and serializes requests',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group();object.visible=false;
 let resolve;const calls=[];
 const renderer={backend:{isWebGPUBackend:true},compileAsync(o,c,s){calls.push([o.visible,c,s]);return new Promise(r=>{resolve=r;});}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 const first=admission.prepare(object),second=admission.prepare(object);
 await Promise.resolve();assert.equal(object.visible,false);assert.equal(calls.length,1);assert.deepEqual(calls[0],[true,camera,scene]);
 resolve();await first;await Promise.resolve();assert.equal(calls.length,2);resolve();await second;admission.dispose();
});

test('admissions share a queue fence without waiting to become ready',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),a=new THREE.Group(),b=new THREE.Group(),fences=[];let released=0,compiles=0;const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>fences.push(resolve))}}},compileAsync:()=>{compiles++;return Promise.resolve();}},admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 await Promise.all([admission.prepare(a),admission.prepare(b)]);assert.equal(compiles,2);await new Promise(resolve=>setTimeout(resolve,10));assert.equal(fences.length,0);admission.deferRelease(a,()=>released++);admission.deferRelease(b,()=>released++);assert.equal(released,0);await new Promise(resolve=>setTimeout(resolve,10));assert.equal(fences.length,1);fences[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(released,2);admission.dispose();
});
test('later admissions proceed during a GPU fence and are retained through the next batch',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),a=new THREE.Group(),b=new THREE.Group(),fences=[];let releasedA=0,releasedB=0;const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>fences.push(resolve))}}},compileAsync:()=>Promise.resolve()},admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 await admission.prepare(a);admission.deferRelease(a,()=>releasedA++);await new Promise(resolve=>setTimeout(resolve,10));assert.equal(fences.length,1);await admission.prepare(b);admission.deferRelease(b,()=>releasedB++);fences[0]();await new Promise(resolve=>setTimeout(resolve,10));assert.equal(releasedA,1);assert.equal(releasedB,0);assert.equal(fences.length,2);fences[1]();await new Promise(resolve=>setImmediate(resolve));assert.equal(releasedB,1);admission.dispose();
});

test('cancelled compilation keeps its resources through a later upload batch',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),controller=new AbortController(),fences=[];let finish,released=0;const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>fences.push(resolve))}}},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),ready=admission.prepare(object,{signal:controller.signal});
 await Promise.resolve();controller.abort();await assert.rejects(ready,/cancelled/);admission.deferRelease(object,()=>released++);await new Promise(resolve=>setTimeout(resolve,10));assert.equal(fences.length,1);fences[0]();await new Promise(resolve=>setImmediate(resolve));finish();await new Promise(resolve=>setTimeout(resolve,10));assert.equal(fences.length,2);assert.equal(released,0);fences[1]();await new Promise(resolve=>setImmediate(resolve));assert.equal(released,1);admission.dispose();
});

test('a detached child cannot be released while its former group is compiling or uploading',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),group=new THREE.Group(),child=new THREE.Mesh(),controller=new AbortController(),fences=[];group.add(child);let finish,released=0;
 const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>fences.push(resolve))}}},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),ready=admission.prepare(group,{signal:controller.signal});
 await Promise.resolve();controller.abort();await assert.rejects(ready,/cancelled/);child.removeFromParent();admission.deferRelease(child,()=>released++);
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(fences.length,1);fences[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(released,0);
 finish();await new Promise(resolve=>setTimeout(resolve,10));assert.equal(fences.length,2);assert.equal(released,0);fences[1]();await new Promise(resolve=>setImmediate(resolve));assert.equal(released,1);admission.dispose();child.geometry.dispose();child.material.dispose();
});
test('a retired parent cannot be released while its detached child is compiling',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),group=new THREE.Group(),child=new THREE.Mesh(),controller=new AbortController(),fences=[];group.add(child);scene.add(group);let finish,released=0;
 const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>fences.push(resolve))}}},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),ready=admission.prepare(child,{signal:controller.signal});
 await Promise.resolve();controller.abort();await assert.rejects(ready,/cancelled/);child.removeFromParent();group.removeFromParent();admission.deferRelease(group,()=>released++);
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(fences.length,1);fences[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(released,0);
 finish();await new Promise(resolve=>setTimeout(resolve,10));assert.equal(fences.length,2);assert.equal(released,0);fences[1]();await new Promise(resolve=>setImmediate(resolve));assert.equal(released,1);admission.dispose();child.geometry.dispose();child.material.dispose();
});
test('retiring a group also protects a child detached while its GPU fence is pending',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),group=new THREE.Group(),child=new THREE.Mesh(),fences=[];group.add(child);let groupReleased=0,childReleased=0;
 const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>fences.push(resolve))}}},compileAsync:()=>Promise.resolve()},admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 await admission.prepare(group);admission.deferRelease(group,()=>groupReleased++);await new Promise(resolve=>setTimeout(resolve,10));child.removeFromParent();admission.deferRelease(child,()=>childReleased++);
 assert.equal(fences.length,1);fences[0]();await new Promise(resolve=>setTimeout(resolve,10));assert.equal(groupReleased,1);assert.equal(childReleased,0);assert.equal(fences.length,2);fences[1]();await new Promise(resolve=>setImmediate(resolve));assert.equal(childReleased,1);admission.dispose();child.geometry.dispose();child.material.dispose();
});

test('device loss releases a pending shared upload fence',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group();let lose,released=0;const renderer={backend:{isWebGPUBackend:true,device:{lost:new Promise(resolve=>{lose=resolve;}),queue:{onSubmittedWorkDone:()=>new Promise(()=>{})}}},compileAsync:()=>Promise.resolve()},admission=createWebGpuPipelineAdmission({renderer,scene,camera});await admission.prepare(object);admission.deferRelease(object,()=>released++);await new Promise(resolve=>setTimeout(resolve,10));assert.equal(released,0);lose({reason:'destroyed'});await new Promise(resolve=>setImmediate(resolve));assert.equal(released,1);admission.dispose();
});
test('renderer shutdown waits for the shared queue batch without blocking admission',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),fences=[];let disposed=0;const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>fences.push(resolve))}}},compileAsync:()=>Promise.resolve(),dispose(){disposed++;}},admission=createWebGpuPipelineAdmission({renderer,scene,camera});await admission.prepare(object);admission.dispose();const shutdown=closeWebGpuRenderer(renderer,admission);await new Promise(resolve=>setTimeout(resolve,10));assert.equal(fences.length,1);assert.equal(disposed,0);fences[0]();await shutdown;assert.equal(disposed,1);
});

test('failed compilation retires the renderer instead of retrying its poisoned cache',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group();object.visible=false;
 const failures=[],renderer={backend:{isWebGPUBackend:true},compileAsync:()=>Promise.reject(Error('compile failed'))};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:error=>failures.push(error.message)});
 await assert.rejects(admission.prepare(object),/compile failed/);
 assert.deepEqual(failures,['compile failed']);await assert.rejects(admission.prepare(object),/closed/);assert.equal(object.visible,false);
});

test('disposal invalidates a pending result without reporting a fatal error',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),failures=[];let resolve;
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(r=>{resolve=r;})};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:error=>failures.push(error)});
 const pending=admission.prepare(object);await Promise.resolve();admission.dispose();
 await assert.rejects(pending,/cancelled/);resolve();assert.deepEqual(failures,[]);
});

test('prepares with the actual framebuffer target and restores it before awaiting',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),screen={},framebuffer={};let current=screen,finish;
 const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,getActiveCubeFace:()=>2,getActiveMipmapLevel:()=>3,_getFrameBufferTarget:()=>framebuffer,setRenderTarget(target,face,level){current=target;if(target===screen)assert.deepEqual([face,level],[2,3]);},compileAsync(){assert.equal(current,framebuffer);return new Promise(resolve=>{finish=resolve;});}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera}),pending=admission.prepare(object);
 await Promise.resolve();assert.equal(current,screen);finish();await pending;admission.dispose();
});

test('explicit offscreen admission restores target and MRT while compiling and retries changed depth format',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),screen={},framebuffer={},target=new THREE.RenderTarget(4,4,{depthTexture:new THREE.DepthTexture(4,4)}),mrt={},pending=[];let current=screen,currentMrt=mrt,shadowCalls=0;
 const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,getMRT:()=>currentMrt,setMRT:value=>{currentMrt=value;},_getFrameBufferTarget:()=>framebuffer,setRenderTarget:value=>{current=value;},compileAsync(){assert.equal(current,target);assert.equal(currentMrt,null);return new Promise(resolve=>pending.push(resolve));},compileShadowAsync(){shadowCalls++;return Promise.resolve();}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,includeShadowPass:true}),ready=admission.prepare(mesh,{target,shadowPass:false});try{await Promise.resolve();assert.equal(current,screen);assert.equal(currentMrt,mrt);target.depthTexture.type=THREE.FloatType;pending[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,2);pending[1]();await ready;assert.equal(shadowCalls,0);assert.equal(current,screen);assert.equal(currentMrt,mrt);await assert.rejects(admission.prepare(mesh,{target:{}}),/Invalid admission target/);}finally{admission.dispose();target.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('failed offscreen compilation restores the destination and MRT',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),screen={},mrt={},target=new THREE.RenderTarget(2,2);let current=screen,currentMrt=mrt;const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,getMRT:()=>currentMrt,setMRT:value=>{currentMrt=value;},setRenderTarget:value=>{current=value;},compileAsync(){assert.equal(current,target);assert.equal(currentMrt,null);throw Error('offscreen failed');}};const admission=createWebGpuPipelineAdmission({renderer,scene,camera});try{await assert.rejects(admission.prepare(mesh,{target,shadowPass:false}),/offscreen failed/);assert.equal(current,screen);assert.equal(currentMrt,mrt);}finally{admission.dispose();target.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('explicit pass context reaches the compiler without replacing the world context',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),quad=new THREE.Mesh(),passCamera=new THREE.OrthographicCamera(),target=new THREE.RenderTarget(2,2);let current=null;const calls=[];const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,setRenderTarget:value=>{current=value;},compileAsync(...args){calls.push(args);return Promise.resolve();}},admission=createWebGpuPipelineAdmission({renderer,scene,camera});try{await admission.prepare(quad,{target,passCamera,targetScene:quad,shadowPass:false});await admission.prepare(quad);assert.deepEqual(calls,[[quad,passCamera,quad],[quad,camera,scene]]);await assert.rejects(admission.prepare(quad,{passCamera:{}}),/pass context/);}finally{admission.dispose();target.dispose();quad.geometry.dispose();quad.material.dispose();}
});

test('world admission prepares registered auxiliary targets before publishing',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),framebuffer={},target=new THREE.RenderTarget(2,2),calls=[];let current=null,finish;const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,_getFrameBufferTarget:()=>framebuffer,setRenderTarget:value=>{current=value;},compileAsync(){calls.push(current);return calls.length===2?new Promise(resolve=>{finish=resolve;}):Promise.resolve();}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),remove=admission.registerAuxiliaryTarget(target);let published=false;try{const ready=admission.prepare(mesh).then(()=>{published=true;});await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[framebuffer,target]);assert.equal(published,false);finish();await ready;assert.equal(published,true);remove();await admission.prepare(mesh);assert.deepEqual(calls,[framebuffer,target,framebuffer]);}finally{admission.dispose();target.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('publication is synchronous with the final pass validation',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),target=new THREE.RenderTarget(2,2),pending=[];let current=null,published=0;
 const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,setRenderTarget:value=>{current=value;},compileAsync(){return new Promise(resolve=>pending.push(resolve));}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),remove=admission.registerAuxiliaryTarget(target),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{
  const ready=admission.prepareAndPublish(mesh,{},()=>{assert.equal(mesh.material.version,1);published++;});
  await turn();pending[0]();await turn();assert.equal(pending.length,2);mesh.material.needsUpdate=true;pending[1]();await turn();
  assert.equal(published,0);assert.equal(pending.length,3);pending[2]();await turn();assert.equal(pending.length,4);pending[3]();await turn();assert.equal(pending.length,5);pending[4]();await ready;assert.equal(published,1);
 }finally{remove();admission.dispose();target.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('publication errors reject only the request and do not poison later admissions',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),renderer={backend:{isWebGPUBackend:true},compileAsync:()=>Promise.resolve()},admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 try{await assert.rejects(admission.prepareAndPublish(mesh,{},()=>{throw Error('publication failed');}),/publication failed/);await admission.prepare(mesh);}finally{admission.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('a preparation ticket tracks compiled inputs and auxiliary pass ownership',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),target=new THREE.RenderTarget(2,2);let current=null;
 const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,setRenderTarget:value=>{current=value;},compileAsync:()=>Promise.resolve()},admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 try{const ticket=await admission.prepareTicket(mesh,{});assert.equal(ticket.valid(),true);mesh.material.needsUpdate=true;assert.equal(ticket.valid(),false);const fresh=await admission.prepareTicket(mesh,{});const remove=admission.registerAuxiliaryTarget(target);assert.equal(fresh.valid(),false);remove();}finally{admission.dispose();target.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('device loss invalidates previously prepared tickets and prevents publication',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),failures=[];let lose,published=0;
 const renderer={backend:{isWebGPUBackend:true,device:{lost:new Promise(resolve=>{lose=resolve;})}},compileAsync:()=>Promise.resolve()},admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:error=>failures.push(error.message)});
 try{const ticket=await admission.prepareTicket(mesh,{});assert.equal(ticket.valid(),true);lose({reason:'destroyed'});await new Promise(resolve=>setImmediate(resolve));assert.equal(ticket.valid(),false);await assert.rejects(admission.prepareManyAndPublish([],()=>published++),/device lost: destroyed/);await assert.rejects(admission.prepareAndPublish(mesh,{},()=>published++),/device lost: destroyed/);assert.equal(published,0);assert.deepEqual(failures,['WebGPU device lost: destroyed']);}finally{admission.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('a group publishes only after every prepared object is still current',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),a=new THREE.Mesh(),b=new THREE.Mesh(),pending=[];let published=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(object){return new Promise(resolve=>pending.push({object,resolve}));}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{const ready=admission.prepareManyAndPublish([{object:a},{object:b}],()=>published++);await turn();pending[0].resolve();await turn();assert.equal(pending[1].object,b);a.material.needsUpdate=true;pending[1].resolve();await turn();assert.equal(published,0);assert.equal(pending[2].object,a);pending[2].resolve();await ready;assert.equal(published,1);}finally{admission.dispose();a.geometry.dispose();a.material.dispose();b.geometry.dispose();b.material.dispose();}
});

test('removing an auxiliary target while it compiles avoids retries using retired resources',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),framebuffer={},target=new THREE.RenderTarget(2,2),calls=[];let current=null,finish;const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,_getFrameBufferTarget:()=>framebuffer,setRenderTarget:value=>{current=value;},compileAsync(){calls.push(current);return calls.length===2?new Promise(resolve=>{finish=resolve;}):Promise.resolve();}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),remove=admission.registerAuxiliaryTarget(target);try{const ready=admission.prepare(mesh);await new Promise(resolve=>setImmediate(resolve));mesh.material.needsUpdate=true;remove();finish();await ready;assert.deepEqual(calls,[framebuffer,target,framebuffer]);}finally{admission.dispose();target.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('a framebuffer replaced during compilation must be prepared before admission',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),firstTarget={},nextTarget={};let framebuffer=firstTarget,current=null;const pending=[],targets=[];
 const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,_getFrameBufferTarget:()=>framebuffer,setRenderTarget(target){current=target;},compileAsync(){targets.push(current);return new Promise(resolve=>pending.push(resolve));}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera}),ready=admission.prepare(object);await Promise.resolve();assert.deepEqual(targets,[firstTarget]);framebuffer=nextTarget;pending[0]();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(targets,[firstTarget,nextTarget]);pending[1]();await ready;assert.equal(current,null);admission.dispose();
});

test('structural changes during compilation require a fresh admission',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial()),target={samples:1,texture:{format:1,type:1,colorSpace:''}},pending=[];
 mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3));
 const renderer={backend:{isWebGPUBackend:true},_getFrameBufferTarget:()=>target,setRenderTarget(){},compileAsync(){return new Promise(resolve=>pending.push(resolve));}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),ready=admission.prepare(mesh);
 await Promise.resolve();mesh.material.needsUpdate=true;pending[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,2);
 mesh.geometry.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0],3));pending[1]();await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,3);
 target.samples=4;pending[2]();await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,4);
 mesh.position.x=3;mesh.geometry.attributes.position.needsUpdate=true;pending[3]();await ready;assert.equal(pending.length,4);admission.dispose();
});

test('camera, object and light layer changes invalidate an in-flight admission',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),sun=new THREE.DirectionalLight(),pending=[];
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){return new Promise(resolve=>pending.push(resolve));}},admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun]}),ready=admission.prepare(mesh),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{
  await turn();camera.layers.enable(1);pending[0]();await turn();assert.equal(pending.length,2);
  mesh.layers.enable(1);pending[1]();await turn();assert.equal(pending.length,3);
  sun.layers.enable(1);pending[2]();await turn();assert.equal(pending.length,4);
  pending[3]();await ready;
 }finally{admission.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('buffer and morph format changes invalidate an in-flight admission',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),geometry=new THREE.BufferGeometry(),position=new THREE.BufferAttribute(new Float32Array(9),3),index=new THREE.BufferAttribute(new Uint16Array([0,1,2]),1),morph=new THREE.BufferAttribute(new Float32Array(9),3),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial()),pending=[];
 geometry.setAttribute('position',position);geometry.setIndex(index);geometry.morphAttributes.position=[morph];
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){return new Promise(resolve=>pending.push(resolve));}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),ready=admission.prepare(mesh),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{
  await turn();position.array=new Uint16Array(9);pending[0]();await turn();assert.equal(pending.length,2);
  index.array=new Uint32Array([0,1,2]);pending[1]();await turn();assert.equal(pending.length,3);
  morph.normalized=true;pending[2]();await turn();assert.equal(pending.length,4);
  position.array[0]=5;position.needsUpdate=true;pending[3]();await ready;assert.equal(pending.length,4);
 }finally{admission.dispose();geometry.dispose();mesh.material.dispose();}
});

test('material visibility and geometry groups invalidate an in-flight admission',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),geometry=new THREE.BufferGeometry(),materials=[new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial()],mesh=new THREE.Mesh(geometry,materials),pending=[];geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));geometry.addGroup(0,3,0);materials[1].visible=false;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){return new Promise(resolve=>pending.push(resolve));}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),ready=admission.prepare(mesh),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{await turn();geometry.addGroup(0,3,1);pending[0]();await turn();assert.equal(pending.length,2);materials[1].visible=true;pending[1]();await turn();assert.equal(pending.length,3);geometry.groups[1].materialIndex=0;pending[2]();await turn();assert.equal(pending.length,4);pending[3]();await ready;}finally{admission.dispose();geometry.dispose();for(const material of materials)material.dispose();}
});

test('material pipeline state and sampler changes invalidate without needsUpdate',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),material=new THREE.MeshStandardMaterial(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),material),texture=new THREE.Texture(),pending=[];
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>pending.push(resolve))},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),ready=admission.prepare(mesh),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{await turn();material.side=THREE.BackSide;pending[0]();await turn();assert.equal(pending.length,2);material.map=texture;pending[1]();await turn();assert.equal(pending.length,3);texture.wrapS=THREE.RepeatWrapping;pending[2]();await turn();assert.equal(pending.length,4);material.opacity=.5;material.roughness=.7;pending[3]();await ready;assert.equal(pending.length,4);}finally{admission.dispose();texture.dispose();mesh.geometry.dispose();material.dispose();}
});
test('renderer output and shadow configuration invalidate pending pipelines',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),pending=[],renderer={backend:{isWebGPUBackend:true},toneMapping:THREE.NoToneMapping,shadowMap:{enabled:true,type:THREE.PCFShadowMap},compileAsync:()=>new Promise(resolve=>pending.push(resolve))},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),ready=admission.prepare(mesh),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{await turn();renderer.shadowMap.type=THREE.BasicShadowMap;pending[0]();await turn();assert.equal(pending.length,2);renderer.toneMapping=THREE.ACESFilmicToneMapping;pending[1]();await turn();assert.equal(pending.length,3);pending[2]();await ready;}finally{admission.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});
test('compatible RGBA and BC7 texture bindings do not invalidate a pending material',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),placeholder=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1),compressed=new THREE.CompressedTexture([],1,1,THREE.RGBA_BPTC_Format),material=new MeshStandardNodeMaterial({map:placeholder}),mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);let finish,calls=0;
 for(const key of ['mapping','magFilter','minFilter','wrapS','wrapT','wrapR','colorSpace','channel','anisotropy'])compressed[key]=placeholder[key];
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){calls++;return new Promise(resolve=>{finish=resolve;});}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),ready=admission.prepare(mesh);
 try{await new Promise(resolve=>setImmediate(resolve));material.map=compressed;finish();await ready;assert.equal(calls,1);}finally{admission.dispose();placeholder.dispose();compressed.dispose();mesh.geometry.dispose();material.dispose();}
});
test('different WebGPU texture sample types still invalidate pending material admission',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),rgba=new THREE.DataTexture(new Uint8Array(4),1,1),integer=new THREE.DataTexture(new Uint32Array(4),1,1,THREE.RGBAIntegerFormat,THREE.UnsignedIntType),material=new THREE.MeshStandardMaterial({map:rgba}),mesh=new THREE.Mesh(new THREE.BoxGeometry(),material),pending=[];
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>pending.push(resolve))},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),ready=admission.prepare(mesh),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{await turn();material.map=integer;pending[0]();await turn();assert.equal(pending.length,2);pending[1]();await ready;}finally{admission.dispose();rgba.dispose();integer.dispose();mesh.geometry.dispose();material.dispose();}
});

test('device loss rejects active admission without waiting for the compiler',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group();let lose;
 const renderer={backend:{isWebGPUBackend:true,device:{lost:new Promise(resolve=>{lose=resolve;})}},compileAsync:()=>new Promise(()=>{})};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera}),pending=admission.prepare(object);
 await Promise.resolve();lose({reason:'destroyed'});await assert.rejects(pending,/device lost: destroyed/);admission.dispose();
});

test('preparation includes objects outside the camera and restores their culling',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),mesh=new THREE.Mesh();object.add(mesh);
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){assert.equal(mesh.frustumCulled,false);return Promise.resolve();}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera});await admission.prepare(object);assert.equal(mesh.frustumCulled,true);admission.dispose();
});

test('hidden alternate meshes are included in both passes without becoming visible between frames',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),original=new THREE.Mesh(),alternate=new THREE.Mesh(),sun=new THREE.DirectionalLight();root.visible=false;original.visible=true;alternate.visible=false;original.castShadow=alternate.castShadow=sun.castShadow=true;sun.shadow.map={};root.add(original,alternate);let colorFinish,shadowFinish;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){assert.equal(root.visible,true);assert.equal(original.visible,true);assert.equal(alternate.visible,true);return new Promise(resolve=>{colorFinish=resolve;});},compileShadowAsync(){assert.equal(root.visible,true);assert.equal(original.visible,true);assert.equal(alternate.visible,true);return new Promise(resolve=>{shadowFinish=resolve;});}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true}),pending=admission.prepare(root,{include:[original,alternate]});await Promise.resolve();assert.equal(root.visible,false);assert.equal(original.visible,true);assert.equal(alternate.visible,false);colorFinish();await new Promise(resolve=>setImmediate(resolve));assert.equal(root.visible,false);assert.equal(original.visible,true);assert.equal(alternate.visible,false);shadowFinish();await pending;admission.dispose();
});
test('included alternatives under hidden parents reach both passes without revealing their hierarchy',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),parent=new THREE.Group(),alternate=new THREE.Mesh(),sun=new THREE.DirectionalLight();root.add(parent);parent.add(alternate);parent.visible=false;alternate.visible=false;alternate.castShadow=sun.castShadow=true;sun.shadow.map={};let colorFinish,shadowFinish;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){assert.equal(parent.visible,true);assert.equal(alternate.visible,true);return new Promise(resolve=>{colorFinish=resolve;});},compileShadowAsync(){assert.equal(parent.visible,true);assert.equal(alternate.visible,true);return new Promise(resolve=>{shadowFinish=resolve;});}},admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true}),pending=admission.prepare(root,{include:[alternate]});
 try{await Promise.resolve();assert.equal(parent.visible,false);assert.equal(alternate.visible,false);colorFinish();await new Promise(resolve=>setImmediate(resolve));assert.equal(parent.visible,false);assert.equal(alternate.visible,false);shadowFinish();await pending;assert.equal(parent.visible,false);assert.equal(alternate.visible,false);}finally{admission.dispose();alternate.geometry.dispose();alternate.material.dispose();}
});
test('a reparented alternative cannot be compiled through its former owner',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),other=new THREE.Group(),alternate=new THREE.Mesh(),pending=[];root.add(alternate);other.visible=false;
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>pending.push(resolve))},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),first=admission.prepare(root,{include:[alternate]}),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{await turn();other.add(alternate);pending[0]();await assert.rejects(first,/changed ownership/);assert.equal(other.visible,false);const later=admission.prepare(root);await turn();pending[1]();await later;}finally{admission.dispose();alternate.geometry.dispose();alternate.material.dispose();}
});
test('a ticket covers visibility switches for explicitly included alternatives',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),original=new THREE.Mesh(),alternate=new THREE.Mesh();root.add(original,alternate);alternate.visible=false;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){assert.equal(original.visible,true);assert.equal(alternate.visible,true);return Promise.resolve();}},admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 try{const ticket=await admission.prepareTicket(root,{include:[original,alternate]});original.visible=false;alternate.visible=true;assert.equal(ticket.valid(),true);alternate.material.side=THREE.BackSide;assert.equal(ticket.valid(),false);}finally{admission.dispose();for(const mesh of [original,alternate]){mesh.geometry.dispose();mesh.material.dispose();}}
});
test('admission cannot temporarily reveal objects owned by another root',async()=>{const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),other=new THREE.Mesh(),admission=createWebGpuPipelineAdmission({renderer:{backend:{isWebGPUBackend:true},compileAsync:()=>Promise.resolve()},scene,camera});await assert.rejects(admission.prepare(root,{include:[other]}),/Invalid admission visibility/);admission.dispose();});

test('compilation suppresses implicit shadow updates only during synchronous setup',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),sun=new THREE.DirectionalLight();scene.add(sun);sun.castShadow=true;sun.shadow.autoUpdate=true;sun.shadow.needsUpdate=true;let finish;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){assert.equal(sun.castShadow,true);assert.equal(sun.shadow.autoUpdate,false);assert.equal(sun.shadow.needsUpdate,false);return new Promise(resolve=>{finish=resolve;});}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera}),pending=admission.prepare(object);await Promise.resolve();
 assert.equal(sun.shadow.autoUpdate,true);assert.equal(sun.shadow.needsUpdate,true);finish();await pending;admission.dispose();
});

test('synchronous preparation failure restores the original shadow flags',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),sun=new THREE.DirectionalLight();scene.add(sun);sun.shadow.autoUpdate=true;sun.shadow.needsUpdate=true;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){throw Error('setup failed');}},admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 await assert.rejects(admission.prepare(object),/setup failed/);assert.equal(sun.shadow.autoUpdate,true);assert.equal(sun.shadow.needsUpdate,true);
});

test('shadow lights can be registered and removed without scanning the scene per admission',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),sun=new THREE.DirectionalLight();sun.shadow.autoUpdate=true;let calls=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){calls++;assert.equal(sun.shadow.autoUpdate,calls>1);return Promise.resolve();}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[]}),remove=admission.registerShadowLight(sun);
 scene.traverse=()=>{throw Error('unexpected scene scan');};await admission.prepare(object);remove();await admission.prepare(object);assert.equal(calls,2);admission.dispose();
});

test('a shared shadow light stays registered until every owner releases it',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),sun=new THREE.DirectionalLight();let expected=false;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){assert.equal(sun.shadow.autoUpdate,expected);return Promise.resolve();}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[]}),a=admission.registerShadowLight(sun),b=admission.registerShadowLight(sun);
 a();a();await admission.prepare(object);b();expected=true;await admission.prepare(object);admission.dispose();
});

test('a light added during compilation requires preparation against the updated scene',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),sun=new THREE.DirectionalLight(),pending=[];
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){return new Promise(resolve=>pending.push(resolve));}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[]});let admitted=false;
 const ready=admission.prepare(object).then(()=>{admitted=true;});await Promise.resolve();assert.equal(pending.length,1);
 scene.add(sun);admission.registerShadowLight(sun);pending[0]();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(admitted,false);assert.equal(pending.length,2);pending[1]();await ready;assert.equal(admitted,true);admission.dispose();
});

test('changing shadow light ownership without changing membership does not restart compilation',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),sun=new THREE.DirectionalLight(),pending=[];
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){return new Promise(resolve=>pending.push(resolve));}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun]}),ready=admission.prepare(object);await Promise.resolve();
 const release=admission.registerShadowLight(sun);release();pending[0]();await ready;assert.equal(pending.length,1);admission.dispose();
});

test('removing a shadow light during compilation invalidates that admission',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),sun=new THREE.DirectionalLight(),pending=[];
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){return new Promise(resolve=>pending.push(resolve));}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[]}),release=admission.registerShadowLight(sun),ready=admission.prepare(object);await Promise.resolve();
 release();pending[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,2);pending[1]();await ready;admission.dispose();
});

test('shadow-enabled admission waits for both passes and keeps the object hidden',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),mesh=new THREE.Mesh(),sun=new THREE.DirectionalLight();object.add(mesh);object.visible=false;mesh.castShadow=true;sun.castShadow=true;sun.shadow.map={};
 let colorFinish,shadowFinish;const renderer={backend:{isWebGPUBackend:true},compileAsync(){return new Promise(resolve=>{colorFinish=resolve;});},compileShadowAsync(root,actualScene,actualCamera,light){assert.equal(root,object);assert.equal(actualScene,scene);assert.equal(actualCamera,camera);assert.equal(light,sun);assert.equal(root.visible,true);assert.equal(mesh.frustumCulled,false);return new Promise(resolve=>{shadowFinish=resolve;});}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true});let admitted=false;const ready=admission.prepare(object).then(()=>{admitted=true;});await Promise.resolve();
 colorFinish();await new Promise(resolve=>setImmediate(resolve));assert.equal(object.visible,false);assert.equal(mesh.frustumCulled,true);assert.equal(admitted,false);assert.equal(typeof shadowFinish,'function');shadowFinish();await ready;assert.equal(admitted,true);admission.dispose();
});

test('shadow-enabled admission fails closed when shadow preparation fails',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Mesh(),sun=new THREE.DirectionalLight(),failures=[];object.castShadow=true;sun.castShadow=true;sun.shadow.map={};
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>Promise.resolve(),compileShadowAsync(){throw Error('shadow target missing');}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true,onFatal:error=>failures.push(error.message)});
 await assert.rejects(admission.prepare(object),/shadow target missing/);assert.deepEqual(failures,['shadow target missing']);
});

test('cancelling while the shadow pipeline is pending never publishes the object',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Mesh(),sun=new THREE.DirectionalLight(),controller=new AbortController();object.castShadow=true;object.visible=false;sun.castShadow=true;sun.shadow.map={};let finish;
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>Promise.resolve(),compileShadowAsync:()=>new Promise(resolve=>{finish=resolve;})};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true});const ready=admission.prepare(object,{signal:controller.signal});await new Promise(resolve=>setImmediate(resolve));
 controller.abort();await assert.rejects(ready,{name:'AbortError'});assert.equal(object.visible,false);finish();admission.dispose();
});

test('shadow admission waits for the target created by the ordinary world render',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Mesh(),sun=new THREE.DirectionalLight();object.castShadow=true;object.visible=false;sun.castShadow=true;let shadowCalls=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>Promise.resolve(),compileShadowAsync(){shadowCalls++;return Promise.resolve();}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true});let admitted=false;const ready=admission.prepare(object).then(()=>{admitted=true;});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(admitted,false);assert.equal(shadowCalls,0);assert.equal(object.visible,false);admission.notifyShadowTargets();await Promise.resolve();assert.equal(shadowCalls,0);
 sun.shadow.map={};admission.notifyShadowTargets();await ready;assert.equal(shadowCalls,1);assert.equal(admitted,true);admission.dispose();
});

test('recovery admission rejects a missing shadow target without parking or poisoning normal admission',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Mesh(),sun=new THREE.DirectionalLight(),errors=[];object.castShadow=true;sun.castShadow=true;const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>Promise.resolve(),compileShadowAsync:()=>Promise.resolve()},admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true,onFatal:error=>errors.push(error)});
 try{await assert.rejects(admission.prepareTicket(object,{requireShadowTarget:true}),{code:'shadow-target-unavailable'});assert.deepEqual(errors,[]);const controller=new AbortController(),normal=admission.prepare(object,{signal:controller.signal});await new Promise(resolve=>setImmediate(resolve));controller.abort();await assert.rejects(normal,{name:'AbortError'});assert.deepEqual(errors,[]);}finally{admission.dispose();}
});
test('recovery admission accepts the target created while compiling an actual receiver',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),receiver=new THREE.Mesh(),caster=new THREE.Mesh(),sun=new THREE.DirectionalLight(),calls=[];caster.castShadow=true;sun.castShadow=true;const renderer={backend:{isWebGPUBackend:true},compileAsync(object){calls.push(object===receiver?'receiver':'caster');if(object===receiver)sun.shadow.map={};return Promise.resolve();},compileShadowAsync(){calls.push('shadow');return Promise.resolve();}},admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true});
 try{await admission.prepareTicket(receiver,{requireShadowTarget:true});await admission.prepareTicket(caster,{requireShadowTarget:true});assert.deepEqual(calls,['receiver','caster','shadow']);}finally{admission.dispose();}
});

test('a missing shadow target does not block later non-casting objects from admission',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),caster=new THREE.Mesh(),receiver=new THREE.Mesh(),sun=new THREE.DirectionalLight(),calls=[];caster.castShadow=true;caster.visible=false;receiver.visible=false;sun.castShadow=true;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(object){calls.push(object===caster?'caster':'receiver');return Promise.resolve();},compileShadowAsync(object){assert.equal(object,caster);calls.push('shadow');return Promise.resolve();}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true});let casterReady=false;const first=admission.prepare(caster).then(()=>{casterReady=true;});await new Promise(resolve=>setImmediate(resolve));
 await admission.prepare(receiver);assert.deepEqual(calls,['caster','receiver']);assert.equal(casterReady,false);assert.equal(caster.visible,false);
 sun.shadow.map={};admission.notifyShadowTargets();await first;assert.deepEqual(calls,['caster','receiver','caster','shadow']);assert.equal(casterReady,true);admission.dispose();
});

test('cancelling a parked shadow request does not affect following admissions',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),caster=new THREE.Mesh(),sun=new THREE.DirectionalLight(),controller=new AbortController(),failures=[];caster.castShadow=true;sun.castShadow=true;
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>Promise.resolve(),compileShadowAsync:()=>Promise.resolve()},admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true,onFatal:error=>failures.push(error)});
 const pending=admission.prepare(caster,{signal:controller.signal});await new Promise(resolve=>setImmediate(resolve));controller.abort();await assert.rejects(pending,{name:'AbortError'});await admission.prepare(new THREE.Mesh());assert.deepEqual(failures,[]);admission.dispose();
});

test('cancelling a target wait does not strand the admission queue',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Mesh(),next=new THREE.Mesh(),sun=new THREE.DirectionalLight(),controller=new AbortController();object.castShadow=true;sun.castShadow=true;let calls=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){calls++;return Promise.resolve();},compileShadowAsync(){throw Error('unexpected shadow compile');}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true});const first=admission.prepare(object,{signal:controller.signal});await new Promise(resolve=>setImmediate(resolve));const second=admission.prepare(next);
 controller.abort();await assert.rejects(first,{name:'AbortError'});await second;assert.equal(calls,2);admission.dispose();
});

test('removing a light releases its target wait and recompiles with the new light set',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Mesh(),sun=new THREE.DirectionalLight();object.castShadow=true;sun.castShadow=true;let calls=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){calls++;return Promise.resolve();},compileShadowAsync(){throw Error('unexpected shadow compile');}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[],includeShadowPass:true}),release=admission.registerShadowLight(sun),ready=admission.prepare(object);await new Promise(resolve=>setImmediate(resolve));release();await ready;assert.equal(calls,2);admission.dispose();
});

test('replacing a shadow map while it compiles requires admission of the replacement',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Mesh(),sun=new THREE.DirectionalLight(),pending=[];object.castShadow=true;sun.castShadow=true;sun.shadow.map={};let colors=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){colors++;return Promise.resolve();},compileShadowAsync(){return new Promise(resolve=>pending.push(resolve));}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true});let admitted=false;const ready=admission.prepare(object).then(()=>{admitted=true;});await new Promise(resolve=>setImmediate(resolve));
 sun.shadow.map={};pending[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(admitted,false);assert.equal(colors,2);assert.equal(pending.length,2);pending[1]();await ready;admission.dispose();
});

test('enabling shadows on a registered light during compilation revisits its passes',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Mesh(),sun=new THREE.DirectionalLight(),pending=[];object.castShadow=true;sun.shadow.map={};let shadowCalls=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){return new Promise(resolve=>pending.push(resolve));},compileShadowAsync(){shadowCalls++;return Promise.resolve();}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true}),ready=admission.prepare(object);await Promise.resolve();sun.castShadow=true;pending[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,2);pending[1]();await ready;assert.equal(shadowCalls,1);admission.dispose();
});

test('aborting an actor does not retire the shared renderer or publish a late result',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),controller=new AbortController(),failures=[];let finish;
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;})};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:e=>failures.push(e)}),pending=admission.prepare(object,{signal:controller.signal});
 await Promise.resolve();controller.abort();await assert.rejects(pending,{name:'AbortError'});finish();assert.deepEqual(failures,[]);admission.dispose();
});

test('a cancelled active compile must settle before the next compile starts',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),first=new THREE.Group(),second=new THREE.Group(),controller=new AbortController(),calls=[];let finish;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(object){calls.push(object);return object===first?new Promise(resolve=>{finish=resolve;}):Promise.resolve();}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera}),cancelled=admission.prepare(first,{signal:controller.signal});await Promise.resolve();controller.abort();await assert.rejects(cancelled,{name:'AbortError'});
 const next=admission.prepare(second);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[first]);finish();await next;assert.deepEqual(calls,[first,second]);admission.dispose();
});

test('a cancelled shadow compile also serializes the next preparation',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),first=new THREE.Mesh(),second=new THREE.Mesh(),sun=new THREE.DirectionalLight(),controller=new AbortController(),calls=[];first.castShadow=true;sun.castShadow=true;sun.shadow.map={};let finish;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(object){calls.push(object);return Promise.resolve();},compileShadowAsync(){return new Promise(resolve=>{finish=resolve;});}},admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true});
 const cancelled=admission.prepare(first,{signal:controller.signal});await new Promise(resolve=>setImmediate(resolve));controller.abort();await assert.rejects(cancelled,{name:'AbortError'});const next=admission.prepare(second);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[first]);finish();await next;assert.deepEqual(calls,[first,second]);admission.dispose();
});

test('late failure of a cancelled compile rejects queued work before it starts',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),controller=new AbortController(),failures=[];let reject,calls=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){calls++;return new Promise((_,fail)=>{reject=fail;});}},admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:error=>failures.push(error.message)});
 const cancelled=admission.prepare(new THREE.Group(),{signal:controller.signal});await Promise.resolve();controller.abort();await assert.rejects(cancelled,{name:'AbortError'});const queued=admission.prepare(new THREE.Group()),result=assert.rejects(queued,/closed/);reject(Error('late failure'));await result;assert.equal(calls,1);assert.deepEqual(failures,['late failure']);
});

test('a cancelled compilation that later fails still retires its renderer',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),controller=new AbortController(),failures=[];let reject;
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise((_,r)=>{reject=r;})};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:e=>failures.push(e.message)}),pending=admission.prepare(object,{signal:controller.signal});
 await Promise.resolve();controller.abort();await assert.rejects(pending,{name:'AbortError'});reject(Error('late failure'));await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(failures,['late failure']);await assert.rejects(admission.prepare(object),/closed/);
});

test('an aborted queued object is removed without waiting for the active compilation',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),first=new THREE.Group(),second=new THREE.Group(),controller=new AbortController();let finish,calls=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){calls++;return new Promise(resolve=>{finish=resolve;});}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera}),active=admission.prepare(first);await Promise.resolve();
 const queued=admission.prepare(second,{signal:controller.signal}),rejected=assert.rejects(queued,{name:'AbortError'});controller.abort();await rejected;
 assert.equal(calls,1);finish();await active;await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);admission.dispose();
});

test('disposing rejects queued admissions even if the active compiler never finishes',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group();let calls=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){calls++;return new Promise(()=>{});}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera}),active=admission.prepare(object);await Promise.resolve();
 const queued=admission.prepare(object),results=Promise.allSettled([active,queued]);admission.dispose();
 assert.deepEqual((await results).map(result=>result.status),['rejected','rejected']);assert.equal(calls,1);
});

test('a failed active pipeline rejects queued work without compiling it',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),failures=[];let reject,calls=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync(){calls++;return new Promise((_,fail)=>{reject=fail;});}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:error=>failures.push(error.message)}),active=admission.prepare(object);await Promise.resolve();
 const waiting=admission.prepare(object),results=Promise.allSettled([active,waiting]);reject(Error('pipeline failed'));
 const [a,b]=await results;assert.equal(a.reason.message,'pipeline failed');assert.match(b.reason.message,/closed/);assert.deepEqual(failures,['pipeline failed']);assert.equal(calls,1);
});

test('structural revision changes only when registered pass or light membership changes',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),renderer={backend:{isWebGPUBackend:true},compileAsync:()=>Promise.resolve(),getRenderTarget:()=>null,setRenderTarget(){}},admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[]}),light=new THREE.DirectionalLight(),target=new THREE.RenderTarget(2,2);
 try{const start=admission.structuralRevision,a=admission.registerShadowLight(light);assert.equal(admission.structuralRevision,start+1);const b=admission.registerShadowLight(light);assert.equal(admission.structuralRevision,start+1);a();assert.equal(admission.structuralRevision,start+1);b();assert.equal(admission.structuralRevision,start+2);const c=admission.registerAuxiliaryTarget(target),d=admission.registerAuxiliaryTarget(target);assert.equal(admission.structuralRevision,start+3);c();assert.equal(admission.structuralRevision,start+3);d();assert.equal(admission.structuralRevision,start+4);}finally{admission.dispose();target.dispose();}
});

test('material alternatives compile on the real object in color, shadow and auxiliary passes without appearing during waits',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),original=mesh.material,candidate=new THREE.MeshBasicMaterial(),sun=new THREE.DirectionalLight(),target=new THREE.RenderTarget(2,2),jobs=[];let current=null;mesh.castShadow=true;sun.castShadow=true;sun.shadow.map=new THREE.RenderTarget(2,2);scene.add(mesh,sun);
 const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>current,setRenderTarget:value=>{current=value;},compileAsync(object){assert.equal(object,mesh);assert.equal(mesh.material,candidate);const kind=current===target?'aux':'color';return new Promise(resolve=>jobs.push({kind,resolve}));},compileShadowAsync(object){assert.equal(object,mesh);assert.equal(mesh.material,candidate);return new Promise(resolve=>jobs.push({kind:'shadow',resolve}));}},admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[sun],includeShadowPass:true}),unregister=admission.registerAuxiliaryTarget(target),turn=()=>new Promise(resolve=>setImmediate(resolve));let published=false;
 try{const pending=admission.prepareAndPublish(mesh,{materialAlternatives:[{mesh,material:candidate}]},()=>{assert.equal(mesh.material,original);mesh.material=candidate;published=true;});await turn();assert.deepEqual(jobs.map(j=>j.kind),['color']);assert.equal(mesh.material,original);jobs[0].resolve();await turn();assert.deepEqual(jobs.map(j=>j.kind),['color','shadow']);assert.equal(mesh.material,original);jobs[1].resolve();await turn();assert.deepEqual(jobs.map(j=>j.kind),['color','shadow','aux']);assert.equal(mesh.material,original);jobs[2].resolve();await pending;assert.equal(published,true);assert.equal(mesh.material,candidate);}
 finally{unregister();admission.dispose();mesh.geometry.dispose();original.dispose();candidate.dispose();target.dispose();sun.shadow.map.dispose();}
});

test('cancelled or stale material alternatives never replace the current owner',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),original=mesh.material,candidate=new THREE.MeshBasicMaterial(),replacement=new THREE.MeshBasicMaterial(),controller=new AbortController(),jobs=[],errors=[],renderer={backend:{isWebGPUBackend:true},compileAsync(){assert.equal(mesh.material,candidate);return new Promise(resolve=>jobs.push(resolve));}},admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:e=>errors.push(e)}),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{let pending=admission.prepareAndPublish(mesh,{signal:controller.signal,materialAlternatives:[{mesh,material:candidate}]},()=>assert.fail('cancelled'));await turn();assert.equal(mesh.material,original);controller.abort();await assert.rejects(pending,{name:'AbortError'});jobs.shift()();await turn();assert.equal(mesh.material,original);pending=admission.prepareAndPublish(mesh,{materialAlternatives:[{mesh,material:candidate}]},()=>assert.fail('stale'));await turn();mesh.material=replacement;jobs.shift()();await assert.rejects(pending,/ownership changed/);assert.equal(mesh.material,replacement);assert.deepEqual(errors,[]);}
 finally{admission.dispose();mesh.geometry.dispose();original.dispose();candidate.dispose();replacement.dispose();}
});

test('a detached alternative mesh cannot be admitted or overwrite its new owner',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),mesh=new THREE.Mesh(),original=mesh.material,candidate=new THREE.MeshBasicMaterial(),other=new THREE.Group(),errors=[];root.add(mesh);scene.add(root,other);let finish;const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:e=>errors.push(e)}),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{const pending=admission.prepareAndPublish(root,{materialAlternatives:[{mesh,material:candidate}]},()=>assert.fail('detached'));await turn();other.add(mesh);finish();await assert.rejects(pending,/ownership changed/);assert.equal(mesh.parent,other);assert.equal(mesh.material,original);assert.deepEqual(errors,[]);}finally{admission.dispose();mesh.geometry.dispose();original.dispose();candidate.dispose();}
});
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';

test('renderer generation lease survives shutdown until in-flight compilation settles',async()=>{
 const registry=createWebGpuResourceRegistry(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();let finish,disposed=0;const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;}),dispose(){disposed++;}},lease=registry.adopt({namespace:'renderer',key:'main',dispose:()=>renderer.dispose()}),admission=createWebGpuPipelineAdmission({renderer,scene,camera});lease.commit();const pending=admission.prepare(new THREE.Group());await Promise.resolve();const rejected=assert.rejects(pending,/cancelled/);registry.dispose();admission.dispose();const shutdown=closeWebGpuRenderer({dispose:()=>lease.release()},admission);await rejected;assert.equal(registry.status().owned.length,1);assert.equal(disposed,0);finish();await shutdown;assert.equal(disposed,1);assert.equal(registry.status().owned.length,0);
});

test('batch tickets distinguish expected scene attachment from ownership or material changes',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),renderer={backend:{isWebGPUBackend:true},compileAsync:async()=>{}},admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 const root=new THREE.Group(),child=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());root.add(child);
 try{
  const ticket=await admission.prepareTicket(root);assert.equal(ticket.valid(),true);assert.equal(ticket.validAfterAttach(),false);
  scene.add(root);assert.equal(ticket.valid(),false);assert.equal(ticket.validAfterAttach(),true);
  child.material.side=THREE.DoubleSide;assert.equal(ticket.validAfterAttach(),false);child.material.side=THREE.FrontSide;
  const other=new THREE.Group();scene.add(other);other.add(root);assert.equal(ticket.validAfterAttach(),false);
  scene.add(root);child.removeFromParent();assert.equal(ticket.validAfterAttach(),false);
 }finally{admission.dispose();child.geometry.dispose();child.material.dispose();}
});
