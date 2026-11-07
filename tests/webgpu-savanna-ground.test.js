import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuSavannaGround,grassGroundParameters,grassGroundBiome} from '../src/rendering/webgpu-savanna-ground.js';
import {savannaGroundRecipe} from '../src/rendering/webgpu-material-graph-catalog.js';

const tile={base:'base',normal:'normal',arh:'arh',scale:.12,normalBoost:1.05,relief:.22};
const fetchImpl=async()=>({ok:true,json:async()=>({savanna:tile})});

test('invalid light or incomplete environment fails before downloading assets',async()=>{
 let calls=0;const fetchSpy=async()=>{calls++;return fetchImpl();},day={isTextureNode:true},dark={isTextureNode:true},blend={isNode:true};
 await assert.rejects(createWebGpuSavannaGround({fetchImpl:fetchSpy,light:{}}),/options/);
 await assert.rejects(createWebGpuSavannaGround({fetchImpl:fetchSpy,environment:{day,dark,blend}}),/options/);
 assert.equal(calls,0);
});

test('grand river uses its authored atlas and river coverage and tint uniforms',async()=>{
 assert.equal(grassGroundBiome('gran-rio'),'grand_river');assert.equal(grassGroundBiome('sabana'),'savanna');assert.equal(grassGroundBiome('manglares'),null);
 const requests=[],river={...tile,base:'river-base',normal:'river-normal',arh:'river-arh'},provider=await createWebGpuSavannaGround({biome:'grand_river',fetchImpl:async()=>({ok:true,json:async()=>({savanna:tile,grand_river:river})}),imageLoader:async url=>{requests.push(url);return {close(){}};}}),material=provider.create({cx:0,cz:0});
 const geometry=new THREE.PlaneGeometry(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 try{assert.deepEqual(requests,['river-base','river-normal','river-arh']);assert.deepEqual(grassGroundParameters('grand_river'),{tint:[1.14,1.18,1.05],coverageFloor:.70});assert.equal(material._wgGroundMask.image.width,1);assert.deepEqual(Array.from(material._wgGroundMask.image.data),[128,128,166,0]);geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(.5),3));const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.match(builder.fragmentShader,/textureSampleGrad/);}finally{geometry.dispose();material.dispose();provider.dispose();}
 await assert.rejects(createWebGpuSavannaGround({biome:'unknown',fetchImpl}),/options/);
});

test('compatible grass tile parameters preserve the material recipe and generated WGSL',async()=>{
 const textures=[new THREE.Texture(),new THREE.Texture(),new THREE.Texture()],args={textures,scale:.155,normalBoost:1.2,relief:.075};
 assert.equal(savannaGroundRecipe(args).key,savannaGroundRecipe({...args,normalBoost:1.15,scale:.12,relief:.2}).key);
 assert.notEqual(savannaGroundRecipe(args).key,savannaGroundRecipe({...args,textures:[new THREE.Texture(),textures[1],textures[2]]}).key);
 const providerOptions={fetchImpl:async()=>({ok:true,json:async()=>({savanna:{...tile,normalBoost:1.2},grand_river:{...tile,base:'river-base',normalBoost:1.15},canyons:{...tile,base:'canyon-base',normalBoost:1.35}})}),imageLoader:async()=>({close(){}})},providers=await Promise.all([createWebGpuSavannaGround(providerOptions),createWebGpuSavannaGround({...providerOptions,biome:'grand_river'}),createWebGpuSavannaGround({...providerOptions,biome:'canyons'})]),materials=providers.map(p=>p.create({cx:0,cz:0})),geometry=new THREE.PlaneGeometry(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(.5),3));
 try{const shaders=materials.map(material=>{const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();return {vertex:builder.vertexShader,fragment:builder.fragmentShader};});assert.deepEqual(shaders[0],shaders[1]);assert.deepEqual(shaders[0],shaders[2]);}finally{geometry.dispose();for(const material of materials)material.dispose();for(const provider of providers)provider.dispose();for(const texture of textures)texture.dispose();}
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

test('canyon ground uses its real atlas, preserves masks and generates the shared WGSL',async()=>{
 assert.equal(grassGroundBiome('gran-canon'),'canyons');
 const requests=[],images=[],canyon={...tile,base:'canyon-base',normal:'canyon-normal',arh:'canyon-arh',scale:.2,normalBoost:1.35,relief:.1},provider=await createWebGpuSavannaGround({biome:'canyons',fetchImpl:async()=>({ok:true,json:async()=>({canyons:canyon})}),imageLoader:async url=>{requests.push(url);const bitmap={closed:false,close(){this.closed=true;}};images.push(bitmap);return bitmap;}}),mask=new Uint8Array(35*35*4),material=provider.create({cx:2,cz:-3,groundMask:mask}),geometry=new THREE.PlaneGeometry(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 try{assert.deepEqual(requests,['canyon-base','canyon-normal','canyon-arh']);assert.deepEqual(grassGroundParameters('canyons'),{tint:[1.0325,.985,.95],coverageFloor:1});assert.equal(material._wgGroundMask.image.data,mask);assert.deepEqual(material._wgGroundMin.toArray(),[72,-168]);geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(.5),3));const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.match(builder.fragmentShader,/textureSampleGrad/);assert.match(builder.fragmentShader,/5\.6/);assert.match(builder.fragmentShader,/0\.74/);}finally{material.dispose();geometry.dispose();provider.dispose();}assert.ok(images.every(image=>image.closed));
});
