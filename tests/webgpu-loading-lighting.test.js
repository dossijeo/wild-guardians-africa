import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshStandardNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {lights} from 'three/tsl';
import {createWebGpuLoadingLighting} from '../src/rendering/webgpu-loading-lighting.js';
import {createWebGpuLoadingFocus} from '../src/rendering/webgpu-loading-focus.js';
import {createWebGpuLoadingDiffuse} from '../src/rendering/webgpu-loading-diffuse.js';
import {createWebGpuLoadingContact} from '../src/rendering/webgpu-loading-contact.js';
import {createWebGpuLoadingSoil} from '../src/rendering/webgpu-loading-soil.js';

test('loading light follows the camera, day/night and releases its shadow hook',()=>{
 const scene=new THREE.Scene(),renderer={shadowMap:{}},camera=new THREE.PerspectiveCamera();camera.rotation.y=Math.PI/2;const light=createWebGpuLoadingLighting({scene,renderer,camera});light.update({day:1,time:0});const expected=new THREE.Vector3(.48,1,0).normalize().applyQuaternion(camera.quaternion).multiplyScalar(60);assert.ok(light.sun.position.distanceTo(expected)<1e-8);assert.equal(renderer.shadowMap.enabled,true);assert.equal(light.sun.castShadow,true);assert.equal(light.sun.shadow.mapSize.x,512);assert.equal(light.sun.intensity,3);assert.ok(light.visibility.isNode);light.update({day:1,time:310});assert.ok(light.sun.intensity<3);assert.ok(light.ambient.intensity<2);light.dispose();assert.equal(light.sun.shadow.shadowNode,undefined);assert.equal(scene.children.includes(light.sun),false);assert.throws(()=>light.update({}),/disposed/);light.dispose();
});

test('loading soil and crop compile with the same directional shadow node',()=>{
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),light=createWebGpuLoadingLighting({scene,renderer,camera}),focus=createWebGpuLoadingFocus({camera}),beam=createWebGpuLoadingDiffuse({camera,visibility:light.visibility}),contact=createWebGpuLoadingContact(),image=new THREE.Texture(),soil=contact.configure(beam.configure(focus.configure(createWebGpuLoadingSoil(image)),{ground:true})),crop=beam.configure(focus.configure(new MeshStandardNodeMaterial())),geometry=new THREE.PlaneGeometry();let target;
 try{for(const material of [soil,crop]){const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;scene.add(mesh);const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=scene;builder.camera=camera;builder.lightsNode=lights([light.sun,light.ambient]);builder.build();assert.match(builder.fragmentShader,/textureSampleCompare/);assert.ok(light.sun.shadow.map?.isRenderTarget);if(target)assert.equal(light.sun.shadow.map,target);else target=light.sun.shadow.map;scene.remove(mesh);}}finally{light.dispose();geometry.dispose();soil.dispose();crop.dispose();image.dispose();}
});
