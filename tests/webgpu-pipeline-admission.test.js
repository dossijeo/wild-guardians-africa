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

test('failure permits retry and disposal invalidates a pending result',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group();object.visible=false;
 let resolve,count=0;const renderer={backend:{isWebGPUBackend:true},compileAsync(){if(!count++)return Promise.reject(Error('compile failed'));return new Promise(r=>{resolve=r;});}};
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 await assert.rejects(admission.prepare(object),/compile failed/);
 const pending=admission.prepare(object);await Promise.resolve();admission.dispose();resolve();
 await assert.rejects(pending,/cancelled/);assert.equal(object.visible,false);
 await assert.rejects(admission.prepare(object),/closed/);
});
