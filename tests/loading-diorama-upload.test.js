import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LoadingDiorama} from '../src/rendering/loading-diorama.js';
function fixture(){
 const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),meshes=Array.from({length:9},(_,i)=>{const mesh=new THREE.InstancedMesh(geometry,material,2);mesh.name='maize-stage-'+i;mesh.count=1;mesh.visible=true;return mesh;});scene.add(...meshes);
 const hidden=new THREE.Mesh(geometry,material);hidden.visible=false;scene.add(hidden);
 let viewport=new THREE.Vector4(1,2,300,200),scissor=new THREE.Vector4(3,4,100,80),test=false,clock=0;const originalTarget={},calls=[];
 const renderer={autoClear:true,target:originalTarget,shadowMap:{enabled:false,autoUpdate:true,needsUpdate:false},getContext:()=>({isContextLost:()=>false}),getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>test,setViewport(...v){viewport=v[0]?.isVector4?v[0].clone():new THREE.Vector4(...v);},setScissor(...v){scissor=v[0]?.isVector4?v[0].clone():new THREE.Vector4(...v);},setScissorTest:v=>{test=v;},getRenderTarget(){return this.target;},setRenderTarget(v){this.target=v;},render(s){assert.equal(this.target,null);assert.deepEqual(viewport.toArray(),[0,0,0,0]);assert.equal(this.shadowMap.enabled,false);const draw=[];s.traverseVisible(o=>{if(o.isMesh)draw.push(o.name);});calls.push(draw);clock+=8;}};
 const world={renderer,disposed:false,onLoadingSpan:()=>{}},owner=Object.assign(Object.create(LoadingDiorama.prototype),{world,scene,camera:{},abort:new AbortController(),disposed:false});
 const restored=()=>{assert.strictEqual(renderer.target,originalTarget);assert.deepEqual(viewport.toArray(),[1,2,300,200]);assert.deepEqual(scissor.toArray(),[3,4,100,80]);assert.equal(test,false);assert.equal(renderer.autoClear,true);assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(renderer.shadowMap.needsUpdate,false);assert.ok(meshes.every(m=>m.visible&&m.count===1));assert.equal(hidden.visible,false);};
 return {owner,meshes,geometry,material,calls,restored,now:()=>clock,close(){geometry.dispose();material.dispose();}};
}
test('diorama upload splits all five stages/four bridges, restores renderer and visibility before each real frame, then submits the complete scene',async()=>{
 const f=fixture();let frames=0;const snapshots=f.meshes.map(m=>Array.from(m.instanceMatrix.array));
 await f.owner.uploadMaizeSoilBatched({now:f.now,nextFrame:async()=>{frames++;f.restored();}});
 assert.equal(frames,9);assert.deepEqual(f.calls.slice(0,9),f.meshes.map(m=>[m.name]));assert.deepEqual(f.calls.at(-1),f.meshes.map(m=>m.name));f.restored();assert.deepEqual(f.meshes.map(m=>Array.from(m.instanceMatrix.array)),snapshots);f.close();
});
test('cancel while batched diorama RAF is suspended restores all borrowed state and never submits a later group or disposes shared crop sources',async()=>{
 const f=fixture();let sourceDisposes=0;f.geometry.addEventListener('dispose',()=>sourceDisposes++);f.material.addEventListener('dispose',()=>sourceDisposes++);
 const pending=f.owner.uploadMaizeSoilBatched({now:f.now,nextFrame:()=>new Promise(()=>{})});f.restored();f.owner.abort.abort();await assert.rejects(pending,/cancelled/);f.restored();assert.equal(f.calls.length,1);assert.equal(sourceDisposes,0);f.close();
});
