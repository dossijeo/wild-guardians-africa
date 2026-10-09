import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LoadingDiorama,featherLoadingBackdrop} from '../src/rendering/loading-diorama.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {createBiomeBackdrop} from '../src/rendering/biome-backdrop.js';

test('diorama disposes its private shadow fallback exactly once without touching native owners',()=>{
 const toon=new AfricanToon(),nativeToon=new AfricanToon(),nativeMap=new THREE.DepthTexture(1,1);
 let fallbackDisposes=0,nativeDisposes=0,mapDisposes=0;toon.shadowUniforms.fallback.addEventListener('dispose',()=>fallbackDisposes++);nativeToon.shadowUniforms.fallback.addEventListener('dispose',()=>nativeDisposes++);nativeMap.addEventListener('dispose',()=>mapDisposes++);
 toon.shadowUniforms.uNativeShadowFiltered.value=nativeMap;
 let aborts=0,locals=0;const release=()=>locals++;
 const owner=Object.assign(Object.create(LoadingDiorama.prototype),{toon,abort:{abort:()=>aborts++},batch:{dispose:release},mist:{dispose:release},ground:{geometry:{dispose:release},material:{dispose:release}},textureOwner:{dispose:release},scene:{clear:release}});
 owner.dispose();owner.dispose();assert.equal(fallbackDisposes,1);assert.equal(nativeDisposes,0);assert.equal(mapDisposes,0);assert.equal(toon.shadowUniforms.uNativeShadowFiltered.value,null);assert.equal(aborts,1);assert.equal(locals,6);assert.equal(owner.disposed,true);assert.equal(owner.interactive,false);
 nativeToon.shadowUniforms.fallback.dispose();nativeMap.dispose();
});


test('loading-only mountain atlas arriving after either owner closes is disposed without adoption',async()=>{
 for(const close of ['diorama','world']){
  let complete,disposes=0;const atlas=new THREE.Texture();atlas.addEventListener('dispose',()=>disposes++);
  const world={assets:{textures:{loadAsync:()=>new Promise(resolve=>complete=resolve)}}},owner=Object.assign(Object.create(LoadingDiorama.prototype),{world});
  const pending=owner.loadBackdropTexture('/atlas.webp');if(close==='diorama')owner.disposed=true;else world.disposed=true;complete(atlas);
  await assert.rejects(pending,/cancelled/);assert.equal(disposes,1);assert.equal(owner.backdropTexture,undefined);
 }
});


test('presentation mountain foot feathers the actual native recipe without changing a separate world material',()=>{
 const world={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),nav:{config:{biome:'savanna'},field:{surface:()=>0}},toon:{uniforms:{uNight:{value:0}}}},texture=new THREE.Texture(),options={radius:35,arcLayout:[{angle:0,height:6,aspect:2,baseY:-1,baseline:0,uv:[0,0,1,1]}],stableAltitude:false};
 const native=createBiomeBackdrop(world,texture,options),loading=createBiomeBackdrop(world,texture,options),before=native.root.children[0].material.fragmentShader;
 featherLoadingBackdrop(loading);assert.equal(native.root.children[0].material.fragmentShader,before);assert.equal(native.root.children[0].material.transparent,false);assert.equal(loading.root.children[0].material.transparent,true);assert.match(loading.root.children[0].material.fragmentShader,/smoothstep\(\.02,\.4,vBackdropHeight\)\*c\.a/);
 assert.equal(loading.root.children[0].material.uniforms.uBackdropAtlas.value,texture);native.dispose();loading.dispose();texture.dispose();
});
