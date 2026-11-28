import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createWebGpuWorkerRoster} from '../src/rendering/webgpu-worker-roster.js';
import {confirmedWorkerRunningSamples} from '../src/rendering/confirmed-animation-samples.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('running library loads only on demand and a removed worker cannot publish it',async()=>{
 const entity={id:'w',profile:'youngMale',status:'walking',running:false},state={workers:[entity]},root=new Group(),scene=new Group();scene.add(root);let requested=0,complete,installed=0;
 const roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedRunBank:{get(){requested++;return new Promise(resolve=>{complete=resolve;});}},createWorker:async()=>({root,update(){},async installBakedRun(){installed++;return true;},dispose(){root.removeFromParent();}})});
 try{roster.sync();await flush();await flush();assert.equal(requested,0);entity.running=true;roster.sync();await flush();assert.equal(requested,1);for(let i=0;i<5;i++)roster.sync();assert.equal(requested,1);state.workers=[];roster.sync();complete({});await flush();await flush();assert.equal(installed,0);}finally{roster.dispose();}
});

test('running phase is admitted only for a continuous confirmed run',()=>{
 const entity={status:'fleeing',running:true,runPhase:2},sample=(at,phase)=>({at,status:'fleeing',running:true,runPhase:phase,gateWaiting:false,incapacitated:false,recovery:false,falling:false,taskId:null,animation:null}),samples=[sample(1,2),sample(1.1,2.1)],preview={start:1,end:1.1,trace:{actorTickStates:{complete:true,actors:[{actorId:'w',samples}]}}};
 assert.deepEqual(confirmedWorkerRunningSamples(preview,'w',entity),[{at:1,phase:2},{at:1.1,phase:2.1}]);samples[1].gateWaiting=true;assert.equal(confirmedWorkerRunningSamples(preview,'w',entity),null);samples[1].gateWaiting=false;samples[1].running=false;assert.equal(confirmedWorkerRunningSamples(preview,'w',entity),null);
});

test('failed running load retries only after the confirmed running state changes',async()=>{
 const entity={id:'w',profile:'youngMale',status:'walking',running:true},state={workers:[entity]},root=new Group(),scene=new Group();scene.add(root);let requests=0,installed=0;
 const roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedRunBank:{async get(){if(++requests===1)throw Error('offline');return {};}},createWorker:async()=>({root,update(){},async installBakedRun(){installed++;return true;},dispose(){root.removeFromParent();}})});
 try{roster.sync();await flush();await flush();assert.equal(requests,1);for(let i=0;i<5;i++)roster.sync();await flush();assert.equal(requests,1);entity.running=false;roster.sync();entity.running=true;roster.sync();await flush();await flush();assert.equal(requests,2);assert.equal(installed,1);}finally{roster.dispose();}
});
