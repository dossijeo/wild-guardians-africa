import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LoadingTextureOwner} from '../src/rendering/loading-texture-owner.js';
test('local presentation textures share exact native Sources and sampler settings',()=>{
 const pixels=new Uint8Array(16),original=new THREE.DataTexture(pixels,2,2);original.colorSpace=THREE.SRGBColorSpace;original.anisotropy=8;original.wrapS=THREE.RepeatWrapping;original.flipY=false;
 const owner=new LoadingTextureOwner(),copy=owner.borrow(original);assert.notEqual(copy,original);assert.equal(copy.source,original.source);assert.equal(copy.image.data,pixels);for(const key of ['colorSpace','anisotropy','wrapS','wrapT','flipY','premultiplyAlpha','format','type','internalFormat','generateMipmaps','minFilter','magFilter'])assert.equal(copy[key],original[key]);assert.equal(owner.borrow(original),copy);owner.dispose();
});
test('shared material samplers have one local owner, with originals untouched',()=>{
 const original=new THREE.Texture(),owner=new LoadingTextureOwner(),a={map:original,normalMap:original},b={map:original};owner.material(a);owner.material(b);assert.equal(a.map,a.normalMap);assert.equal(a.map,b.map);assert.equal(owner.copies.size,1);let originalDisposes=0,localDisposes=0;original.addEventListener('dispose',()=>originalDisposes++);a.map.addEventListener('dispose',()=>localDisposes++);owner.dispose();owner.dispose();assert.equal(originalDisposes,0);assert.equal(localDisposes,1);assert.throws(()=>owner.borrow(original),/disposed/);
});
test('local disposal does not close a borrowed bitmap or native source',()=>{
 let closes=0;const bitmap={width:2,height:2,close:()=>closes++},original=new THREE.Texture(bitmap),owner=new LoadingTextureOwner();owner.borrow(original);owner.dispose();assert.equal(closes,0);assert.equal(original.image,bitmap);assert.equal(original.source.data,bitmap);
});

test('presentation disposal leaves a native asset owner able to release its source later',()=>{
 const original=new THREE.Texture(),owned=new Set([original]);let releases=0;original.addEventListener('dispose',()=>{owned.delete(original);releases++;});
 const owner=new LoadingTextureOwner();owner.borrow(original);owner.dispose();assert.equal(owned.has(original),true);assert.equal(releases,0);original.dispose();assert.equal(releases,1);assert.equal(owned.size,0);
});
