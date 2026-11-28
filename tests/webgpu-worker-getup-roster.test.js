import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createWebGpuWorkerRoster} from '../src/rendering/webgpu-worker-roster.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('a recovery bake waits for earlier admission and rejects a changed fraction',async()=>{
 const entity={id:'w',profile:'youngMale',status:'incapacitated',fallRemaining:0,recovery:{fraction:1,elapsed:.2,duration:3.2}},state={workers:[entity],tasks:[]},root=new Group(),scene=new Group();scene.add(root);let walkDone,recoveryDone,requested=0,installed=0;const roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedWalkBank:{get:()=>new Promise(resolve=>walkDone=resolve)},bakedGetUpBank:{get(){requested++;return new Promise(resolve=>recoveryDone=resolve);}},createWorker:async()=>({root,update(){},async installBakedWalk(){return true;},async installBakedGetUp(_b,{isCurrent}){if(isCurrent())installed++;return isCurrent();},dispose(){root.removeFromParent();}})});
 try{roster.sync();await flush();await flush();assert.equal(requested,1);walkDone({});await flush();await flush();assert.equal(requested,1);entity.recovery.fraction=.5;roster.sync();recoveryDone({});await flush();await flush();assert.equal(installed,0);assert.equal(requested,2);recoveryDone({});await flush();await flush();assert.equal(installed,1);}finally{roster.dispose();}
});
test('a persistent recovery admission failure does not retry without a new confirmed pose',async()=>{
 const entity={id:'w',profile:'youngMale',status:'incapacitated',fallRemaining:0,recovery:{fraction:1,elapsed:.2,duration:3.2}},state={workers:[entity],tasks:[]},root=new Group(),scene=new Group();scene.add(root);let requested=0;const roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedGetUpBank:{async get(){requested++;throw Error('unavailable');}},createWorker:async()=>({root,update(){},dispose(){root.removeFromParent();}})});
 try{roster.sync();for(let i=0;i<4;i++){await flush();roster.sync();}assert.equal(requested,1);entity.recovery.fraction=.5;roster.sync();await flush();assert.equal(requested,2);}finally{roster.dispose();}
});
