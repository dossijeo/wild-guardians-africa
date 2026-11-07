import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuLoadingContact} from '../src/rendering/webgpu-loading-contact.js';
import {createWebGpuLoadingFocus} from '../src/rendering/webgpu-loading-focus.js';
import {createWebGpuLoadingSoil} from '../src/rendering/webgpu-loading-soil.js';

test('loading contact tracks planted positions without rebuilding the material',()=>{
 const contact=createWebGpuLoadingContact({capacity:2}),camera=new THREE.PerspectiveCamera(),texture=new THREE.Texture(),material=contact.configure(createWebGpuLoadingFocus({camera}).configure(createWebGpuLoadingSoil(texture))),node=material.outputNode;
 assert.equal(contact.sync([{x:1,z:2}]),true);assert.deepEqual(contact.status(),{count:1,positions:[[1,-2]]});assert.equal(contact.sync([{x:1,z:2}]),false);assert.throws(()=>contact.sync([{x:3,z:4},{x:NaN,z:0}]),TypeError);assert.deepEqual(contact.status(),{count:1,positions:[[1,-2]]});assert.equal(contact.sync([{x:3,z:4},{x:-2,z:1}]),true);assert.deepEqual(contact.status(),{count:2,positions:[[3,-4],[-2,-1]]});assert.equal(material.outputNode,node);material.dispose();texture.dispose();
});

test('loading contact and focus build together in WGSL',()=>{
 const camera=new THREE.PerspectiveCamera(),texture=new THREE.Texture(),material=createWebGpuLoadingContact().configure(createWebGpuLoadingFocus({camera}).configure(createWebGpuLoadingSoil(texture))),geometry=new THREE.PlaneGeometry(),mesh=new THREE.Mesh(geometry,material),scene=new THREE.Scene(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;scene.add(mesh,new THREE.DirectionalLight(),new THREE.HemisphereLight());
 try{const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=scene;builder.camera=camera;builder.build();assert.match(builder.fragmentShader,/smoothstep/);assert.match(builder.fragmentShader,/loop|for\s*\(/);assert.match(builder.fragmentShader,/textureSample/);}finally{geometry.dispose();material.dispose();texture.dispose();}
});
