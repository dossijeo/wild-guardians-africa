import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {uniform} from 'three/tsl';
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
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';
test('water placeholders and pending uploads retain generation leases until both fences complete',async()=>{
 const registry=createWebGpuResourceRegistry(),waits=[],renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>waits.push(resolve))},lost:new Promise(()=>{})}},initTexture(){}},environment=createWebGpuWaterEnvironment({renderer,resourceRegistry:registry}),pending=environment.install([pixels(5),pixels(6)]);
 assert.equal(registry.status().owned.length,4);registry.dispose();environment.dispose();await assert.rejects(pending,/cancelled|closed/i);assert.equal(registry.status().owned.length,4);for(const resolve of waits)resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(registry.status().owned.length,0);
});

test('a replacement waits for its uploaded environment and restores the original fade origin',async()=>{
 const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:async()=>{}},lost:new Promise(()=>{})}},initTexture(){}};
 const oldClock=uniform(Math.fround(47.8)),original=createWebGpuWaterEnvironment({renderer,clockNode:oldClock});
 const elapsed=48.05,recoveredClock=uniform(Math.fround(elapsed)),replacement=createWebGpuWaterEnvironment({renderer,clockNode:recoveredClock});
 try{
  assert.equal(original.exportRecoveryCheckpoint(),null);
  await original.install([pixels(5),pixels(6)]);oldClock.value=recoveredClock.value;
  const checkpoint=original.exportRecoveryCheckpoint();
  assert.deepEqual(checkpoint,{version:1,readyAt:Math.fround(47.8)});
  let ready,restored=false;
  const readyPromise=new Promise(resolve=>{ready=resolve;});
  const recovery=replacement.restoreRecoveryCheckpoint(checkpoint,{elapsed,ready:readyPromise}).then(()=>{restored=true;});
  await Promise.resolve();assert(!restored);assert.equal(replacement.day.value.image.data[0],64);
  await replacement.install([pixels(5),pixels(6)]);
  assert.equal(replacement.day.value.image.data[0],5);
  assert.equal(replacement.exportRecoveryCheckpoint().readyAt,Math.fround(elapsed));
  ready(true);await recovery;
  assert.deepEqual(replacement.exportRecoveryCheckpoint(),checkpoint);
  await assert.rejects(replacement.restoreRecoveryCheckpoint({...checkpoint,readyAt:elapsed+1},{elapsed}),/Invalid water environment checkpoint/);
  assert.deepEqual(replacement.exportRecoveryCheckpoint(),checkpoint);
 }finally{replacement.dispose();original.dispose();}
});

test('environment recovery rejects missing uploads and leaves cancelled fades unclaimed',async()=>{
 const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:async()=>{}},lost:new Promise(()=>{})}},initTexture(){}};
 const environment=createWebGpuWaterEnvironment({renderer,clockNode:uniform(9)}),checkpoint={version:1,readyAt:8};
 try{
  await assert.rejects(environment.restoreRecoveryCheckpoint(checkpoint,{elapsed:9,ready:Promise.resolve(true)}),/no uploaded textures/);
  await assert.rejects(environment.restoreRecoveryCheckpoint(checkpoint,{elapsed:9,ready:Promise.resolve(false)}),/no uploaded textures/);
  let ready;const pending=new Promise(resolve=>{ready=resolve;});
  const abort=new AbortController(),recovery=environment.restoreRecoveryCheckpoint(checkpoint,{elapsed:9,ready:pending,signal:abort.signal});
  abort.abort();await assert.rejects(recovery,{name:'AbortError'});
  await environment.install([pixels(5),pixels(6)]);ready(true);
  assert.deepEqual(environment.exportRecoveryCheckpoint(),{version:1,readyAt:9});
 }finally{environment.dispose();}
});

test('uploaded recovery textures become visible only at their acknowledged publication',async()=>{
 const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:async()=>{}},lost:new Promise(()=>{})}},initTexture(){}};
 const original=createWebGpuWaterEnvironment({renderer,clockNode:uniform(47.8),deferredPublication:true});
 const replacement=createWebGpuWaterEnvironment({renderer,clockNode:uniform(47.8),deferredPublication:true});
 try{
  await original.install([pixels(5),pixels(6)]);
  assert.equal(original.status().installed,true);
  assert.equal(original.exportRecoveryCheckpoint(),null);
  assert.equal(original.day.value.image.data[0],64);
  const activation=original.proposeActivation(2,48.3);
  assert.deepEqual(activation,{version:1,sequence:2,readyAt:Math.fround(48.3)});
  assert.equal(original.proposeActivation(3,48.35),null);
  assert.throws(()=>original.confirmActivation({...activation,sequence:3}),/acknowledgement/);
  assert.equal(original.day.value.image.data[0],64);
  original.confirmActivation(activation);
  assert.equal(original.day.value.image.data[0],5);
  assert.equal(original.proposeActivation(3,48.35),null);

  await replacement.install([pixels(5),pixels(6)]);
  assert.equal(replacement.exportRecoveryCheckpoint(),null);
  const abandoned=replacement.proposeActivation(3,48.35);
  replacement.resetPendingActivation();
  assert.throws(()=>replacement.confirmActivation(abandoned),/acknowledgement/);
  await replacement.restoreRecoveryCheckpoint(activation,{elapsed:48.3});
  assert.deepEqual(replacement.exportRecoveryCheckpoint(),original.exportRecoveryCheckpoint());
  await assert.rejects(replacement.restoreRecoveryCheckpoint({...activation,readyAt:48},{elapsed:48.3}),/activation changed/);
  assert.equal(replacement.proposeActivation(4,48.4),null);
 }finally{replacement.dispose();original.dispose();}
});
