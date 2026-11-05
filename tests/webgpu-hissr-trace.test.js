import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshBasicNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {texture,uniform,vec3} from 'three/tsl';
import {hiSsrTraceNode} from '../src/rendering/webgpu-hissr-trace.js';

test('hierarchical reflection trace produces WebGPU depth loads and bounded traversal',()=>{
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;renderer.backend.renderer=renderer;
 const depth=new THREE.DepthTexture(5,3),level1=new THREE.DataTexture(new Float32Array(6),3,2,THREE.RedFormat,THREE.FloatType),level2=new THREE.DataTexture(new Float32Array(2),2,1,THREE.RedFormat,THREE.FloatType),camera=new THREE.PerspectiveCamera();camera.coordinateSystem=THREE.WebGPUCoordinateSystem;camera.updateProjectionMatrix();
 const material=new MeshBasicNodeMaterial({toneMapped:false}),geometry=new THREE.PlaneGeometry();
 try{
  material.outputNode=hiSsrTraceNode({depth:texture(depth),levels:[texture(level1),texture(level2)],resolution:uniform(new THREE.Vector2(5,3)),start:vec3(0,0,-1),end:vec3(1,1,-5),projection:uniform(camera.projectionMatrix),projectionInverse:uniform(camera.projectionMatrixInverse),thickness:uniform(.1),maxSteps:48});
  const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=camera;builder.build();
  assert.match(builder.fragmentShader,/textureLoad/);assert.match(builder.fragmentShader,/loop|for\s*\(/);assert.match(builder.fragmentShader,/48/);assert.match(builder.fragmentShader,/break/);
 }finally{geometry.dispose();material.dispose();depth.dispose();level1.dispose();level2.dispose();}
});

test('hierarchical reflection trace rejects missing or invalid resources',()=>{
 assert.throws(()=>hiSsrTraceNode({levels:[]}),/Invalid Hi-SSR/);
});
