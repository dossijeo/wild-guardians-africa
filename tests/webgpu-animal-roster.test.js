import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {createWebGpuAnimalBank} from '../src/rendering/webgpu-animal-bank.js';
import {createWebGpuAnimalRoster} from '../src/rendering/webgpu-animal-roster.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('shares geometry and material per species while actor roots are independent',async()=>{
 let loads=0,disposed=0;const geometry=new BoxGeometry(),material=new MeshBasicMaterial(),source=new Group();source.add(new Mesh(geometry,material));const bank=createWebGpuAnimalBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:async()=>{loads++;return {scene:source,clips:[],dispose(){disposed++;geometry.dispose();material.dispose();}};}});
 const [a,b]=await Promise.all([bank.acquire('hyena'),bank.acquire('hyena')]);assert.equal(loads,1);assert.notEqual(a.model,b.model);assert.equal(a.model.children[0].geometry,b.model.children[0].geometry);assert.equal(a.model.children[0].material,b.model.children[0].material);assert.equal(bank.status().species[0].refs,2);a.release();a.release();assert.equal(bank.status().species[0].refs,1);b.release();assert.equal(disposed,1);assert.equal(bank.status().species.length,0);bank.dispose();assert.equal(disposed,1);
});
test('reconciles appearances, updates and removal and discards late loads',async()=>{
 const state={raid:{animals:[{id:'a',species:'hyena',status:'entering'}]}},pending=new Map(),disposed=[],updates=[],bank={tick(){},dispose(){this.closed=true;}},roster=createWebGpuAnimalRoster({scene:{},residency:{},state,renderer:{},assetBank:bank,createAnimal:({actorId})=>new Promise(resolve=>pending.set(actorId,resolve))});
 roster.sync();await flush();state.raid.animals=[];roster.sync();pending.get('a')({update(){updates.push('a');},dispose(){disposed.push('a');}});await flush();assert.deepEqual(disposed,['a']);assert.equal(roster.status().count,0);
 state.raid.animals=[{id:'b',species:'hyena',status:'entering'}];roster.sync();await flush();pending.get('b')({update(){updates.push('b');},dispose(){disposed.push('b');}});await flush();assert.equal(roster.status().ready,1);roster.sync();assert.deepEqual(updates,['b','b']);state.raid.animals[0].status='gone';roster.sync();assert.deepEqual(disposed,['a','b']);roster.dispose();assert.equal(bank.closed,true);
});
test('disposal during a shared load releases the late resource without publishing a model',async()=>{
 let resolve,disposed=0;const wait=new Promise(r=>{resolve=r;}),bank=createWebGpuAnimalBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:()=>wait});const pending=bank.acquire('buffalo');bank.dispose();resolve({scene:new Group(),clips:[],dispose(){disposed++;}});await assert.rejects(pending,{name:'AbortError'});assert.equal(disposed,1);
});
test('late-loading actor receives the latest confirmed physical pose and releases it',async()=>{
 const state={raid:{animals:[{id:'a',species:'hyena',status:'entering'}]}},bank={tick(){},dispose(){}},values=[];let resolve;
 const roster=createWebGpuAnimalRoster({scene:{},residency:{},state,renderer:{},assetBank:bank,createAnimal:({getPose})=>new Promise(done=>{resolve=()=>done({update(){values.push(getPose());},validatePose(pose){if(pose.bad)throw Error('bad rig');},dispose(){}});})});
 roster.sync();await flush();const first={actorId:'a',active:true},latest={actorId:'a',active:true,revision:2};roster.setPoses(new Map([['a',first]]));roster.setPoses(new Map([['a',latest]]));resolve();await flush();assert.equal(values.at(-1),latest);assert.throws(()=>roster.validatePoses(new Map([['a',{bad:true}]])),/bad rig/);roster.setPoses(new Map());roster.sync();assert.equal(values.at(-1),null);roster.dispose();
});
