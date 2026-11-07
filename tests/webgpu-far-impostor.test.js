import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {MeshStandardNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {float} from 'three/tsl';
import {configureWebGpuFarModelCoverage,createWebGpuFarImpostor} from '../src/rendering/webgpu-far-impostor.js';

test('real far atlases build 8 by 8 TSL billboard with ordered coverage and owned instances',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/content/far-vegetation.json',import.meta.url),'utf8')),metadata=manifest.biomes.savanna[0],day=new THREE.Texture(),night=new THREE.Texture(),trees=[{id:'a',x:100,y:2,z:-50,yaw:.7,sx:2,sy:1.5,sz:.5},{id:'b',x:103,y:3,z:-53,yaw:-.2,scale:1}];
 const item=createWebGpuFarImpostor({metadata,day,night,trees}),mesh=item.mesh,canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 try{assert.equal(mesh.geometry.instanceCount,2);assert.equal(day.colorSpace,THREE.SRGBColorSpace);assert.equal(day.premultiplyAlpha,false);assert.equal(mesh.visible,false);assert.equal(mesh.castShadow,false);assert.equal(mesh.geometry.getAttribute('wgFarBase').getX(0),100);assert.equal(mesh.geometry.getAttribute('wgFarScale').getZ(0),.5);item.setNight(.5);assert.equal(item.phase.value,.5);assert.equal(item.setEnabled('b',false),true);assert.equal(mesh.geometry.getAttribute('wgFarReady').getX(1),0);assert.equal(item.setEnabled('missing',false),false);
 const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/wgFarBase/);assert.match(builder.vertexShader,/wgFarYaw/);assert.match(builder.fragmentShader,/textureSample/);assert.match(builder.fragmentShader,/64\.0/);assert.match(builder.fragmentShader,/discard/);
 }finally{item.dispose();day.dispose();night.dispose();}
});

test('the production manifest uses the supported atlas format in all six biomes',async()=>{const manifest=JSON.parse(await readFile(new URL('../public/content/far-vegetation.json',import.meta.url),'utf8'));assert.equal(Object.keys(manifest.biomes).length,6);for(const entries of Object.values(manifest.biomes))for(const m of entries){assert.equal(m.views,8);assert.equal(m.rotationViews,8);assert.equal(m.viewResolution,128);assert.equal(m.prelitAlphaEncoding,'srgb-encoded-linear-premultiplied');}});

test('candidate 3D coverage composes with existing opacity and uses the same ordered threshold',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/content/far-vegetation.json',import.meta.url),'utf8')),day=new THREE.Texture(),night=new THREE.Texture(),item=createWebGpuFarImpostor({metadata:manifest.biomes.savanna[0],day,night,trees:[{id:'a',x:0,y:0,z:0,yaw:0,scale:1}]}),material=new MeshStandardNodeMaterial({alphaTest:.35}),original=float(.5);material.opacityNode=original;configureWebGpuFarModelCoverage(material);const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 try{const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(item.mesh.geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/wgFarBase/);assert.match(builder.fragmentShader,/64\.0/);assert.match(builder.fragmentShader,/discard/);assert.match(builder.fragmentShader,/0\.5/);assert.notEqual(material.opacityNode,original);}finally{material.dispose();item.dispose();day.dispose();night.dispose();}
});

test('far atlas inputs reject invalid ranges, duplicates and incompatible encoding',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/content/far-vegetation.json',import.meta.url),'utf8')),metadata=manifest.biomes.savanna[0],day=new THREE.Texture(),night=new THREE.Texture(),tree={id:'a',x:0,y:0,z:0,yaw:0,scale:1};
 try{assert.throws(()=>createWebGpuFarImpostor({metadata,day,night,trees:[tree,tree]}),/far impostor/);assert.throws(()=>createWebGpuFarImpostor({metadata:{...metadata,rotationViews:1},day,night,trees:[]}),/far impostor/);assert.throws(()=>createWebGpuFarImpostor({metadata,day,night,trees:[tree],start:90,end:60}),/far impostor/);}finally{day.dispose();night.dispose();}
});
