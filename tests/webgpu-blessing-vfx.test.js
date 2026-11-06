import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuBlessingVfx} from '../src/rendering/webgpu-blessing-vfx.js';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';

test('blessing is admitted before display and a removed target cannot reappear',async()=>{
 const scene=new THREE.Scene(),floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.updateMatrixWorld(true);const plant={id:'p',species:'maiz',alive:true,x:0,z:0,blessing:{at:0}},state={elapsed:5,plants:[plant],structures:[],events:[]};let finish,mesh,requests=0;const admission={prepare(){throw Error('non-atomic admission used');},prepareAndPublish(object,_options,publish){requests++;mesh=object;return new Promise(resolve=>{finish=()=>{publish();resolve();};});}},effect=createWebGpuBlessingVfx({scene,state,residency:{get:()=>floor},pipelineAdmission:admission});
 try{await new Promise(resolve=>setImmediate(resolve));assert.equal(requests,1);assert.equal(mesh.visible,false);assert.equal(effect.status().admitted,false);delete plant.blessing;effect.sync();finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(effect.status().admitted,true);assert.equal(mesh.visible,false);assert.equal(effect.status().particles,0);
 }finally{effect.dispose();floor.geometry.dispose();floor.material.dispose();}
});

test('closing a blessing retains geometry until its active compilation settles',async()=>{
 const scene=new THREE.Scene(),floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.updateMatrixWorld(true);let finish,mesh,released=0;const renderer={backend:{isWebGPUBackend:true},compileAsync:object=>{mesh=object;return new Promise(resolve=>{finish=resolve;});}},admission=createWebGpuPipelineAdmission({renderer,scene,camera:new THREE.PerspectiveCamera()}),state={elapsed:5,plants:[{id:'p',species:'maiz',alive:true,x:0,z:0,blessing:{at:0}}],structures:[],events:[]},effect=createWebGpuBlessingVfx({scene,state,residency:{get:()=>floor},pipelineAdmission:admission});
 try{await new Promise(resolve=>setImmediate(resolve));mesh.geometry.addEventListener('dispose',()=>released++);effect.dispose();assert.equal(scene.children.length,0);assert.equal(released,0);finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(released,1);}finally{effect.dispose();admission.dispose();floor.geometry.dispose();floor.material.dispose();}
});

test('confirmed blessings appear after ritual, loaded blessings immediately, and disappear on removal',()=>{
 const scene=new THREE.Scene(),floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.updateMatrixWorld(true);let resident=true;const saved={id:'plant-1',species:'maiz',alive:true,x:0,z:0,blessing:{at:0}},state={elapsed:5,plants:[saved],structures:[],events:[]},effect=createWebGpuBlessingVfx({scene,state,residency:{get:()=>resident?floor:null}});assert.equal(effect.status().particles,19);const fresh={id:'wall-2',kind:'wall',status:'intact',x:2,z:0,blessing:{at:5}};state.structures.push(fresh);state.events.push({id:'event-1',type:'BlessingApplied',targetId:fresh.id,presentation:{elapsed:5}});effect.sync();assert.equal(effect.status().sources,1);state.elapsed=7.1;effect.sync();assert.equal(effect.status().sources,2);assert.equal(effect.status().particles,35);delete saved.blessing;effect.sync();assert.equal(effect.status().sources,1);resident=false;effect.terrainChanged();assert.equal(effect.status().sources,0);effect.dispose();assert.equal(scene.children.length,0);floor.geometry.dispose();floor.material.dispose();
});
test('new confirmed source waits for the ritual even if its event arrives later',()=>{const scene=new THREE.Scene(),floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.updateMatrixWorld(true);const state={elapsed:1,plants:[],structures:[],events:[]},effect=createWebGpuBlessingVfx({scene,state,residency:{get:()=>floor}});state.plants.push({id:'p1',species:'maiz',alive:true,x:0,z:0,blessing:{at:1}});effect.sync();assert.equal(effect.status().sources,0);state.events.push({id:'e1',type:'BlessingApplied',targetId:'p1',presentation:{elapsed:1}});state.elapsed=3.1;effect.sync();assert.equal(effect.status().sources,1);effect.dispose();floor.geometry.dispose();floor.material.dispose();});
test('confirmed batch delivers blessing events evicted from the state ring exactly once',()=>{
 const scene=new THREE.Scene(),floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.updateMatrixWorld(true);
 const state={elapsed:10,plants:[],structures:[],events:[]},effect=createWebGpuBlessingVfx({scene,state,residency:{get:()=>floor}});
 state.plants.push({id:'plant-1',species:'maiz',alive:true,x:0,z:0,blessing:{at:0}});
 const event={id:'event-1',type:'BlessingApplied',targetId:'plant-1',presentation:{elapsed:10}};
 state.events=Array.from({length:200},(_,i)=>({id:`event-${i+2}`,type:'CropHit'}));
 effect.sync(false,[event,...state.events]);assert.equal(effect.status().sources,0);assert.equal(effect.status().pending,1);
 state.elapsed=13;effect.sync(false,[{...event,presentation:{elapsed:100}}]);assert.equal(effect.status().sources,1);assert.equal(effect.status().pending,0);
 effect.dispose();floor.geometry.dispose();floor.material.dispose();
});
test('a confirmed blessing event does not recreate a target absent from the final state',()=>{
 const scene=new THREE.Scene(),floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial());const state={elapsed:1,plants:[],structures:[],events:[]},effect=createWebGpuBlessingVfx({scene,state,residency:{get:()=>floor}});
 effect.sync(false,[{id:'event-1',type:'BlessingApplied',targetId:'missing',presentation:{elapsed:1}}]);assert.equal(effect.status().pending,0);assert.equal(effect.status().sources,0);
 state.plants.push({id:'p1',species:'maiz',alive:true,x:0,z:0,blessing:{at:1}});effect.sync(false,[{id:'event-2',type:'BlessingApplied',targetId:'p1',presentation:{elapsed:1}}]);assert.equal(effect.status().pending,1);
 state.plants[0].alive=false;effect.sync(false,[{id:'event-3',type:'BlessingApplied',targetId:'p1',presentation:{elapsed:1}}]);assert.equal(effect.status().pending,0);assert.equal(effect.status().sources,0);
 effect.dispose();floor.geometry.dispose();floor.material.dispose();
});

test('shared confirmed clock drives blessing timing without advancing on unconfirmed state',()=>{const scene=new THREE.Scene(),floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.updateMatrixWorld(true);const state={elapsed:1,plants:[],structures:[],events:[]},confirmedClock=createConfirmedPresentationClock(1),effect=createWebGpuBlessingVfx({scene,state,residency:{get:()=>floor},confirmedClock});state.plants.push({id:'p1',species:'maiz',alive:true,x:0,z:0,blessing:{at:1}});state.elapsed=100;effect.sync();assert.equal(effect.status().pending,1);assert.equal(effect.status().sources,0);assert.equal(confirmedClock.node.value,1);effect.prepare(new THREE.PerspectiveCamera());assert.equal(confirmedClock.node.value,1);confirmedClock.commit(3.1);state.elapsed=3.1;effect.sync();assert.equal(effect.status().sources,1);const camera=new THREE.PerspectiveCamera();effect.prepare(camera);assert.equal(confirmedClock.node.value,3.1);effect.dispose();confirmedClock.dispose();floor.geometry.dispose();floor.material.dispose();});
