import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshStandardNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {createWebGpuLoadingFocus} from '../src/rendering/webgpu-loading-focus.js';
import {createWebGpuLoadingSoil} from '../src/rendering/webgpu-loading-soil.js';
import {createWebGpuLoadingContact} from '../src/rendering/webgpu-loading-contact.js';
import {createWebGpuLoadingDiffuse} from '../src/rendering/webgpu-loading-diffuse.js';

test('loading diffuse preserves the graph while updating garden and sky uniforms',()=>{
 const camera=new THREE.PerspectiveCamera(40,2),focus=createWebGpuLoadingFocus({camera}),beam=createWebGpuLoadingDiffuse({camera}),texture=new THREE.Texture(),soil=beam.configure(focus.configure(createWebGpuLoadingSoil(texture)),{ground:true}),crop=beam.configure(focus.configure(new MeshStandardNodeMaterial())),groundNode=soil.outputNode,cropNode=crop.outputNode;
 beam.update({time:0,day:1,plants:[]});assert.equal(beam.status().inner,2.9);beam.update({time:310,day:1,plants:[{x:4,z:0}]});assert.equal(beam.status().inner,4.6);assert.equal(beam.status().aspect,2);assert.equal(soil.outputNode,groundNode);assert.equal(crop.outputNode,cropNode);assert.throws(()=>beam.update({plants:[{x:NaN,z:0}]}),TypeError);soil.dispose();crop.dispose();texture.dispose();
});

test('loading diffuse composes soil contact and crop materials into WGSL',()=>{
 const camera=new THREE.PerspectiveCamera(),beam=createWebGpuLoadingDiffuse({camera}),focus=createWebGpuLoadingFocus({camera}),contact=createWebGpuLoadingContact(),texture=new THREE.Texture(),soil=contact.configure(beam.configure(focus.configure(createWebGpuLoadingSoil(texture)),{ground:true})),crop=beam.configure(focus.configure(new MeshStandardNodeMaterial())),geometry=new THREE.PlaneGeometry(),scene=new THREE.Scene(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;scene.add(new THREE.DirectionalLight(),new THREE.HemisphereLight());
 try{for(const material of [soil,crop]){const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=scene;builder.camera=camera;builder.build();assert.match(builder.fragmentShader,/exp\(/);assert.match(builder.fragmentShader,/smoothstep/);scene.remove(mesh);}}finally{geometry.dispose();soil.dispose();crop.dispose();texture.dispose();}
});
