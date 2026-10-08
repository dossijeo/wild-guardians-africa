import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareResidentTravelVariants} from '../tools/experiments/prepare-resident-travel-variants.js';

function fixture(){
 const scene=new THREE.Scene(),parent=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());parent.visible=false;mesh.visible=false;mesh.layers.set(31);parent.add(mesh);scene.add(parent);
 const world={scene,camera:new THREE.PerspectiveCamera(),objects:new Map(),loading:new AbortController(),renderer:{info:{programs:[]}},releaseNativeShadow:{cache:{invalidate(){}}}};
 const restored=()=>{assert.equal(parent.visible,false);assert.equal(mesh.visible,false);assert.equal(mesh.frustumCulled,true);assert.equal(mesh.layers.mask,2**31);};
 const visible=()=>{assert.equal(parent.visible,true);assert.equal(mesh.visible,true);assert.equal(mesh.frustumCulled,false);assert.equal(mesh.layers.mask,1);};
 return {world,restored,visible};
}
test('preparation restores visibility before waiting and before the GPU fence',async()=>{
 const {world,restored,visible}=fixture();let finish,draws=0;world.renderer.compileAsync=()=>{visible();return new Promise(resolve=>{finish=resolve;});};
 const pending=prepareResidentTravelVariants(world,{bindings:()=>{restored();return {initialized:1};},draw:()=>{visible();draws++;},fence:async()=>restored()});
 await Promise.resolve();restored();finish();const result=await pending;assert.equal(draws,1);assert.equal(result.bindings.initialized,1);restored();
});
test('failed native draw restores every flag and propagates the shader error',async()=>{
 const {world,restored}=fixture();world.renderer.compileAsync=async()=>{};
 await assert.rejects(prepareResidentTravelVariants(world,{bindings:()=>({}),draw:()=>{throw Error('Shader failed');}}),/Shader failed/);restored();
});
test('cancellation during compilation prevents drawing and fencing',async()=>{
 const {world,restored}=fixture();world.renderer.compileAsync=async()=>{world.loading.abort();};
 await assert.rejects(prepareResidentTravelVariants(world,{draw:()=>assert.fail('draw after cancellation'),fence:()=>assert.fail('fence after cancellation')}),/cancelled/);restored();
});

test('program-only preparation preserves hidden geometry and native lighting without an upload draw',async()=>{
 const {world,restored}=fixture();let compileCalls=0,fences=0;
 world.renderer.compileAsync=async()=>{restored();compileCalls++;};
 world.releaseNativeShadow.cache.invalidate=()=>assert.fail('program-only mode must not invalidate shadows');
 const result=await prepareResidentTravelVariants(world,{mode:'programs',bindings:()=>{restored();return {initialized:2,unsupported:0};},draw:()=>assert.fail('hidden geometry upload'),fence:async()=>{restored();fences++;}});
 assert.equal(compileCalls,1);assert.equal(fences,1);assert.equal(result.mode,'programs');assert.equal(result.bindings.initialized,2);restored();
});

test('program-only reflection failure remains an error and never reaches the fence',async()=>{
 const {world,restored}=fixture();world.renderer.compileAsync=async()=>restored();
 const failure=Error('Shader diagnostic failure');
 await assert.rejects(prepareResidentTravelVariants(world,{mode:'programs',bindings:()=>{throw failure;},draw:()=>assert.fail('draw'),fence:()=>assert.fail('fence')}),error=>error===failure);restored();
});

test('invalid preparation mode rejects before touching the world',async()=>{
 await assert.rejects(prepareResidentTravelVariants(null,{mode:'pretend-ready'}),/Invalid resident preparation mode/);
});
