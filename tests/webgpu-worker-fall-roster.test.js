import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createWebGpuWorkerRoster} from '../src/rendering/webgpu-worker-roster.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
for(const kind of ['Fall','GetUp'])test(`${kind} retries a cancelled admission on confirmed state, without spinning`,async()=>{
 const entity={id:'w',profile:'youngMale',status:'fleeing',...(kind==='Fall'?{fallRemaining:2}:{recovery:{fraction:.4,duration:2,heading:0,elapsed:0}})},state={workers:[entity],tasks:[]},root=new Group(),scene=new Group();scene.add(root);let attempts=0,installed=0;const errors=[];
 const roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},[kind==='Fall'?'bakedFallBank':'bakedGetUpBank']:{get:async()=>({})},onBakedWalkError:(_,error)=>errors.push(error),createWorker:async()=>({root,update(){},async ['installBaked'+kind](_b,{isCurrent}){attempts++;if(attempts===1)throw new DOMException('Admission invalidated','AbortError');assert.equal(isCurrent(),true);installed++;return true;},dispose(){root.removeFromParent();}})});
 try{roster.sync();await flush();await flush();assert.equal(attempts,1);assert.equal(installed,0);assert.deepEqual(errors,[]);roster.sync();await flush();await flush();assert.equal(attempts,2);assert.equal(installed,1);roster.sync();await flush();assert.equal(attempts,2);}finally{roster.dispose();}
});
for(const kind of ['Fall','GetUp'])test(`${kind} does not retry real failures until another action`,async()=>{
 const entity={id:'w',profile:'youngMale',status:'fleeing',...(kind==='Fall'?{fallRemaining:2}:{recovery:{fraction:.4,duration:2,heading:0,elapsed:0}})},state={workers:[entity],tasks:[]},root=new Group(),scene=new Group();let attempts=0;const errors=[];
 const roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},[kind==='Fall'?'bakedFallBank':'bakedGetUpBank']:{get:async()=>({})},onBakedWalkError:(_,error)=>errors.push(error),createWorker:async()=>({root,update(){},async ['installBaked'+kind](){attempts++;throw Error('Invalid clip');},dispose(){}})});
 try{roster.sync();await flush();roster.sync();await flush();assert.equal(attempts,1);assert.equal(errors.length,1);}finally{roster.dispose();}
});
test('fall waits for earlier admission and never publishes after recovery',async()=>{
 const entity={id:'w',profile:'youngMale',status:'fleeing',fallRemaining:2},state={workers:[entity],tasks:[]},root=new Group(),scene=new Group();scene.add(root);let walkDone,fallDone,requested=0,installed=0;const roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},bakedWalkBank:{get:()=>new Promise(resolve=>walkDone=resolve)},bakedFallBank:{get(){requested++;return new Promise(resolve=>fallDone=resolve);}},createWorker:async()=>({root,update(){},async installBakedWalk(){return true;},async installBakedFall(_b,{isCurrent}){if(isCurrent())installed++;return isCurrent();},dispose(){root.removeFromParent();}})});
 try{roster.sync();await flush();await flush();assert.equal(requested,1);walkDone({});await flush();await flush();assert.equal(requested,1);entity.fallRemaining=0;entity.status='walking';roster.sync();fallDone({});await flush();await flush();assert.equal(installed,0);}finally{roster.dispose();}
});
