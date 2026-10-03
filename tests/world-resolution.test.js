import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {WORLD_RESOLUTIONS,worldResolution,applyWorldResolution} from '../src/app/world-resolution.js';
import {WorldScene} from '../src/rendering/scene.js';
import {translate} from '../public/i18n/catalog.js';

test('legacy or invalid persisted resolution preserves the authored quality profile',()=>{
 for(const value of [undefined,null,'',1,Infinity,{},'ultra'])assert.equal(worldResolution(value),'profile');
 for(const [id] of WORLD_RESOLUTIONS)assert.equal(worldResolution(id),id);
});

test('world resolution settings resize only the canvas and restore the original profile',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');
 Object.defineProperty(globalThis,'devicePixelRatio',{value:1.25,configurable:true});
 try{
  const canvas={width:1600,height:900,getBoundingClientRect:()=>({width:1280,height:720})},camera=new THREE.PerspectiveCamera(48,1280/720);
  const state={elapsed:25},chunks=new Map(),material=new THREE.MeshStandardMaterial();let resized=0;
  const world={canvas,camera,state,chunks,material,quality:'media',resize(){WorldScene.prototype.resize.call(this);},renderer:{setSize(w,h){resized++;canvas.width=w;canvas.height=h;}}};
  for(const [id,w,h] of [['profile',1600,900],['economy',1280,720],['low',960,540],['minimum',640,360],['profile',1600,900]]){
   applyWorldResolution(world,id);assert.deepEqual([canvas.width,canvas.height],[w,h]);
   assert.equal(world.quality,'media');assert.equal(world.state,state);assert.equal(state.elapsed,25);assert.equal(world.chunks,chunks);assert.equal(world.material,material);
   const count=resized;applyWorldResolution(world,id);assert.equal(resized,count);
  }
  assert.equal(resized,4);
 }finally{if(previous)Object.defineProperty(globalThis,'devicePixelRatio',previous);else delete globalThis.devicePixelRatio;}
});

test('both production settings surfaces expose and persist the same translated resolution options',()=>{
 const main=readFileSync('src/app/main.js','utf8'),menu=readFileSync('public/menu/native.js','utf8');
 assert.ok(main.includes('applyWorldResolution(world,settings.resolution)'));
 assert.ok(main.includes("settings.resolution=worldResolution(settings.resolution)"));
 assert.ok(main.includes("worldResolution(document.querySelector('#world-resolution').value)"));
 for(const [id,label] of WORLD_RESOLUTIONS){assert.ok(menu.includes(`value="${id}"`));assert.notEqual(translate(label),label);}
 assert.ok(menu.includes("resolution:$('#production-resolution').value"));
 assert.equal(translate('Resolución del mundo'),'World resolution');
 assert.equal(translate('Reduce la nitidez del mundo 3D; el HUD conserva su resolución.'),'Reduces the sharpness of the 3D world; the HUD keeps its resolution.');
});
