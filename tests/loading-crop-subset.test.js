import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCropBatch,createCropBatchAsync} from '../src/rendering/crop-batch.js';
function fixture(){
 const scene=new THREE.Group(),models=[],pairs=[];
 for(let crop=0;crop<8;crop++)for(let stage=1;stage<=5;stage++){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.1,0,1,.1,0,0,2,0],3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1],2));geometry.setIndex([0,1,2]);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());mesh.userData={cropIndex:crop,stage,height:2+stage*.1,foliageRadius:1,crop:String(crop)};scene.add(mesh);
  models.push({vertices:3,faces:1,faceLabels:[0],regions:[{root:[0,.1,0],direction:[0,1,0]}]});
  if(stage<5)pairs.push({a:crop*5+stage-1,b:crop*5+stage,a2b:[0],b2a:[0]});
 }
 return {gltf:{scene},bridgeData:{models,pairs},renderer:{capabilities:{getMaxAnisotropy:()=>1}}};
}
test('loading-only maize batch retains native five stages/four bridges with bounded instances and no shadows',()=>{
 const {gltf,bridgeData,renderer}=fixture(),scene=new THREE.Scene(),batch=createCropBatch(scene,renderer,gltf,bridgeData,18,{species:['maiz'],shadows:false});
 assert.equal(scene.children.length,9);assert.ok(scene.children.every(m=>m.instanceMatrix.count===18&&!m.castShadow&&!m.receiveShadow));
 for(const growth of [0,3,12,45,90,180,1000])batch.update([{id:'load1',species:'maiz',growth,x:0,z:0}],1,()=>0);
 assert.ok(scene.children.some(m=>m.visible));batch.dispose();assert.equal(scene.children.length,0);assert.equal(gltf.scene.children.length,40);
});
test('existing batch default still prepares all species and preserves shadow behavior',()=>{const {gltf,bridgeData,renderer}=fixture(),scene=new THREE.Scene(),batch=createCropBatch(scene,renderer,gltf,bridgeData);assert.equal(scene.children.length,72);assert.ok(scene.children.every(m=>m.castShadow&&m.receiveShadow));batch.dispose();});
test('cooperative construction preserves exact stage and morph attributes',async()=>{
 const {gltf,bridgeData,renderer}=fixture(),a=new THREE.Scene(),b=new THREE.Scene(),sync=createCropBatch(a,renderer,gltf,bridgeData,18,{species:['maiz']}),asyncBatch=await createCropBatchAsync(b,renderer,gltf,bridgeData,18,{species:['maiz'],budgetMs:0,nextFrame:()=>Promise.resolve()});
 assert.equal(a.children.length,b.children.length);for(let i=0;i<a.children.length;i++)for(const name of Object.keys(a.children[i].geometry.attributes))assert.deepEqual(b.children[i].geometry.attributes[name].array,a.children[i].geometry.attributes[name].array);
 sync.dispose();asyncBatch.dispose();
});
test('cancellation during cooperative preparation releases partially built local resources',async()=>{
 const {gltf,bridgeData,renderer}=fixture(),scene=new THREE.Scene();let frames=0;
 await assert.rejects(createCropBatchAsync(scene,renderer,gltf,bridgeData,18,{species:['maiz'],budgetMs:0,nextFrame:async()=>{frames++;},cancelled:()=>frames>=2}),/cancelled/);assert.equal(scene.children.length,0);assert.equal(gltf.scene.children.length,40);
});
