import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {uniform} from 'three/tsl';
import {createWebGpuLavaMaterial,lavaClock,lavaWorldSeed} from '../src/rendering/webgpu-lava-material.js';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';

test('lava instances share graph and retain independent palette and seed',()=>{const clockNode=uniform(0),a=createWebGpuLavaMaterial({color:'#ff6130',seed:28,clockNode}),b=createWebGpuLavaMaterial({color:'#995522',seed:3,clockNode});try{assert.equal(a.colorNode,b.colorNode);assert.notDeepEqual(a._wgFluidOffset.toArray(),b._wgFluidOffset.toArray());assert.notEqual(a._wgFluidInk0,b._wgFluidInk0);const before=b._wgFluidInk0.toArray();a._wgFluidInk0.set(0,0,0);assert.deepEqual(b._wgFluidInk0.toArray(),before);}finally{a.dispose();b.dispose();}});

test('fluid phase uses the same terrain seed as the original renderer',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
 for(const seed of ['28','0','4294967297']){const core=createSpatialWorld(module);core.generate(seed,0,0,'volcanoes');assert.equal(lavaWorldSeed(seed),core.terrainState().seed);}
});

test('lava and its chunk clip generate a bounded WebGPU shader from the shared clock',()=>{
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas}),clock=lavaClock(3),material=createWebGpuLavaMaterial({color:'#ed5c18',seed:'28',clockNode:clock}),geometry=new THREE.PlaneGeometry();geometry.setAttribute('wgChunkClip',new THREE.InstancedBufferAttribute(new Float32Array([-24,-24,24,24]),4));
 const mesh=new THREE.InstancedMesh(geometry,material,1),builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();
 assert.match(builder.vertexShader,/wgChunkClip/);assert.match(builder.fragmentShader,/fwidth/);assert.match(builder.fragmentShader,/smoothstep/);assert.match(builder.fragmentShader,/discard/);assert.ok(builder.fragmentShader.length<25000);assert.equal(clock.value,3);mesh.dispose();geometry.dispose();material.dispose();
});

test('terrain and instanced lava share the formula and time without requiring terrain clip attributes',()=>{
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas}),clock=lavaClock(7),clipped=createWebGpuLavaMaterial({color:'#ed5c18',seed:'28',clockNode:clock}),terrain=createWebGpuLavaMaterial({color:'#ed5c18',seed:'28',clockNode:clock,clip:false});
 assert.equal(terrain.colorNode,clipped.colorNode);assert.equal(terrain.opacityNode,null);assert.equal(terrain.alphaTest,0);assert.notEqual(clipped.opacityNode,null);
 const geometry=new THREE.PlaneGeometry(),builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,terrain),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.match(builder.fragmentShader,/fwidth/);assert.doesNotMatch(builder.vertexShader,/wgChunkClip/);assert.doesNotMatch(builder.fragmentShader,/discard/);geometry.dispose();terrain.dispose();clipped.dispose();
});
