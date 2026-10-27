import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFarImpostorPrototype} from '../tools/experiments/far-impostor-prototype.js';
import {createFarImpostorDepthMaterial} from '../tools/experiments/far-impostor-depth-material.js';
for(const prelit of [false,true])test('depth keeps exact atlas and coverage prefix, prelit='+prelit,()=>{
 const source={geometry:new THREE.BoxGeometry(),material:new THREE.MeshStandardMaterial()},texture=new THREE.Texture(),scene=new THREE.Scene();
 const atlas=prelit?{day:new THREE.Texture(),night:new THREE.Texture(),rotations:8,views:8,resolution:512}:null;
 const p=createFarImpostorPrototype(source,texture,{impostorWidth:2,impostorHeight:4,localBase:[0,0,0]},[{id:'a',x:0,y:0,z:0,yaw:0,scale:1}],{nativeModels:false,smoothScene:scene,prelitAtlas:atlas});
 const original=p.impostors.children[0].material,depth=createFarImpostorDepthMaterial(original);
 const a={vertexShader:original.vertexShader,fragmentShader:original.fragmentShader},b={vertexShader:depth.vertexShader,fragmentShader:depth.fragmentShader};original.onBeforeCompile(a);depth.onBeforeCompile(b);
 const anchor='if(c.a<.35)discard;',prefix=a.fragmentShader.slice(0,a.fragmentShader.indexOf(anchor)+anchor.length);
 assert.equal(b.vertexShader,a.vertexShader);assert.equal(b.fragmentShader,prefix+'gl_FragColor=vec4(1.);\n}');assert.equal(depth.uniforms,original.uniforms);assert.ok(b.fragmentShader.includes('if(vMix*vDensityFade<.999)discard;'));
 assert.throws(()=>createFarImpostorDepthMaterial(p.impostors.material),/opaque/);
 depth.dispose();p.dispose({disposeTexture:false});texture.dispose();atlas?.day.dispose();atlas?.night.dispose();source.geometry.dispose();source.material.dispose();
});
