import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuLavaMaterial,lavaClock} from '../src/rendering/webgpu-lava-material.js';

test('lava and its chunk clip generate a bounded WebGPU shader from the shared clock',()=>{
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas}),clock=lavaClock(3),material=createWebGpuLavaMaterial({color:'#ed5c18',seed:'28',clockNode:clock}),geometry=new THREE.PlaneGeometry();geometry.setAttribute('wgChunkClip',new THREE.InstancedBufferAttribute(new Float32Array([-24,-24,24,24]),4));
 const mesh=new THREE.InstancedMesh(geometry,material,1),builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();
 assert.match(builder.vertexShader,/wgChunkClip/);assert.match(builder.fragmentShader,/fwidth/);assert.match(builder.fragmentShader,/smoothstep/);assert.match(builder.fragmentShader,/discard/);assert.ok(builder.fragmentShader.length<25000);assert.equal(clock.value,3);mesh.dispose();geometry.dispose();material.dispose();
});
