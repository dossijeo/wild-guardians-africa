import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {nativeRenderResolution,nativeGroundMaterial,updateGroundQuality} from '../src/rendering/render-quality.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {WorldScene} from '../src/rendering/scene.js';
import {NativeHorizon,nativeNearRegion} from '../src/rendering/horizon.js';

const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8');
const method=source.match(/ resize\(\)\{[^\n]+/)[0];
const resize=Function('canvas','devicePixelRatio','state','const mode="terrain";return ({'+method.trim()+'}).resize();');

test('physical canvas sizing matches the original terrain resize at mobile, desktop, 4K, DPR and hidden dimensions',()=>{
 for(const [width,height] of [[0,0],[320,640],[640,320],[1280,720],[1920,1080],[3840,2160],[5120,2880]])for(const ratio of [.75,1,1.25,2,4])for(const quality of ['muy_baja','baja','media','alta']){
  const canvas={width:0,height:0,getBoundingClientRect:()=>({width,height})},expected=resize(canvas,ratio,{quality:quality==='alta'?'high':quality==='media'?'normal':'eco'}),actual=nativeRenderResolution(width,height,ratio,quality);
  assert.equal(actual.width,expected.w);assert.equal(actual.height,expected.h);assert.equal(actual.dpr,expected.dpr);assert.equal(actual.cssWidth,expected.cssW);assert.equal(actual.cssHeight,expected.cssH);
 }
});

test('live ground switches keep geometry and shared materials, release replaced material once and recompose cel metadata',()=>{
 const geometry=new THREE.PlaneGeometry(),material=nativeGroundMaterial('media'),bounds=new THREE.Vector4(-24,-24,24,24);material.userData.horizonBounds=bounds;
 const meshes=[new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material)];let released=0;material.addEventListener('dispose',()=>released++);
 assert.equal(updateGroundQuality(meshes,'baja'),0);assert.equal(meshes[0].material,material);
 assert.equal(updateGroundQuality(meshes,'muy_baja'),1);assert.equal(released,1);assert.ok(meshes[0].material.isMeshBasicMaterial);assert.equal(meshes[0].material,meshes[1].material);assert.ok(meshes.every(m=>m.geometry===geometry));
 const low=meshes[0].material;assert.equal(low.userData.horizonBounds,bounds);assert.equal(low.userData.nativeGroundColor,true);const toon=new AfricanToon();toon.material(low);
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader};low.onBeforeCompile(shader,{});assert.equal(shader.uniforms.uHorizonBounds.value,bounds);assert.match(shader.fragmentShader,/vToonLowNormal/);assert.match(shader.fragmentShader,/africanToon4/);
 let lowReleased=0;low.addEventListener('dispose',()=>lowReleased++);assert.equal(updateGroundQuality(meshes,'alta'),1);assert.equal(lowReleased,1);assert.ok(meshes[0].material.isMeshStandardMaterial);assert.equal(meshes[0].material.roughness,1);
 assert.equal(updateGroundQuality(meshes,'media'),0);assert.equal(lowReleased,1);assert.equal(released,1);
});

