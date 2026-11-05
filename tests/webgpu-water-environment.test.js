import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createWebGpuWaterEnvironment} from '../src/rendering/webgpu-water-environment.js';
const pixels=n=>({width:1,height:1,pixels:new Uint8Array([n,n,n,255])});
test('environment bindings change together only after both GPU uploads finish',async()=>{
 const waits=[],uploaded=[],renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>waits.push(resolve))},lost:new Promise(()=>{})}},initTexture:texture=>uploaded.push(texture)},environment=createWebGpuWaterEnvironment({renderer}),day=environment.day,dark=environment.dark,oldDay=day.value,oldDark=dark.value,pending=environment.install([pixels(5),pixels(6)]);
 assert.equal(uploaded.length,1);assert.equal(day.value,oldDay);waits[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(uploaded.length,2);assert.equal(dark.value,oldDark);waits[1]();await pending;assert.equal(environment.day,day);assert.equal(environment.dark,dark);assert.equal(day.value,uploaded[0]);assert.equal(dark.value,uploaded[1]);assert.equal(environment.status().installed,true);const sun=new THREE.DirectionalLight();sun.position.set(0,1,0);environment.update({day:1,time:400},sun);assert.equal(environment.night.value,1);environment.dispose();
});
test('closing during upload rejects installation without publishing a texture',async()=>{
 let finish,uploaded;const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>{finish??=resolve;})},lost:new Promise(()=>{})}},initTexture:texture=>{uploaded=texture;}},environment=createWebGpuWaterEnvironment({renderer}),old=environment.day.value,pending=environment.install([pixels(5),pixels(6)]);let releases=0;uploaded.addEventListener('dispose',()=>releases++);environment.dispose();await assert.rejects(pending,/cancelled|closed/i);assert.equal(environment.day.value,old);finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(releases,1);
});

test('closing waits for submitted rendering before releasing installed environment textures',async()=>{
 let defer=false,finish;const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>defer?new Promise(resolve=>finish=resolve):Promise.resolve()},lost:new Promise(()=>{})}},initTexture(){}},environment=createWebGpuWaterEnvironment({renderer});await environment.install([pixels(5),pixels(6)]);let releases=0;environment.day.value.addEventListener('dispose',()=>releases++);defer=true;environment.dispose();assert.equal(releases,0);finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(releases,1);
});

test('slope and reflections remain placeholders until all compatible WebGPU textures are uploaded',async()=>{
 const waits=[],uploaded=[],renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>waits.push(resolve))},lost:new Promise(()=>{})}},initTexture:texture=>uploaded.push(texture)},environment=createWebGpuWaterEnvironment({renderer,slopeRequired:true}),old=[environment.day.value,environment.dark.value,environment.slope.value],slope={width:1,height:1,pixels:new Uint8Array([128,129])},pending=environment.install([pixels(5),pixels(6)],slope);
 for(let i=0;i<3;i++){assert.equal(uploaded[i].internalFormat,null);assert.equal(uploaded[i].format,i===2?THREE.RGFormat:THREE.RGBAFormat);assert.deepEqual([environment.day.value,environment.dark.value,environment.slope.value],old);waits[i]();await new Promise(resolve=>setImmediate(resolve));}await pending;assert.deepEqual([environment.day.value,environment.dark.value,environment.slope.value],uploaded);environment.dispose();
});
