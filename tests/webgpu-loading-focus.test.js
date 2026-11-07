import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer,MeshStandardNodeMaterial} from 'three/webgpu';
import {createWebGpuLoadingFocus} from '../src/rendering/webgpu-loading-focus.js';
import {createWebGpuLoadingSoil} from '../src/rendering/webgpu-loading-soil.js';

test('loading focus shares one stable graph across soil and crops',()=>{
 const camera=new THREE.PerspectiveCamera(40,1,.1,80),focus=createWebGpuLoadingFocus({camera}),texture=new THREE.Texture(),soil=createWebGpuLoadingSoil(texture),crop=new MeshStandardNodeMaterial();
 focus.configure(soil);focus.configure(crop);assert.equal(soil.outputNode,crop.outputNode);const node=soil.outputNode;camera.position.set(4.8,3.1,6.4);camera.lookAt(0,1.15,0);camera.updateProjectionMatrix();focus.update({day:1,time:0});focus.update({day:1,time:310});assert.equal(soil.outputNode,node);assert.throws(()=>focus.configure(crop),TypeError);soil.dispose();crop.dispose();texture.dispose();
});

test('loading focus composes with the lit soil output in WGSL',()=>{
 const camera=new THREE.PerspectiveCamera(),focus=createWebGpuLoadingFocus({camera}),texture=new THREE.Texture(),material=focus.configure(createWebGpuLoadingSoil(texture)),geometry=new THREE.PlaneGeometry(),mesh=new THREE.Mesh(geometry,material),scene=new THREE.Scene(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;scene.add(mesh,new THREE.DirectionalLight(),new THREE.HemisphereLight());
 try{const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=scene;builder.camera=camera;builder.build();assert.match(builder.fragmentShader,/smoothstep/);assert.match(builder.fragmentShader,/textureSample/);assert.match(builder.fragmentShader,/output/);}finally{geometry.dispose();material.dispose();texture.dispose();}
});