test('live world quality and resize preserve simulation, ground geometry and existing chunk objects',()=>{
 const geometry=new THREE.PlaneGeometry(),ground=new THREE.Mesh(geometry,nativeGroundMaterial('media')),chunk=new THREE.Group();chunk.add(ground);
 const state={money:217,plants:[{id:'crop',growth:13,waterRemaining:7}],workers:[{id:'worker',taskId:'sow'}],time:150},snapshot=JSON.stringify(state),chunks=new Map([['0,0',chunk]]);
 const world={state,chunks,terrainMeshes:[ground],quality:'media',toon:new AfricanToon(),destructionPass:{},renderer:{shadowMap:{enabled:true},setSize(w,h){this.size=[w,h];}},sun:new THREE.DirectionalLight(),camera:new THREE.PerspectiveCamera(),canvas:{getBoundingClientRect:()=>({width:3840,height:2160})},resize:WorldScene.prototype.resize};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');Object.defineProperty(globalThis,'devicePixelRatio',{value:2,configurable:true});
 try{
  for(const quality of ['muy_baja','baja','media','alta','media']){
   WorldScene.prototype.qualitySetting.call(world,quality);assert.equal(world.chunks,chunks);assert.equal(chunks.get('0,0'),chunk);assert.equal(ground.geometry,geometry);assert.equal(JSON.stringify(state),snapshot);
   assert.equal(!!ground.material.isMeshBasicMaterial,quality==='muy_baja');assert.equal(world.renderer.shadowMap.enabled,['media','alta'].includes(quality));assert.equal(world.toon.uniforms.uGroundDetail.value,quality==='muy_baja'?0:1);
   assert.deepEqual(world.renderer.size,[world.renderResolution.width,world.renderResolution.height]);assert.equal(world.camera.aspect,world.renderResolution.width/world.renderResolution.height);assert.ok(world.renderResolution.width*world.renderResolution.height<2605000);
  }
 }finally{if(previous)Object.defineProperty(globalThis,'devicePixelRatio',previous);else delete globalThis.devicePixelRatio;}
});

test('static resize keeps the drawing buffer and observes DPR changes even with unchanged CSS dimensions',()=>{
 let ratio=1.25,calls=0;const rect={width:1280,height:720},canvas={width:0,height:0,getBoundingClientRect:()=>rect};
 const world={canvas,quality:'media',camera:new THREE.PerspectiveCamera(),renderer:{setSize(w,h){calls++;canvas.width=w;canvas.height=h;}}};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');Object.defineProperty(globalThis,'devicePixelRatio',{get:()=>ratio,configurable:true});
 try{
  WorldScene.prototype.resize.call(world);assert.equal(calls,1);assert.deepEqual([canvas.width,canvas.height],[1600,900]);
  WorldScene.prototype.resize.call(world);assert.equal(calls,1);
  ratio=2;WorldScene.prototype.resize.call(world);assert.equal(calls,2);assert.deepEqual([canvas.width,canvas.height],[1920,1080]);
  rect.width=3840;rect.height=2160;WorldScene.prototype.resize.call(world);assert.equal(calls,3);assert.deepEqual([canvas.width,canvas.height],[2150,1209]);
  WorldScene.prototype.resize.call(world);assert.equal(calls,3);
  rect.width=rect.height=0;WorldScene.prototype.resize.call(world);assert.deepEqual([canvas.width,canvas.height],[1,1]);assert.equal(world.camera.aspect,1);
 }finally{if(previous)Object.defineProperty(globalThis,'devicePixelRatio',previous);else delete globalThis.devicePixelRatio;}
});

test('canyon horizon changes only its ground material when the resident rectangle stays the same',()=>{
 const pack=JSON.parse(readFileSync('public/content/biome-canyons.json','utf8')),scene=new THREE.Scene(),horizon=new NativeHorizon(scene,()=>new THREE.MeshBasicMaterial()),config={seed:'712',biome:'canyons',relief:1,river:true},region=nativeNearRegion({x:0,z:0},'media');
 horizon.update(config,pack.profile,region,'media');const root=horizon.group,ground=root.children[0],water=root.children[1],geometry=ground.geometry,old=ground.material;let geos=0,mats=0;geometry.addEventListener('dispose',()=>geos++);old.addEventListener('dispose',()=>mats++);
 for(const quality of ['baja','muy_baja','media']){horizon.update(config,pack.profile,region,quality);assert.equal(horizon.group,root);assert.equal(ground.geometry,geometry);assert.equal(root.children[1],water);assert.equal(!!ground.material.isMeshBasicMaterial,quality==='muy_baja');assert.deepEqual(ground.material.userData.horizonBounds.toArray(),region.bounds);}
 assert.equal(geos,0);assert.equal(mats,1);horizon.dispose();assert.equal(geos,1);
});
