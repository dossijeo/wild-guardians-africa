import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh,MeshBasicMaterial,Texture} from 'three';
import {estimateIdleAssetBytes,createIdleAssetBudget} from '../src/rendering/webgpu-idle-assets.js';
import {createWebGpuAnimalBank} from '../src/rendering/webgpu-animal-bank.js';
import {createWebGpuWorkerBank} from '../src/rendering/webgpu-worker-bank.js';

test('idle budget evicts least recently used entries and never retains unknown sizes',()=>{
 const evicted=[],budget=createIdleAssetBudget(10,key=>evicted.push(key));budget.retain('a',4);budget.retain('b',4);budget.take('a');budget.retain('a',4);budget.retain('c',4);
 assert.deepEqual(evicted,['b']);assert.deepEqual(budget.status(),{idle:2,estimatedBytes:8,maxBytes:10});budget.retain('unknown',Infinity);assert.deepEqual(evicted,['b','unknown']);budget.clear();assert.deepEqual(evicted,['b','unknown','a','c']);
});

test('retention estimate includes geometry, clips and rejects unknown textures',()=>{
 const scene=new Group(),geometry=new BoxGeometry(),material=new MeshBasicMaterial();scene.add(new Mesh(geometry,material));
 const asset={scene,clips:[{tracks:[{times:new Float32Array(2),values:new Float32Array(3)}]}]};assert.ok(Number.isFinite(estimateIdleAssetBytes(asset)));
 material.map=new Texture();assert.equal(estimateIdleAssetBytes(asset),Infinity);material.map.image={width:16,height:16};assert.ok(Number.isFinite(estimateIdleAssetBytes(asset)));geometry.dispose();material.dispose();
});

test('animal bank reuses a retained source and disposes it at bank shutdown',async()=>{
 let loads=0,disposed=0;const source=new Group(),geometry=new BoxGeometry(),material=new MeshBasicMaterial();source.add(new Mesh(geometry,material));
 const bank=createWebGpuAnimalBank({renderer:{backend:{isWebGPUBackend:true}},maxIdleBytes:1024*1024,loadAsset:async()=>{loads++;return {scene:source,clips:[],dispose(){disposed++;}};}});
 const a=await bank.acquire('hyena');a.release();assert.equal(bank.status().idle.idle,1);const b=await bank.acquire('hyena');assert.equal(loads,1);assert.equal(bank.status().idle.idle,0);b.release();bank.dispose();assert.equal(disposed,1);geometry.dispose();material.dispose();
});

test('worker bank retains a completed profile but releases an unfinished one',async()=>{
 let loads=0,disposed=0,ready=true;const source=new Group(),geometry=new BoxGeometry(),material=new MeshBasicMaterial();source.add(new Mesh(geometry,material));
 const bank=createWebGpuWorkerBank({renderer:{backend:{isWebGPUBackend:true}},maxIdleBytes:1024*1024,loadAsset:async()=>{loads++;return {scene:source,clips:[],library:{},get retentionReady(){return ready;},dispose(){disposed++;}};}});
 const first=await bank.acquire('youngMale');first.release();const second=await bank.acquire('youngMale');assert.equal(loads,1);ready=false;second.release();assert.equal(disposed,1);assert.equal(bank.status().idle.idle,0);bank.dispose();geometry.dispose();material.dispose();
});
