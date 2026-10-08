import test from 'node:test';
import assert from 'node:assert/strict';
import {premultiplyPrelitLinear} from '../tools/experiments/prelit-linear-alpha.js';
import * as THREE from 'three';
import {createFarImpostorPrototype} from '../tools/experiments/far-impostor-prototype.js';
const decode=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
test('offline prelit encoding preserves alpha and opaque RGB without mutation',()=>{
 const source=new Uint8Array([204,153,51,255,91,211,73,0]),copy=source.slice(),out=premultiplyPrelitLinear(source);
 assert.deepEqual(source,copy);assert.deepEqual(out,new Uint8Array([204,153,51,255,0,0,0,0]));
});
test('offline linear prelit pilot avoids duplicate upload premultiplication including day alias',()=>{
 const source=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),metadata={impostorWidth:2,impostorHeight:3,localBase:[0,0,0]},tree={id:'tree',x:0,y:0,z:0,yaw:0,scale:1};
 const make=flag=>{const day=new THREE.Texture(),night=new THREE.Texture(),p=createFarImpostorPrototype(source,day,metadata,[tree],{nativeModels:false,prelitAtlas:{day,night,rotations:8,views:8,resolution:128,...(flag?{premultipliedLinear:true}:{})}});return {p,day,night};};
 const old=make(false),pilot=make(true);
 for(const texture of [old.day,old.night])assert.equal(texture.premultiplyAlpha,true);
 for(const texture of [pilot.day,pilot.night]){assert.equal(texture.premultiplyAlpha,false);assert.equal(texture.colorSpace,THREE.SRGBColorSpace);assert.equal(texture.generateMipmaps,true);}
 assert.equal(pilot.p.impostors.material.fragmentShader,old.p.impostors.material.fragmentShader);
 assert.equal(pilot.p.impostors.material.vertexShader,old.p.impostors.material.vertexShader);
 old.p.dispose();pilot.p.dispose();source.geometry.dispose();source.material.dispose();
});
test('sRGB decode and unpremultiply recover partial-alpha light within RGBA8 quantization',()=>{
 for(const alpha of [64,128,192,255])for(const color of [32,51,153,204,255]){
  const source=new Uint8Array([color,color,color,alpha]),out=premultiplyPrelitLinear(source),recovered=decode(out[0]/255)/(alpha/255);
  assert.equal(out[3],alpha);assert.ok(Math.abs(recovered-decode(color/255))<.013);
 }
 assert.throws(()=>premultiplyPrelitLinear(new Uint8Array(3)));
});
