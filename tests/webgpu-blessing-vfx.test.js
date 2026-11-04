import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuBlessingVfx} from '../src/rendering/webgpu-blessing-vfx.js';

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
