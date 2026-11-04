import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createWebGpuAgricultureVfx} from '../src/rendering/webgpu-agriculture-vfx.js';
const catalogue=JSON.parse(readFileSync('public/content/vfx.json'));
test('confirmed spells own one effect per id and stop at the confirmed clock',async()=>{
 const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap;let requests=0,closed=0;globalThis.fetch=async url=>{requests++;return {ok:true,json:async()=>catalogue,blob:async()=>new Blob(['x'])};};globalThis.createImageBitmap=async()=>({width:4096,height:2048,close(){closed++;}});
 try{const scene=new THREE.Scene(),floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.updateMatrixWorld(true);let resident=true;const state={time:30,spells:[]},vfx=createWebGpuAgricultureVfx({scene,state,residency:{get:()=>resident?floor:null}});vfx.sync();assert.equal(requests,0);state.spells=[{id:'s1',kind:'growth',remaining:28,radius:.79,x:0,z:0}];vfx.sync();for(let i=0;i<100&&!vfx.status().ready;i++)await new Promise(r=>setTimeout(r,1));assert.equal(vfx.status().ready,true);vfx.sync();let current=vfx.status();assert.equal(current.effects,1);assert.equal(current.active[0].id,'s1');const time=current.active[0].time;vfx.sync();assert.equal(vfx.status().effects,1);assert.equal(vfx.status().active[0].time,time);resident=false;vfx.terrainChanged();assert.equal(vfx.status().active[0].visible,false);resident=true;vfx.terrainChanged();assert.equal(vfx.status().active[0].visible,true);state.spells=[];vfx.sync();assert.equal(vfx.status().effects,0);assert.equal(scene.children.length,0);vfx.dispose();assert.equal(closed,1);floor.geometry.dispose();floor.material.dispose();}finally{globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});
