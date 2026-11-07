import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Scene,PerspectiveCamera} from 'three';
import {createWebGpuReplacementSlot} from '../src/rendering/webgpu-replacement-slot.js';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';

test('publication callback failure is reported without silently discarding the admitted object',async()=>{
 const errors=[],released=[],slot=createWebGpuReplacementSlot({pipelineAdmission:{prepare:async()=>{}},release:object=>released.push(object),onReady:()=>{throw Error('consumer failed');},onError:error=>errors.push(error.message)}),object=new Group();
 slot.request('v1',()=>object);await new Promise(resolve=>setImmediate(resolve));assert.equal(slot.active,object);assert.deepEqual(errors,['consumer failed']);slot.dispose();assert.deepEqual(released,[object]);
});

test('replacement removes a cancelled object immediately but releases it only after compilation',async()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(),first=new Group(),second=new Group(),released=[],calls=[];let finish;
 const admission=createWebGpuPipelineAdmission({renderer:{backend:{isWebGPUBackend:true},compileAsync(object){calls.push(object);return object===first?new Promise(resolve=>{finish=resolve;}):Promise.resolve();}},scene,camera}),slot=createWebGpuReplacementSlot({pipelineAdmission:admission,release:object=>released.push(object)});
 slot.request('first',()=>first);await new Promise(resolve=>setImmediate(resolve));slot.request('second',()=>second);assert.equal(first.parent,null);assert.deepEqual(released,[]);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[first]);finish();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(released,[first]);assert.deepEqual(calls,[first,second]);assert.equal(slot.active,second);slot.dispose();assert.deepEqual(released,[first,second]);admission.dispose();
});

test('disposing a replacement during compilation retains its resources until completion',async()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(),object=new Group(),released=[];let finish;
 const admission=createWebGpuPipelineAdmission({renderer:{backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},scene,camera}),slot=createWebGpuReplacementSlot({pipelineAdmission:admission,release:value=>released.push(value)});
 slot.request('first',()=>object);await new Promise(resolve=>setImmediate(resolve));slot.dispose();admission.dispose();assert.equal(object.parent,null);assert.deepEqual(released,[]);finish();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(released,[object]);
});
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';

test('structure candidates retain resource ownership until cancellation or deferred replacement completes',async()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(),first=new Group(),second=new Group(),released=[],registry=createWebGpuResourceRegistry();let finish;const admission=createWebGpuPipelineAdmission({renderer:{backend:{isWebGPUBackend:true},compileAsync(object){return object===first?new Promise(resolve=>{finish=resolve;}):Promise.resolve();}},scene,camera}),slot=createWebGpuReplacementSlot({pipelineAdmission:admission,resourceRegistry:registry,release:object=>released.push(object)}),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{slot.request('first',()=>first);await turn();assert.equal(registry.status().owned[0].state,'prepared');slot.request('second',()=>second);assert.equal(registry.status().owned.length,2);finish();await turn();await turn();assert.equal(slot.active,second);assert.deepEqual(released,[first]);assert.equal(registry.status().owned.length,1);assert.equal(registry.status().owned[0].state,'committed');registry.dispose();slot.dispose();assert.deepEqual(released,[first,second]);assert.equal(registry.status().owned.length,0);}finally{slot.dispose();admission.dispose();registry.dispose();}
});
