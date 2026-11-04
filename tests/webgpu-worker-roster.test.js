import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
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
