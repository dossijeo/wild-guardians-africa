import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuSavannaGround} from '../src/rendering/webgpu-savanna-ground.js';

const tile={base:'base',normal:'normal',arh:'arh',scale:.12,normalBoost:1.05,relief:.22};
const fetchImpl=async()=>({ok:true,json:async()=>({savanna:tile})});

test('invalid light or incomplete environment fails before downloading assets',async()=>{
 let calls=0;const fetchSpy=async()=>{calls++;return fetchImpl();},day={isTextureNode:true},dark={isTextureNode:true},blend={isNode:true};
 await assert.rejects(createWebGpuSavannaGround({fetchImpl:fetchSpy,light:{}}),/options/);
 await assert.rejects(createWebGpuSavannaGround({fetchImpl:fetchSpy,environment:{day,dark,blend}}),/options/);
 assert.equal(calls,0);
});

test('savanna chunks share their shader graph and own independent confirmed masks',async()=>{
 const images=[],provider=await createWebGpuSavannaGround({fetchImpl,imageLoader:async()=>{const bitmap={close(){this.closed=true;}};images.push(bitmap);return bitmap;}});
 const first=provider.create({cx:0,cz:0,groundMask:new Uint8Array(35*35*4)}),second=provider.create({cx:1,cz:-1,groundMask:new Uint8Array(35*35*4)});
 try{assert.equal(first.outputNode,second.outputNode);assert.notEqual(first._wgGroundMask,second._wgGroundMask);assert.deepEqual(second._wgGroundMin.toArray(),[24,-72]);assert.equal(first._wgGroundMask.image.width,35);let disposed=0;first._wgGroundMask.addEventListener('dispose',()=>disposed++);first.dispose();assert.equal(disposed,1);assert.equal(images.some(i=>i.closed),false);assert.throws(()=>provider.create({cx:0,cz:0,groundMask:new Uint8Array(2)}),/mask/);}finally{second.dispose();provider.dispose();}assert.ok(images.every(i=>i.closed));
});

test('savanna material generates WGSL including atlas gradients and parallax',async()=>{
 const provider=await createWebGpuSavannaGround({fetchImpl,imageLoader:async()=>({close(){}})}),material=provider.create({cx:0,cz:0,groundMask:new Uint8Array(35*35*4)}),geometry=new THREE.PlaneGeometry(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 try{geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(.5),3));const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.equal(material.vertexColors,true);assert.match(builder.vertexShader,/color/i);assert.match(builder.fragmentShader,/textureSampleGrad/);assert.match(builder.fragmentShader,/loop|for\s*\(/);}finally{material.dispose();geometry.dispose();provider.dispose();}
});

test('savanna ground waits for submitted atlas uploads and releases after cancellation',async()=>{
 const controller=new AbortController(),images=[],waiters=[],renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>waiters.push(resolve))}}},initTexture(){}},pending=createWebGpuSavannaGround({renderer,signal:controller.signal,fetchImpl,imageLoader:async()=>{const image={closed:false,close(){this.closed=true;}};images.push(image);return image;}});
 for(let i=0;i<10&&!waiters.length;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(waiters.length,1);const rejected=assert.rejects(pending,{name:'AbortError'});controller.abort();await rejected;assert.equal(images[0].closed,false);waiters[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(images[0].closed,true);
});
