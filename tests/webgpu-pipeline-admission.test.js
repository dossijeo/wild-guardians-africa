import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';

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

test('aborting an actor does not retire the shared renderer or publish a late result',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),controller=new AbortController(),failures=[];let finish;
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;})};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:e=>failures.push(e)}),pending=admission.prepare(object,{signal:controller.signal});
 await Promise.resolve();controller.abort();await assert.rejects(pending,{name:'AbortError'});finish();assert.deepEqual(failures,[]);admission.dispose();
});

test('a cancelled compilation that later fails still retires its renderer',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),controller=new AbortController(),failures=[];let reject;
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise((_,r)=>{reject=r;})};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:e=>failures.push(e.message)}),pending=admission.prepare(object,{signal:controller.signal});
 await Promise.resolve();controller.abort();await assert.rejects(pending,{name:'AbortError'});reject(Error('late failure'));await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(failures,['late failure']);await assert.rejects(admission.prepare(object),/closed/);
});
