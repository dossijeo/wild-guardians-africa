import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFarImpostorPrototype} from '../tools/experiments/far-impostor-prototype.js';
test('native-backed impostors allocate no duplicate 3D resources and preserve per-tree state',()=>{
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),texture=new THREE.Texture();
 geometry.clone=()=>{throw Error('Duplicate geometry');};material.clone=()=>{throw Error('Duplicate material');};
 const tree={id:'acacia',x:0,y:0,z:0,yaw:0,scale:1},metadata={impostorWidth:2,impostorHeight:3,localBase:[0,0,0]};
 const p=createFarImpostorPrototype({geometry,material},texture,metadata,[tree],{nativeModels:false});
 assert.equal(p.models,undefined);p.update(new THREE.PerspectiveCamera());assert.equal(p.stats().matrixUploads,0);
 p.setTreeReadiness(tree.id,.25);assert.equal(p.impostors.geometry.attributes.aTreeReady.getX(0),.25);
 p.setTreeEnabled(tree.id,false);assert.equal(p.impostors.geometry.attributes.aTreeReady.getX(0),-1);
 p.setTreeEnabled(tree.id,true);assert.equal(p.impostors.geometry.attributes.aTreeReady.getX(0),.25);
 let sourceDisposed=0,textureDisposed=0;geometry.addEventListener('dispose',()=>sourceDisposed++);material.addEventListener('dispose',()=>sourceDisposed++);texture.addEventListener('dispose',()=>textureDisposed++);
 p.dispose({disposeTexture:false});assert.equal(sourceDisposed,0);assert.equal(textureDisposed,0);
 geometry.dispose();material.dispose();texture.dispose();
});

test('horizontal atlas base generates float operands for GLSL',()=>{
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),texture=new THREE.Texture();
 const p=createFarImpostorPrototype({geometry,material},texture,{impostorWidth:2,impostorHeight:3,baseV:0,localBase:[0,0,0]},[{id:'tree',x:0,y:0,z:0,yaw:0,scale:1}],{nativeModels:false});
 assert.match(p.impostors.material.vertexShader,/uv.y-0\.0/);
 assert.doesNotMatch(p.impostors.material.vertexShader,/uv.y-0\)/);
 p.dispose();geometry.dispose();material.dispose();
});
