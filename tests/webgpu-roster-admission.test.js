import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import {admitRosterActor} from '../src/rendering/webgpu-roster-admission.js';

test('a confirmed structural change is prepared before the actor becomes visible',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),mesh=new THREE.Mesh(),pending=[];root.add(mesh);scene.add(root);
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>pending.push(resolve))},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),entry={controller:new AbortController(),actor:null,pendingActor:null};let updates=0,ready=0;
 const actor={root,update(){updates++;root.visible=true;mesh.visible=false;},dispose(){root.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}};
 const task=admitRosterActor({actor,entry,isCurrent:()=>!entry.controller.signal.aborted,pipelineAdmission:admission,onReady:()=>ready++}),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{await turn();assert.equal(pending.length,1);assert.equal(root.visible,false);pending[0]();await turn();assert.equal(updates,1);assert.equal(root.visible,false);assert.equal(entry.actor,null);assert.equal(pending.length,2);pending[1]();await task;assert.equal(updates,2);assert.equal(root.visible,true);assert.equal(entry.actor,actor);assert.equal(ready,1);}finally{entry.controller.abort();admission.dispose();actor.dispose();}
});

test('cancelling a revised actor cannot publish it or free its active compilation early',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),mesh=new THREE.Mesh(),pending=[];root.add(mesh);scene.add(root);let disposed=0,ready=0;
 const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>pending.push(resolve))},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),entry={controller:new AbortController()},actor={root,update(){root.visible=true;mesh.visible=false;},dispose(){disposed++;root.removeFromParent();}},turn=()=>new Promise(resolve=>setImmediate(resolve));
 const task=admitRosterActor({actor,entry,isCurrent:()=>!entry.controller.signal.aborted,pipelineAdmission:admission,onReady:()=>ready++});
 try{await turn();pending[0]();await turn();assert.equal(pending.length,2);entry.controller.abort();await assert.rejects(task,{name:'AbortError'});assert.equal(root.parent,null);assert.equal(disposed,0);assert.equal(ready,0);pending[1]();await turn();assert.equal(disposed,1);assert.equal(entry.actor,undefined);}finally{admission.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});
import {releaseRosterMotion} from '../src/rendering/webgpu-roster-admission.js';
import {createConfirmedGpuMotion} from '../src/rendering/confirmed-gpu-motion.js';
import {createConfirmedGpuAnimationPhase} from '../src/rendering/confirmed-gpu-animation-phase.js';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';

test('motion and phase texture leases outlive cancelled rig compilation',()=>{
 const root=new THREE.Group(),clock=createConfirmedHistoricalClock({initialElapsed:0}),registry=createWebGpuResourceRegistry(),motion=createConfirmedGpuMotion({actorId:'a',clock,resourceRegistry:registry}),phase=createConfirmedGpuAnimationPhase({clock,resourceRegistry:registry}),deferred=[];let bindingDisposed=0;const entry={actor:{root},motion,phase,motionBinding:{dispose(){bindingDisposed++;}}};
 try{assert.equal(registry.status().owned.length,3);releaseRosterMotion(entry,{deferRelease(object,release){assert.equal(object,root);deferred.push(release);}});registry.dispose();assert.equal(registry.status().owned.length,3);assert.equal(bindingDisposed,0);assert.equal(entry.motion,null);deferred.shift()();assert.equal(bindingDisposed,1);assert.equal(registry.status().owned.length,0);releaseRosterMotion(entry,{});assert.equal(bindingDisposed,1);}finally{clock.dispose();registry.dispose();}
});
