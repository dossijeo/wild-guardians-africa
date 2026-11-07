import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer,MeshStandardNodeMaterial} from 'three/webgpu';
import {float,texture,uniform} from 'three/tsl';
import {createWebGpuLoadingToon} from '../src/rendering/webgpu-loading-toon.js';
import {createWebGpuLoadingFocus} from '../src/rendering/webgpu-loading-focus.js';
import {createWebGpuLoadingDiffuse} from '../src/rendering/webgpu-loading-diffuse.js';

test('loading crop toon uses stable nodes and the existing focus and diffuse passes',()=>{
 const camera=new THREE.PerspectiveCamera(),light=new THREE.DirectionalLight(),toon=createWebGpuLoadingToon({light,visibility:float(1)}),focus=createWebGpuLoadingFocus({camera}),diffuse=createWebGpuLoadingDiffuse({camera,visibility:float(1)}),material=new MeshStandardNodeMaterial(),geometry=new THREE.BoxGeometry(),mesh=new THREE.Mesh(geometry,material),scene=new THREE.Scene(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 diffuse.configure(focus.configure(material,{base:toon.node}));const node=material.outputNode;light.position.set(-30,55,25);scene.add(mesh,light,new THREE.HemisphereLight());toon.update({day:1,time:0});toon.update({day:1,time:310});assert.equal(material.outputNode,node);
 try{const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=scene;builder.camera=camera;builder.build();assert.match(builder.fragmentShader,/fwidth/);assert.match(builder.fragmentShader,/smoothstep/);assert.match(builder.fragmentShader,/floor/);}finally{geometry.dispose();material.dispose();}
});

test('loading toon samples the shared environment without replacing its graph',()=>{
 const day=new THREE.DataTexture(new Uint8Array([32,48,64,255]),1,1),dark=new THREE.DataTexture(new Uint8Array([8,12,24,255]),1,1),environment={day:texture(day),dark:texture(dark),blend:uniform(0)},camera=new THREE.PerspectiveCamera(),light=new THREE.DirectionalLight(),toon=createWebGpuLoadingToon({light,visibility:float(1),environment}),material=new MeshStandardNodeMaterial(),geometry=new THREE.BoxGeometry(),mesh=new THREE.Mesh(geometry,material),scene=new THREE.Scene(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;day.minFilter=day.magFilter=dark.minFilter=dark.magFilter=THREE.LinearFilter;material.outputNode=toon.node;scene.add(mesh,light);const node=toon.node;environment.blend.value=1;toon.update({day:1,time:310});assert.equal(toon.node,node);
 try{const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=scene;builder.camera=camera;builder.build();assert.match(builder.fragmentShader,/textureSampleLevel/);}finally{geometry.dispose();material.dispose();day.dispose();dark.dispose();}
});
