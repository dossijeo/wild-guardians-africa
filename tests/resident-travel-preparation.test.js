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
