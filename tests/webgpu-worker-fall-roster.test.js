import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createWebGpuWorkerRoster} from '../src/rendering/webgpu-worker-roster.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('fall waits for earlier admission and never publishes after recovery',async()=>{
 const entity={id:'w',profile:'youngMale',status:'fleeing',fallRemaining:2},state={workers:[entity],tasks:[]},root=new Group(),scene=new Group();scene.add(root);let walkDone,fallDone,requested=0,installed=0;const roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedWalkBank:{get:()=>new Promise(resolve=>walkDone=resolve)},bakedFallBank:{get(){requested++;return new Promise(resolve=>fallDone=resolve);}},createWorker:async()=>({root,update(){},async installBakedWalk(){return true;},async installBakedFall(_b,{isCurrent}){if(isCurrent())installed++;return isCurrent();},dispose(){root.removeFromParent();}})});
 try{roster.sync();await flush();await flush();assert.equal(requested,1);walkDone({});await flush();await flush();assert.equal(requested,1);entity.fallRemaining=0;entity.status='walking';roster.sync();fallDone({});await flush();await flush();assert.equal(installed,0);}finally{roster.dispose();}
});
