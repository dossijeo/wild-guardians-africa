import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HorizonGenerator} from '../src/rendering/horizon-generator.js';
import {NativeHorizon,nativeNearRegion} from '../src/rendering/horizon.js';
import {WorldScene} from '../src/rendering/scene.js';
import {NativeContacts} from '../src/rendering/contacts.js';

const task=key=>({key,config:{biome:'canyons'},profile:{},region:{cx:0,cz:0,range:2,bounds:[-120,-120,120,120]}});
function worker(){return {requests:[],terminated:0,postMessage(value){this.requests.push(value);},terminate(){this.terminated++;},reply(index,data){this.onmessage({data:{id:this.requests[index].id,data}});}};}

test('horizon generation keeps only the latest camera destination and ignores obsolete replies',async()=>{
 const w=worker(),generator=new HorizonGenerator({workerFactory:()=>w});
 assert.equal(generator.plan(task('a')),true);generator.plan(task('b'));generator.plan(task('c'));assert.equal(w.requests.length,1);
 const ready=generator.whenReady();w.reply(0,{obsolete:true});assert.equal(generator.ready,null);assert.equal(w.requests.length,2);assert.equal(w.requests[1].key,'c');
 const data={terrain:new Float32Array(27),water:new Float32Array()};w.reply(1,data);await ready;assert.equal(generator.take('b'),null);assert.equal(generator.take('c'),data);assert.equal(generator.take('c'),null);
 w.reply(0,{obsolete:true});assert.equal(generator.ready,null);generator.dispose();assert.equal(w.terminated,1);
});

test('worker failure releases readiness waiters and permits the synchronous fallback',async()=>{
 const w=worker(),errors=[],generator=new HorizonGenerator({workerFactory:()=>w,onFallback:e=>errors.push(e)});
 generator.plan(task('a'));const ready=generator.whenReady();w.onerror(new Error('Worker stopped'));await ready;
 assert.equal(generator.plan(task('b')),false);assert.equal(w.terminated,1);assert.equal(errors.length,1);generator.dispose();assert.equal(w.terminated,1);
});

test('closing a world terminates pending generation and prevents late horizon installation',async()=>{
 const w=worker(),generator=new HorizonGenerator({workerFactory:()=>w});generator.plan(task('a'));const ready=generator.whenReady();generator.dispose();generator.dispose();await ready;
 w.reply(0,{terrain:new Float32Array(27)});assert.equal(generator.ready,null);assert.equal(generator.plan(task('b')),false);assert.equal(w.terminated,1);
});

test('malformed worker geometry cannot replace the currently rendered horizon',async()=>{
 const w=worker(),generator=new HorizonGenerator({workerFactory:()=>w});generator.plan(task('a'));const ready=generator.whenReady();w.reply(0,{terrain:new Float32Array(8),water:new Float32Array()});await ready;
 assert.equal(generator.take('a'),null);assert.equal(generator.disabled,true);assert.equal(w.terminated,1);generator.dispose();
});

test('async horizon preserves the old geometry, clipping vector and resident region until replacement is ready',()=>{
 const w=worker(),scene=new THREE.Scene(),horizon=new NativeHorizon(scene,()=>new THREE.MeshBasicMaterial(),null,null,{workerFactory:()=>w});
 const config={biome:'canyons',seed:712,river:false},first=nativeNearRegion({x:0,z:0}),next=nativeNearRegion({x:48,z:0}),data={terrain:new Float32Array(27),water:new Float32Array()};
 horizon.update(config,{},first,'media');assert.equal(horizon.group,null);w.reply(0,data);assert.deepEqual(horizon.update(config,{},first,'media'),first);
 const group=horizon.group,material=group.children[0].material,clip=material.userData.horizonBounds;
 assert.deepEqual(horizon.update(config,{},next,'media'),first);assert.equal(horizon.group,group);assert.deepEqual(clip.toArray(),first.bounds);
 w.reply(1,data);assert.deepEqual(horizon.update(config,{},next,'media'),next);assert.notEqual(horizon.group,group);assert.equal(horizon.group.children[0].material,material);assert.equal(material.userData.horizonBounds,clip);assert.deepEqual(clip.toArray(),next.bounds);
 horizon.dispose();assert.equal(scene.children.length,0);assert.equal(w.terminated,1);
});

test('world streaming adopts the ready horizon rectangle instead of dropping old resident chunks early',()=>{
 const requested=nativeNearRegion({x:96,z:0}),retained=nativeNearRegion({x:0,z:0}),world=Object.create(WorldScene.prototype),contacts=new NativeContacts();
 Object.assign(world,{contacts,chunkRevision:0,contactPrototypes:Array.from({length:20},()=>({radius:1,group:0})),nav:{config:{biome:'canyons',layers:Array(6).fill(true)}},pack:{profile:{}},camera:{position:{x:96,z:0}},controls:{target:{x:0,z:0}},quality:'media',prototypes:[],scene:new THREE.Scene(),chunks:new Map(),terrainMeshes:[],horizon:{update(c,p,region){assert.deepEqual(region,requested);return retained;}},terrain:()=>{const group=new THREE.Group();group.userData.contactInstances=Array.from({length:20},()=>[]);return group;}});
 world.syncChunks();assert.deepEqual(world.nearBounds,retained.bounds);assert.ok(world.chunks.has('-2,0'));assert.equal(world.chunks.has('4,0'),false);contacts.dispose();
});
