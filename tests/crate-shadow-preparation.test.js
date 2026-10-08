import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareCrateShadow} from '../tools/experiments/prepare-crate-shadow.js';
function fixture(){
 const scene=new THREE.Scene(),source=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({side:THREE.DoubleSide}));source.name='Prop_FruitCrate_geometry_7';scene.add(source);
 const sun=new THREE.DirectionalLight();sun.castShadow=true;sun.shadow.map={native:true};scene.add(sun);let target=null;
 const renderer={shadowMap:{enabled:true,type:THREE.PCFSoftShadowMap},getViewport:v=>v.set(2,3,400,300),getScissor:v=>v.set(4,5,100,200),getScissorTest:()=>true,getRenderTarget:()=>target,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,setRenderTarget:t=>{target=t;},setViewport(){},setScissor(){},setScissorTest(){}};
 return {world:{scene,sun,renderer,loading:new AbortController()},source,restored:()=>assert.equal(target,null)};
}
test('compile borrows native geometry/target and restores target before await, retaining program owner until cleanup',async()=>{
 const {world,source,restored}=fixture();let finish,depth,released=0;
 world.renderer.compileAsync=(probe,camera,target)=>{assert.equal(world.renderer.getRenderTarget(),world.sun.shadow.map);assert.equal(probe.geometry,source.geometry);assert.equal(target.fog,null);assert.equal(target.environment,null);depth=probe.material;depth.addEventListener('dispose',()=>released++);assert.equal(depth.side,THREE.DoubleSide);return new Promise(resolve=>finish=resolve);};
 const pending=prepareCrateShadow(world,{bindings:()=>({initialized:1}),fence:async()=>restored()});restored();finish();const result=await pending;
 assert.equal(source.material.isMeshStandardMaterial,true);assert.equal(released,0);result.dispose();result.dispose();assert.equal(released,1);
});
test('unsupported deformation fails before shader compilation',async()=>{
 const {world,source}=fixture();source.geometry.morphAttributes.position=[new THREE.BufferAttribute(new Float32Array(3),3)];world.renderer.compileAsync=()=>assert.fail('unsupported compile');
 await assert.rejects(prepareCrateShadow(world),/Unsupported/);
});
test('compile failure restores render target and releases only owned material',async()=>{
 const {world,source,restored}=fixture();let disposed=0;source.geometry.dispose=()=>assert.fail('borrowed geometry disposal');
 world.renderer.compileAsync=probe=>{probe.material.addEventListener('dispose',()=>disposed++);throw Error('Compile failed');};
 await assert.rejects(prepareCrateShadow(world),/Compile failed/);restored();assert.equal(disposed,1);
});
test('cancellation during compile prevents reflection and fence and releases material',async()=>{
 const {world,restored}=fixture();let finish,disposed=0;
 world.renderer.compileAsync=probe=>{probe.material.addEventListener('dispose',()=>disposed++);return new Promise(resolve=>finish=resolve);};
 const pending=prepareCrateShadow(world,{bindings:()=>assert.fail('reflection after cancellation'),fence:()=>assert.fail('fence after cancellation')});
 world.loading.abort();finish();await assert.rejects(pending,/cancelled/);restored();assert.equal(disposed,1);
});
