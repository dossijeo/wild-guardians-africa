import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial,Box3,Vector3} from 'three';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createWebGpuWorkerBank} from '../src/rendering/webgpu-worker-bank.js';
import {createWebGpuWorkerRoster} from '../src/rendering/webgpu-worker-roster.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('advances shared worker texture transitions once per frame',()=>{
 const ticks=[],bank={tick:now=>ticks.push(now),dispose(){}};
 const roster=createWebGpuWorkerRoster({scene:{},residency:{},state:{workers:[]},assetBank:bank});
 roster.tick(123);roster.tick(456);assert.deepEqual(ticks,[123,456]);roster.dispose();
});
test('shares original meshes and materials by profile and releases after last actor',async()=>{
 let loads=0,disposed=0;const source=new Group(),geometry=new BoxGeometry(),material=new MeshBasicMaterial();source.add(new Mesh(geometry,material));const bank=createWebGpuWorkerBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:async()=>{loads++;return {scene:source,clips:[],library:{},dispose(){disposed++;geometry.dispose();material.dispose();}};}});
 const [a,b]=await Promise.all([bank.acquire('youngMale'),bank.acquire('youngMale')]);assert.equal(loads,1);assert.notEqual(a.model,b.model);assert.equal(a.model.children[0].geometry,b.model.children[0].geometry);assert.equal(a.model.children[0].material,b.model.children[0].material);a.release();assert.equal(disposed,0);b.release();assert.equal(disposed,1);bank.dispose();
});
test('reconciles confirmed appearance and home transitions, and rejects late creations',async()=>{
 const state={workers:[{id:'a',profile:'youngMale',status:'walking'}]},pending=new Map(),disposed=[],updates=[],bank={dispose(){this.closed=true;}},roster=createWebGpuWorkerRoster({scene:{},residency:{},state,assetBank:bank,createWorker:({actorId})=>new Promise(resolve=>pending.set(actorId,resolve))});
 roster.sync();await flush();state.workers[0].status='home';roster.sync();pending.get('a')({update(){updates.push('a');},dispose(){disposed.push('a');}});await flush();assert.deepEqual(disposed,['a']);assert.equal(roster.status().count,0);
 state.workers=[{id:'b',profile:'olderFemale',status:'acting'}];roster.sync();await flush();pending.get('b')({update(){updates.push('b');},dispose(){disposed.push('b');}});await flush();assert.equal(roster.status().ready,1);roster.sync();assert.deepEqual(updates,['b','b']);state.workers=[];roster.sync();assert.deepEqual(disposed,['a','b']);roster.dispose();assert.equal(bank.closed,true);
});
test('disposing during a shared load releases late resources',async()=>{
 let resolve,disposed=0;const gate=new Promise(r=>{resolve=r;}),bank=createWebGpuWorkerBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:()=>gate}),pending=bank.acquire('olderMale');bank.dispose();resolve({scene:new Group(),clips:[],library:{},dispose(){disposed++;}});await assert.rejects(pending,{name:'AbortError'});assert.equal(disposed,1);
});
test('crate and worker leases reuse the same profile asset without cloning a worker rig for the crate',async()=>{
 let loads=0,disposed=0;const source=new Group(),geometry=new BoxGeometry(1,2,3),material=new MeshBasicMaterial(),crate=new Mesh(geometry,material);crate.name='Prop_FruitCrate';source.add(crate);
 const bank=createWebGpuWorkerBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:async()=>{loads++;return {scene:source,clips:[],library:{},dispose(){disposed++;geometry.dispose();material.dispose();}};}});
 const [worker,loose]=await Promise.all([bank.acquire('olderMale'),bank.acquireCrate('olderMale')]);assert.equal(loads,1);assert.notEqual(loose.model,crate);assert.equal(loose.model.geometry,geometry);assert.equal(loose.model.material,material);worker.release();assert.equal(disposed,0);loose.release();assert.equal(disposed,1);loose.release();bank.dispose();assert.equal(disposed,1);
});
test('the real olderMale preview supplies a normalized loose crate',async()=>{
 const bytes=await readFile(new URL('../public/content/character-preview/olderMale/preview.glb',import.meta.url)),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer,''),bank=createWebGpuWorkerBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:async()=>({scene:gltf.scene,clips:[],library:{},dispose(){}})}),lease=await bank.acquireCrate('olderMale');
 const box=new Box3().setFromObject(lease.model),size=box.getSize(new Vector3());assert.ok(Math.abs(box.min.y)<1e-5);assert.ok(size.x>.4&&size.x<.6&&size.y>.2&&size.y<.4&&size.z>.2&&size.z<.4);lease.release();bank.dispose();
});

test('passes the shared confirmed clock through to a real roster actor',async()=>{const clock=createConfirmedPresentationClock(.25),state={workers:[{id:'w',profile:'youngMale',status:'walking'}]},bank={dispose(){}},calls=[],roster=createWebGpuWorkerRoster({scene:{},residency:{},state,assetBank:bank,confirmedClock:clock,createWorker:async options=>{calls.push(options);return {update(){},dispose(){}};}});roster.sync();await flush();assert.equal(calls.length,1);assert.equal(calls[0].confirmedClock,clock);roster.dispose();clock.dispose();});
