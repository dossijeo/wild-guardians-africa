import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuWaterReflectionCapture} from '../src/rendering/webgpu-water-reflection-capture.js';

function fixture({failAt=0}={}){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),geometry=new THREE.PlaneGeometry(),opaque=new THREE.MeshBasicMaterial(),transparent=new THREE.MeshBasicMaterial({transparent:true});
 const ground=new THREE.Mesh(geometry,opaque),water=new THREE.Mesh(geometry,opaque),mist=new THREE.Mesh(geometry,transparent),mixed=new THREE.Mesh(geometry,[opaque,transparent]),hidden=new THREE.Mesh(geometry,opaque);
 water.userData.nativeFluid='chunk';hidden.visible=false;scene.add(ground,water,mist,mixed,hidden);
 const previous={},mrt={};let target=previous,currentMrt=mrt,calls=0;const records=[];
 const renderer={backend:{isWebGPUBackend:true},shadowMap:{autoUpdate:true,needsUpdate:true},getRenderTarget:()=>target,getActiveCubeFace:()=>2,getActiveMipmapLevel:()=>1,getMRT:()=>currentMrt,setMRT:value=>{currentMrt=value;},setRenderTarget(value,face,mip){target=value;if(value===previous)assert.deepEqual([face,mip],[2,1]);},render(object){calls++;if(failAt===calls)throw Error('draw failed');records.push({object,target,mrt:currentMrt,visible:[ground,water,mist,mixed,hidden].map(item=>item.visible),shadow:[this.shadowMap.autoUpdate,this.shadowMap.needsUpdate]});}};
 return {scene,camera,renderer,ground,water,mist,mixed,hidden,records,previous,mrt,get target(){return target;},get currentMrt(){return currentMrt;},dispose(){geometry.dispose();opaque.dispose();transparent.dispose();}};
}

test('capture excludes water and transparent objects and restores all state',()=>{
 const f=fixture(),capture=createWebGpuWaterReflectionCapture(5,3);try{
  capture.render(f.renderer,f.scene,f.camera);
  assert.equal(f.records.length,4);assert.equal(f.records[0].object,f.scene);assert.deepEqual(f.records[0].visible,[true,false,false,false,false]);assert.deepEqual(f.records[0].shadow,[false,false]);assert.equal(f.records[0].target.texture,capture.color);assert.equal(f.records[0].target.depthTexture,capture.depth);assert.deepEqual(f.records.slice(1).map(record=>record.target.texture),capture.levels);assert.ok(f.records.every(record=>record.mrt===null));
  assert.deepEqual([f.ground.visible,f.water.visible,f.mist.visible,f.mixed.visible,f.hidden.visible],[true,true,true,true,false]);assert.equal(f.target,f.previous);assert.equal(f.currentMrt,f.mrt);assert.deepEqual(f.renderer.shadowMap,{autoUpdate:true,needsUpdate:true});
 }finally{capture.dispose();f.dispose();}assert.throws(()=>capture.render(f.renderer,f.scene,f.camera),/disposed/);
});

test('capture restores visibility and renderer state on scene or reduction failure',()=>{
 for(const failAt of [1,2]){const f=fixture({failAt}),capture=createWebGpuWaterReflectionCapture(2,2);try{assert.throws(()=>capture.render(f.renderer,f.scene,f.camera),/draw failed/);assert.deepEqual([f.ground.visible,f.water.visible,f.mist.visible,f.mixed.visible,f.hidden.visible],[true,true,true,true,false]);assert.equal(f.target,f.previous);assert.equal(f.currentMrt,f.mrt);assert.deepEqual(f.renderer.shadowMap,{autoUpdate:true,needsUpdate:true});}finally{capture.dispose();f.dispose();}}
});
