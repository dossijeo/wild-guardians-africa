import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {uniform,float,shadow} from 'three/tsl';
import {createWebGpuGrassMaterial} from '../src/rendering/webgpu-grass-material.js';
import {packWebGpuStaticVertexLayout} from '../src/rendering/webgpu-static-vertex-layout.js';

test('authored grass deformation builds a WebGPU shader using shared bindings',()=>{
 const atlas=new THREE.Texture(),clock=uniform(0),material=createWebGpuGrassMaterial({atlas,clock,seed:uniform(new THREE.Vector2()),scale:uniform(.1),spacing:uniform(1),far:uniform(48),wind:uniform(8),night:uniform(0),nightLight:uniform(1),exposure:uniform(1),sunDirection:uniform(new THREE.Vector3(0,1,0)),shadowVisibility:float(1)}),geometry=new THREE.InstancedBufferGeometry();
 for(const [name,size] of [['position',3],['normal',3],['uv',2],['flatPosition',3],['bladeRoot',3],['flatNormal',3]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(new Float32Array(size*3),size));for(const [name,size] of [['coverageAnchor',4],['coverageData',4],['coverageSlope',2]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(size),size));geometry.instanceCount=1;packWebGpuStaticVertexLayout(geometry);
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;try{const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/coverageAnchor/);assert.match(builder.vertexShader,/sin\(/);assert.match(builder.vertexShader,/if\s*\(\s*\(\s*uv\.y\s*>=/);assert.doesNotMatch(builder.vertexShader,/f32\(\s*\(\s*uv\.y\s*>=/);assert.match(builder.vertexShader,/textureSampleLevel/);const attrs=builder.getAttributesArray().map(n=>n.node?.attribute??geometry.getAttribute(n.name)).filter(Boolean),buffers=new Set(attrs.map(a=>a.isInterleavedBufferAttribute?a.data:a));assert.ok(buffers.size<=8);}finally{geometry.dispose();material.dispose();atlas.dispose();}
});

test('grass supplies an instance-root world position to the shadow pass',()=>{
 const atlas=new THREE.Texture(),mat=createWebGpuGrassMaterial({atlas,clock:uniform(1),seed:uniform(new THREE.Vector2()),scale:uniform(1),spacing:uniform(1),far:uniform(48),wind:uniform(1),night:uniform(0),nightLight:uniform(1),exposure:uniform(1),sunDirection:uniform(new THREE.Vector3(0,1,0))});
 try{assert.ok(mat.receivedShadowPositionNode?.isNode);assert.ok(mat.positionNode?.isNode);assert.notEqual(mat.receivedShadowPositionNode,mat.positionNode);}finally{mat.dispose();atlas.dispose();}
});


test('grass graph builds with the shared directional shadow node',()=>{
 const atlas=new THREE.Texture(),light=new THREE.DirectionalLight();light.castShadow=true;
 const material=createWebGpuGrassMaterial({atlas,clock:uniform(0),seed:uniform(new THREE.Vector2()),scale:uniform(.1),spacing:uniform(1),far:uniform(48),wind:uniform(8),night:uniform(0),nightLight:uniform(1),exposure:uniform(1),sunDirection:uniform(new THREE.Vector3(0,1,0)),shadowVisibility:shadow(light).r});
 const geometry=new THREE.InstancedBufferGeometry();for(const [name,size] of [['position',3],['normal',3],['uv',2],['flatPosition',3],['bladeRoot',3],['flatNormal',3]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(new Float32Array(size*3),size));for(const [name,size] of [['coverageAnchor',4],['coverageData',4],['coverageSlope',2]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(size),size));geometry.instanceCount=1;packWebGpuStaticVertexLayout(geometry);
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;renderer.shadowMap.enabled=true;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();scene.add(light);try{const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=scene;builder.camera=camera;builder.build();assert.match(builder.fragmentShader,/textureSampleCompare/);assert.match(builder.vertexShader,/coverageAnchor/);}finally{geometry.dispose();material.dispose();atlas.dispose();}
});
