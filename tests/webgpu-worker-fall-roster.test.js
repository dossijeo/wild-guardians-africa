import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh} from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';
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
for(const kind of ['Fall','GetUp'])test(`pending historical admission hands off to a confirmed ${kind} while publication is stopped`,async()=>{
 const worker={id:'w',profile:'unsupported',status:'fleeing',x:0,z:0},state={elapsed:5,workers:[worker],tasks:[]};
 const scene=new Group(),root=new Group(),geometry=new BoxGeometry(),material=new MeshBasicNodeMaterial();
 const clock=createConfirmedHistoricalClock({initialElapsed:5});
 root.add(new Mesh(geometry,material));scene.add(root);
 let release,admissions=0,installs=0;
 const roster=createWebGpuWorkerRoster({scene,state,residency:{},assetBank:{dispose(){}},
  renderer:{backend:{isWebGPUBackend:true},library:{fromMaterial:source=>source.clone()}},
  experimentalHistoricalMotion:{actorIds:[],clock},bakedWalkBank:{get:async()=>({})},
  [kind==='Fall'?'bakedFallBank':'bakedGetUpBank']:{get:async()=>({})},
  pipelineAdmission:{prepare:async()=>{},prepareAndPublish:(_root,_options,publish)=>{
   if(++admissions===1){publish();return Promise.resolve();}
   return new Promise(resolve=>{release=()=>{publish();resolve();};});
  }},
  createWorker:async()=>({root,update(){root.visible=true;},async ['installBaked'+kind](_bake,{isCurrent}){
   assert.equal(isCurrent(),true);installs++;return true;
  },dispose(){root.removeFromParent();}})});
 try{
  roster.sync();await flush();assert.ok(roster.get('w'));
  roster.setHistoricalActors(['w']);await flush();assert.equal(typeof release,'function');
  state.workers[0]={...worker,...(kind==='Fall'?{fallRemaining:2}:{recovery:{fraction:.4,duration:2,heading:0,elapsed:.5}})};
  roster.sync();await flush();assert.equal(installs,0);
  release();await flush();assert.equal(installs,1);
 }finally{roster.dispose();clock.dispose();geometry.dispose();material.dispose();}
});
for(const kind of ['Fall','GetUp'])test(`${kind} retries a transient download without a publication`,async()=>{
 const entity={id:'w',profile:'youngMale',status:'fleeing',...(kind==='Fall'?{fallRemaining:2}:{recovery:{fraction:.4,duration:2,heading:0,elapsed:0}})},state={workers:[entity],tasks:[]};let loads=0,installs=0,created=0;const roster=createWebGpuWorkerRoster({scene:new Group(),residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},walkRetryDelay:5,pipelineAdmission:{prepare:async()=>{}},[kind==='Fall'?'bakedFallBank':'bakedGetUpBank']:{async get(){if(++loads===1)throw Error('offline');return {};}},createWorker:async()=>{created++;return {root:new Group(),update(){this.root.visible=true;},async ['installBaked'+kind](){installs++;return true;},dispose(){}};}});
 try{roster.sync();await new Promise(resolve=>setTimeout(resolve,80));assert.equal(loads,2);assert.equal(installs,1);assert.equal(created,1);assert.equal(roster.get('w').root.visible,true);}finally{roster.dispose();}
});
test('a late obsolete recovery failure cannot schedule retries for the replacement',async()=>{
 const entity={id:'w',profile:'youngMale',status:'fleeing',recovery:{fraction:.4,duration:2,heading:0,elapsed:0}},state={workers:[entity],tasks:[]};let rejectFirst,resolveSecond,loads=0,installs=0;const roster=createWebGpuWorkerRoster({scene:new Group(),residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},walkRetryDelay:5,pipelineAdmission:{prepare:async()=>{}},bakedGetUpBank:{get(){if(++loads===1)return new Promise((_,reject)=>{rejectFirst=reject;});return new Promise(resolve=>{resolveSecond=resolve;});}},createWorker:async()=>({root:new Group(),update(){},async installBakedGetUp(){installs++;return true;},dispose(){}})});
 try{roster.sync();await flush();await flush();entity.recovery.fraction=.8;roster.sync();rejectFirst(Error('offline'));await flush();await flush();assert.equal(loads,2);await new Promise(resolve=>setTimeout(resolve,35));assert.equal(loads,2);resolveSecond({});await flush();await flush();assert.equal(installs,1);}finally{roster.dispose();}
});
test('fall retries remain bounded and stop once the worker recovers',async()=>{
 const workers=[{id:'a',profile:'youngMale',status:'fleeing',fallRemaining:2},{id:'b',profile:'olderMale',status:'fleeing',fallRemaining:2}],state={workers,tasks:[]},calls=[];const roster=createWebGpuWorkerRoster({scene:new Group(),residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},walkRetryDelay:5,pipelineAdmission:{prepare:async()=>{}},bakedFallBank:{async get(profile){calls.push(profile);throw Error('offline');}},createWorker:async()=>({root:new Group(),update(){},dispose(){}})});
 try{roster.sync();await flush();await flush();workers[1].fallRemaining=0;roster.sync();await new Promise(resolve=>setTimeout(resolve,100));assert.equal(calls.filter(item=>item==='youngMale').length,4);assert.equal(calls.filter(item=>item==='olderMale').length,1);}finally{roster.dispose();}
});
