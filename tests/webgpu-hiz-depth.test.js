import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshBasicNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {texture,uniform} from 'three/tsl';
import {createWebGpuHiZHierarchy,hiZLevelSizes,hiZReductionNode} from '../src/rendering/webgpu-hiz-depth.js';

test('depth hierarchy covers odd dimensions and respects its level limit',()=>{
 assert.deepEqual(hiZLevelSizes(5,3),[{width:3,height:2},{width:2,height:1},{width:1,height:1}]);assert.deepEqual(hiZLevelSizes(1,1),[]);assert.deepEqual(hiZLevelSizes(9,1,{maxLevels:2}),[{width:5,height:1},{width:3,height:1}]);assert.throws(()=>hiZLevelSizes(0,1),/dimensions/);
 const depth=new THREE.DepthTexture(5,3);assert.throws(()=>createWebGpuHiZHierarchy(depth,4,3),/matching/);depth.dispose();
});

test('hierarchy submits each reduction in order and restores the render target',()=>{
 const depth=new THREE.DepthTexture(5,3),hierarchy=createWebGpuHiZHierarchy(depth,5,3),previous={},mrt={},draws=[];let target=previous,currentMrt=mrt;const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>target,getActiveCubeFace:()=>2,getActiveMipmapLevel:()=>1,getMRT:()=>currentMrt,setMRT:value=>{currentMrt=value;},setRenderTarget(value,face,mip){target=value;if(value===previous)assert.deepEqual([face,mip],[2,1]);},render(quad){draws.push({texture:target.texture,material:quad.material,mrt:currentMrt});}};
 try{hierarchy.render(renderer);assert.deepEqual(draws.map(draw=>draw.texture),hierarchy.levels);assert.ok(draws.every(draw=>draw.mrt===null));assert.equal(target,previous);assert.equal(currentMrt,mrt);assert.deepEqual(hierarchy.levels.map(level=>[level.image.width,level.image.height]),[[3,2],[2,1],[1,1]]);}finally{hierarchy.dispose();depth.dispose();}assert.throws(()=>hierarchy.render(renderer),/disposed/);
});

test('hierarchy restores renderer state if a reduction fails',()=>{
 const depth=new THREE.DepthTexture(2,2),hierarchy=createWebGpuHiZHierarchy(depth,2,2),previous={},mrt={};let target=previous,currentMrt=mrt;const renderer={backend:{isWebGPUBackend:true},getRenderTarget:()=>target,getMRT:()=>currentMrt,setMRT:value=>{currentMrt=value;},setRenderTarget:value=>{target=value;},render(){throw Error('draw failed');}};try{assert.throws(()=>hierarchy.render(renderer),/draw failed/);assert.equal(target,previous);assert.equal(currentMrt,mrt);}finally{hierarchy.dispose();depth.dispose();}
});

test('depth and subsequent hierarchy reductions generate WebGPU texture loads',()=>{
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;renderer.backend.renderer=renderer;const depth=new THREE.DepthTexture(5,3),level=new THREE.DataTexture(new Float32Array(15),5,3,THREE.RedFormat,THREE.FloatType),size=uniform(new THREE.Vector2(5,3));
 try{for(const [source,depthSource] of [[depth,true],[level,false]]){const material=new MeshBasicNodeMaterial({toneMapped:false});material.outputNode=hiZReductionNode(texture(source),size,{depthSource});const geometry=new THREE.PlaneGeometry(),builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.match(builder.fragmentShader,/textureLoad/);assert.match(builder.fragmentShader,/min\(/);assert.match(builder.fragmentShader,/clamp\(/);assert.doesNotMatch(builder.fragmentShader,/\* vec3<f32>\( vec2<f32>\( clamp/);geometry.dispose();material.dispose();}}finally{depth.dispose();level.dispose();}
});

test('hierarchy marks readiness only through the atomic group admission',async()=>{
 const depth=new THREE.DepthTexture(5,3),hierarchy=createWebGpuHiZHierarchy(depth,5,3),requests=[];let finish,calls=0;const admission={prepare(){throw Error('single-pass admission used');},deferRelease(_object,release){release();},prepareManyAndPublish(parts,publish){calls++;requests.push(...parts);return new Promise((resolve,reject)=>{finish=()=>{try{publish();resolve();}catch(error){reject(error);}};});}};
 try{const pending=hierarchy.prepare(admission);assert.equal(requests.length,3);await assert.rejects(hierarchy.prepare(admission),/pending/);assert.ok(requests.every(item=>item.options.target.texture.isTexture&&item.options.shadowPass===false));finish();await pending;await hierarchy.prepare(admission);assert.equal(calls,1);}finally{hierarchy.dispose();depth.dispose();}
});
