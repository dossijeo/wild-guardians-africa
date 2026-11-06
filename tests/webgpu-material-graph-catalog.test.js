import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshBasicNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {characterColorRecipe,progressiveCharacterColorGraph,structureColorRecipe,structureColorGraph,waterColorRecipe,lavaColorRecipe} from '../src/rendering/webgpu-material-graph-catalog.js';

test('color recipes separate graph structure from dynamic material data',()=>{
 const a=new THREE.Texture(),b=new THREE.Texture();b.wrapS=THREE.RepeatWrapping;b.magFilter=THREE.NearestFilter;b.minFilter=THREE.NearestFilter;b.anisotropy=4;
 const first=characterColorRecipe(a),second=characterColorRecipe(b);assert.notEqual(first.key,second.key);assert.notEqual(progressiveCharacterColorGraph(a),progressiveCharacterColorGraph(b));assert.deepEqual(first.dynamic,['map','color','_wgTextureBlend']);assert.ok(Object.isFrozen(first.structural.binding));
 b.wrapS=a.wrapS;b.magFilter=a.magFilter;b.minFilter=a.minFilter;b.anisotropy=a.anisotropy;assert.equal(first.key,characterColorRecipe(b).key);b.channel=1;assert.notEqual(first.key,characterColorRecipe(b).key);assert.notEqual(progressiveCharacterColorGraph(a),progressiveCharacterColorGraph(b));b.channel=0;b.colorSpace=THREE.SRGBColorSpace;assert.notEqual(first.key,characterColorRecipe(b).key);
 const cube=new THREE.CubeTexture();assert.notEqual(first.key,characterColorRecipe(cube).key);a.dispose();b.dispose();cube.dispose();
});

test('structure recipe distinguishes vertex color layouts and keeps per-material inputs',()=>{
 const rgb=structureColorRecipe(3),rgba=structureColorRecipe(4);assert.notEqual(rgb.key,rgba.key);assert.deepEqual(rgb.dynamic,['map','_wgTextureBlend']);assert.equal(structureColorGraph(3),structureColorGraph(3));assert.notEqual(structureColorGraph(3),structureColorGraph(4));assert.throws(()=>structureColorRecipe(2),/layout/);
});

test('nearest and repeat sampling can generate a different WebGPU shader',()=>{
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;const a=new THREE.Texture(),b=new THREE.Texture();b.wrapS=THREE.RepeatWrapping;b.minFilter=THREE.NearestFilter;b.magFilter=THREE.NearestFilter;const geometry=new THREE.PlaneGeometry();geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(16).fill(1),4));geometry.setAttribute('wgOriginalColor',new THREE.Float32BufferAttribute(new Float32Array(16).fill(1),4));const output=[];
 try{for(const map of [a,b]){const material=new MeshBasicNodeMaterial({map});material._wgTextureBlend=.5;material.colorNode=progressiveCharacterColorGraph(map);const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();output.push(builder.fragmentShader);material.dispose();}assert.notEqual(output[0],output[1]);assert.match(output[0],/textureSample/);assert.match(output[1],/textureLoad/);}finally{geometry.dispose();a.dispose();b.dispose();}
});

test('anisotropy leaves generated WebGPU color code unchanged while sampler policy remains separate',()=>{
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;const a=new THREE.Texture(),b=new THREE.Texture();b.anisotropy=4;const geometry=new THREE.PlaneGeometry();geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(16).fill(1),4));geometry.setAttribute('wgOriginalColor',new THREE.Float32BufferAttribute(new Float32Array(16).fill(1),4));const output=[];
 try{assert.equal(characterColorRecipe(a).key,characterColorRecipe(b).key);assert.notEqual(characterColorRecipe(a).sampler.anisotropy,characterColorRecipe(b).sampler.anisotropy);for(const map of [a,b]){const material=new MeshBasicNodeMaterial({map});material._wgTextureBlend=.5;material.colorNode=progressiveCharacterColorGraph(map);const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();output.push(builder.fragmentShader);material.dispose();}assert.equal(output[0],output[1]);}finally{geometry.dispose();a.dispose();b.dispose();}
});

test('water recipe separates graph inputs from clipping state and shadow-light identity',()=>{
 const sun=new THREE.DirectionalLight(),otherSun=new THREE.DirectionalLight(),base={offset:[1,2],palette:[[.1,.2,.3]],sun},plain=waterColorRecipe(base),clipped=waterColorRecipe({...base,clip:true}),other=waterColorRecipe({...base,sun:otherSun}),reflected=waterColorRecipe({...base,reflection:true});assert.equal(plain.graphKey,clipped.graphKey);assert.notEqual(plain.key,clipped.key);assert.notEqual(plain.graphKey,other.graphKey);assert.notEqual(plain.graphKey,reflected.graphKey);assert.equal(plain.passes.depth,'inherited-unverified');assert.ok(plain.dynamic.includes('clock'));assert.ok(Object.isFrozen(plain.structural.embeddedPalette[0]));
});
test('lava recipe keeps clipped material state distinct while sharing its color graph',()=>{const options={offset:[1,2],palette:[[.1,.2,.3]]},plain=lavaColorRecipe(options),clipped=lavaColorRecipe({...options,clip:true});assert.equal(plain.graphKey,clipped.graphKey);assert.notEqual(plain.key,clipped.key);assert.deepEqual(plain.dynamic,['clock']);assert.equal(plain.passes.shadow,'inherited-unverified');});
