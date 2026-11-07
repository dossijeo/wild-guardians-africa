import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer,MeshStandardNodeMaterial} from 'three/webgpu';
import {float} from 'three/tsl';
import {createWebGpuLoadingToon} from '../src/rendering/webgpu-loading-toon.js';
import {createWebGpuLoadingFocus} from '../src/rendering/webgpu-loading-focus.js';
import {createWebGpuLoadingDiffuse} from '../src/rendering/webgpu-loading-diffuse.js';

test('loading crop toon uses stable nodes and the existing focus and diffuse passes',()=>{
 const camera=new THREE.PerspectiveCamera(),light=new THREE.DirectionalLight(),toon=createWebGpuLoadingToon({light,visibility:float(1)}),focus=createWebGpuLoadingFocus({camera}),diffuse=createWebGpuLoadingDiffuse({camera,visibility:float(1)}),material=new MeshStandardNodeMaterial(),geometry=new THREE.BoxGeometry(),mesh=new THREE.Mesh(geometry,material),scene=new THREE.Scene(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 diffuse.configure(focus.configure(material,{base:toon.node}));const node=material.outputNode;light.position.set(-30,55,25);scene.add(mesh,light,new THREE.HemisphereLight());toon.update({day:1,time:0});toon.update({day:1,time:310});assert.equal(material.outputNode,node);
 try{const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=scene;builder.camera=camera;builder.build();assert.match(builder.fragmentShader,/fwidth/);assert.match(builder.fragmentShader,/smoothstep/);assert.match(builder.fragmentShader,/floor/);}finally{geometry.dispose();material.dispose();}
});
