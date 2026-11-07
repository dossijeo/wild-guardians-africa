import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createWebGpuWorkerRoster} from '../src/rendering/webgpu-worker-roster.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('harvest loads on confirmed task, serializes with walking and cannot publish after removal',async()=>{
 const entity={id:'w',profile:'youngMale',status:'walking',taskId:'t'},state={workers:[entity],tasks:[{id:'t',kind:'harvest'}]},root=new Group(),scene=new Group();scene.add(root);let walkComplete,harvestComplete,harvestRequests=0,harvestInstalled=0;
 const roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedWalkBank:{get(){return new Promise(resolve=>{walkComplete=resolve;});}},bakedHarvestBank:{get(){harvestRequests++;return new Promise(resolve=>{harvestComplete=resolve;});}},createWorker:async()=>({root,update(){},async installBakedWalk(){return true;},async installBakedHarvest(){harvestInstalled++;return true;},dispose(){root.removeFromParent();}})});
 try{roster.sync();await flush();await flush();assert.equal(harvestRequests,0);entity.status='acting';roster.sync();await flush();assert.equal(harvestRequests,0);walkComplete({});await flush();await flush();assert.equal(harvestRequests,1);for(let i=0;i<5;i++)roster.sync();assert.equal(harvestRequests,1);state.workers=[];roster.sync();harvestComplete({});await flush();await flush();assert.equal(harvestInstalled,0);}finally{roster.dispose();}
});

test('failed harvest retries only after confirmed task changes',async()=>{
 const entity={id:'w',profile:'youngMale',status:'acting',taskId:'t'},state={workers:[entity],tasks:[{id:'t',kind:'harvest'}]},root=new Group(),scene=new Group();scene.add(root);let requests=0,installed=0;
 const roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedHarvestBank:{async get(){if(++requests===1)throw Error('offline');return {};}},createWorker:async()=>({root,update(){},async installBakedHarvest(){installed++;return true;},dispose(){root.removeFromParent();}})});
 try{roster.sync();await flush();await flush();assert.equal(requests,1);for(let i=0;i<5;i++)roster.sync();await flush();assert.equal(requests,1);state.tasks[0].kind='water';roster.sync();state.tasks[0].kind='harvest';roster.sync();await flush();await flush();assert.equal(requests,2);assert.equal(installed,1);}finally{roster.dispose();}
});
