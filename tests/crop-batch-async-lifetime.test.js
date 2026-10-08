import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCropBatchAsync} from '../src/rendering/crop-batch.js';
function fixture(){
 const source=new THREE.Group(),scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),models=[],pairs=[];
 for(let crop=0;crop<8;crop++)for(let stage=1;stage<=5;stage++){const mesh=new THREE.Mesh(geometry,material);mesh.userData={cropIndex:crop,stage,crop:'fixture',height:stage,foliageRadius:.5};source.add(mesh);models.push({vertices:geometry.attributes.position.count,faces:geometry.index.count/3,faceLabels:Array(geometry.index.count/3).fill(0),regions:[{root:[0,0,0],direction:[0,1,0]}]});if(stage<5)pairs.push({a:crop*5+stage-1,b:crop*5+stage,a2b:[0],b2a:[0]});}
 let sourceDisposes=0;geometry.addEventListener('dispose',()=>sourceDisposes++);material.addEventListener('dispose',()=>sourceDisposes++);
 return {scene,renderer:{capabilities:{getMaxAnisotropy:()=>1}},gltf:{scene:source},data:{models,pairs},disposals:()=>sourceDisposes,close:()=>{geometry.dispose();material.dispose();}};
}

test('cancelled crop preparation frees partially built objects while its frame is suspended',async()=>{
 const f=fixture(),owner=new AbortController();let frames=0,rejectFrame;const pending=createCropBatchAsync(f.scene,f.renderer,f.gltf,f.data,18,{species:['maiz'],budgetMs:0,signal:owner.signal,nextFrame:()=>{frames++;return new Promise((resolve,reject)=>{rejectFrame=reject;});}});
 assert.ok(f.scene.children.length>0);owner.abort();await assert.rejects(pending,/cancelled/);assert.equal(frames,1);assert.equal(f.scene.children.length,0);assert.equal(f.disposals(),0);rejectFrame(Error('late frame'));await new Promise(resolve=>setImmediate(resolve));f.close();
});

test('crop preparation deadline releases a partial batch with no arriving frame',async()=>{
 const f=fixture();let clock=0;const pending=createCropBatchAsync(f.scene,f.renderer,f.gltf,f.data,18,{species:['maiz'],budgetMs:0,now:()=>clock,timeout:1,pollIntervalMs:2,nextFrame:()=>new Promise(()=>{})});clock=2;await assert.rejects(pending,/timed out/);assert.equal(f.scene.children.length,0);assert.equal(f.disposals(),0);f.close();
});

test('completed cooperative preparation retains all maize stages and bridges',async()=>{
 const f=fixture();let frames=0;const batch=await createCropBatchAsync(f.scene,f.renderer,f.gltf,f.data,18,{species:['maiz'],budgetMs:0,nextFrame:async()=>{frames++;}});assert.ok(frames>1);assert.equal(f.scene.children.length,9);batch.dispose();assert.equal(f.scene.children.length,0);assert.equal(f.disposals(),0);f.close();
});
