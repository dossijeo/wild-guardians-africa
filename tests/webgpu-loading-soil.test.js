import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuLoadingSoil} from '../src/rendering/webgpu-loading-soil.js';

test('loading soil keeps its texture binding while the image arrives',()=>{
 const texture=new THREE.Texture(),material=createWebGpuLoadingSoil(texture),color=material.colorNode,opacity=material.opacityNode;
 assert.equal(material.transparent,true);assert.equal(material.alphaTest,.01);assert.equal(material.depthWrite,true);
 texture.image={width:1,height:1};texture.needsUpdate=true;
 assert.equal(material.colorNode,color);assert.equal(material.opacityNode,opacity);material.dispose();texture.dispose();
 assert.throws(()=>createWebGpuLoadingSoil(null),TypeError);
});

test('loading soil generates WGSL for the textured and feathered patch',()=>{
 const texture=new THREE.Texture(),material=createWebGpuLoadingSoil(texture),geometry=new THREE.PlaneGeometry(15,15,32,32),mesh=new THREE.Mesh(geometry,material),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 scene.add(mesh,new THREE.DirectionalLight(),new THREE.HemisphereLight());
 try{const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=scene;builder.camera=camera;builder.build();assert.match(builder.fragmentShader,/textureSample/);assert.match(builder.fragmentShader,/smoothstep/);assert.match(builder.fragmentShader,/discard/);}finally{geometry.dispose();material.dispose();texture.dispose();}
});
