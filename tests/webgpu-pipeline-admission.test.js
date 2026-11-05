import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import {closeWebGpuRenderer} from '../src/rendering/webgpu-world-surface.js';

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
